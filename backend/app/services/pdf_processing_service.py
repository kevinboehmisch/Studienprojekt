import os
import io
import base64
import tempfile
import uuid
import re
from typing import Dict, Any, Optional, List
from PIL import Image, UnidentifiedImageError
import fitz
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text  # Für die Test-DB-Abfrage

from marker.converters.pdf import PdfConverter
from marker.config.parser import ConfigParser
from marker.output import text_from_rendered
from app.core.config import TEMP_DIR, EXTRACTED_IMAGES_DIR
from app.schemas.processing_schemas import PdfProcessingResult, ImageInfo, TextChunk

# Importiere CRUD-Funktionen (Repository-Pattern)
from app.db.crud import crud_document, crud_chunk
from .embedding_service import generate_embeddings
from datetime import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_globally_then_assign_pages(
    full_markdown_text: str,
    toc: List[Dict[str, Any]],
    max_chunk_chars: int = 1500,
    chunk_overlap_ratio: float = 0.1,
) -> List[Dict[str, Any]]:
    # Diese Funktion teilt Markdown global und versucht, Seiten zuzuordnen.
    print(
        f"LOG_GLOBAL_CHUNK: Starte globales Chunking. Textlänge: {len(full_markdown_text)}"
    )
    final_chunks_output: List[Dict[str, Any]] = []
    page_indicators = []
    page_marker_pattern = re.compile(
        r'(<span id="page-(\d+)-[^"]*"></span>)|(!\[.*?\]\([^_]*_page_(\d+)_.*?\))',
        re.IGNORECASE,
    )
    for match in page_marker_pattern.finditer(full_markdown_text):
        page_num_str = match.group(2) or match.group(4)
        if page_num_str:
            try:
                page_indicators.append(
                    {
                        "pos": match.start(),
                        "page_0_idx": int(page_num_str),
                        "type": "tag",
                    }
                )
            except ValueError:
                pass
    if toc and isinstance(toc, list):
        for item in toc:
            if isinstance(item, dict) and "title" in item and "page_id" in item:
                title = item["title"].strip()
                try:
                    page_id = int(item["page_id"])
                    for pattern_str in [
                        re.escape(title),
                        r"^#+\s*" + re.escape(title) + r"\s*$",
                    ]:
                        for m in re.finditer(
                            pattern_str,
                            full_markdown_text,
                            re.MULTILINE | re.IGNORECASE,
                        ):
                            page_indicators.append(
                                {"pos": m.start(), "page_0_idx": page_id, "type": "toc"}
                            )
                            break
                        else:
                            continue
                            break
                except:
                    continue
    page_indicators.sort(key=lambda x: x["pos"])
    unique_page_indicators = []
    if page_indicators:
        last_pos = -1
        last_page = -1
        for ind in page_indicators:
            if ind["pos"] > last_pos:
                if ind["page_0_idx"] != last_page:
                    unique_page_indicators.append(ind)
                    last_page = ind["page_0_idx"]
                last_pos = ind["pos"]
            elif (
                ind["pos"] == last_pos
                and ind["page_0_idx"] < unique_page_indicators[-1]["page_0_idx"]
            ):
                unique_page_indicators[-1] = ind
                last_page = ind["page_0_idx"]
    print(
        f"LOG_GLOBAL_CHUNK: {len(unique_page_indicators)} eindeutige Seiten-Indikatoren: {unique_page_indicators[:5]}"
    )
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=max_chunk_chars,
        chunk_overlap=int(max_chunk_chars * chunk_overlap_ratio),
        length_function=len,
        separators=[
            "\n\n\n",
            "\n\n",
            "\n",
            ". ",
            "! ",
            "? ",
            "; ",
            ", ",
            "\u200b",
            " ",
            "",
        ],
        keep_separator=True,
    )
    raw_md_string_chunks = text_splitter.split_text(full_markdown_text)
    current_char_offset_in_md = 0
    for chunk_content_str in raw_md_string_chunks:
        assigned_page_1_idx = 1
        if unique_page_indicators:
            assigned_page_1_idx = unique_page_indicators[0]["page_0_idx"] + 1
            for marker in unique_page_indicators:
                if marker["pos"] <= current_char_offset_in_md:
                    assigned_page_1_idx = marker["page_0_idx"] + 1
                else:
                    break
        stripped_content = chunk_content_str.strip()
        if stripped_content:
            final_chunks_output.append(
                {
                    "content": stripped_content,
                    "page_number": assigned_page_1_idx,
                    "char_count": len(stripped_content),
                }
            )
        current_char_offset_in_md += len(chunk_content_str)
    if not final_chunks_output and full_markdown_text.strip():
        final_chunks_output.append(
            {
                "content": full_markdown_text.strip(),
                "page_number": 1,
                "char_count": len(full_markdown_text.strip()),
            }
        )
    print(
        f"LOG_GLOBAL_CHUNK: Globale Chunk-Seitenzuordnung abgeschlossen. {len(final_chunks_output)} Chunks."
    )
    return final_chunks_output


class PdfProcessingService:
    def __init__(self, artifact_dict: Dict[str, Any], config: Dict[str, Any]):
        # Stellt sicher, dass Marker für Markdown-Output konfiguriert ist.
        effective_config = config.copy()
        effective_config["output_format"] = "markdown"
        parser = ConfigParser(effective_config)
        self.converter = PdfConverter(
            artifact_dict=artifact_dict,
            config=parser.generate_config_dict(),
            renderer=parser.get_renderer(),
        )
        print(
            f"LOG_INIT: PdfProcessingService initialisiert. Converter Config: {self.converter.config}, Renderer: {type(self.converter.renderer)}"
        )

    def _save_image_and_get_info(
        self,
        img_data_value: Any,
        original_img_filename_from_marker: str,
        doc_id_folder_name: str,
    ) -> Optional[ImageInfo]:
        # Speichert Bilddaten und gibt Metadaten zurück.
        actual_img_basename = os.path.basename(original_img_filename_from_marker)
        doc_specific_image_dir = os.path.join(EXTRACTED_IMAGES_DIR, doc_id_folder_name)
        try:
            os.makedirs(doc_specific_image_dir, exist_ok=True)
        except OSError:
            return None
        image_save_path = os.path.join(doc_specific_image_dir, actual_img_basename)
        pil_img = None
        try:
            if isinstance(img_data_value, Image.Image):
                pil_img = img_data_value
                img_data_value.save(image_save_path)
            elif isinstance(img_data_value, bytes):
                img = Image.open(io.BytesIO(img_data_value))
                pil_img = img
                img.save(image_save_path)
            elif isinstance(img_data_value, str):
                data = (
                    img_data_value.split(",", 1)[1]
                    if "," in img_data_value
                    else img_data_value
                )
                pad = len(data) % 4
                data += "=" * (4 - pad) if pad else ""
                img = Image.open(io.BytesIO(base64.b64decode(data)))
                pil_img = img
                img.save(image_save_path)
            else:
                return None
            ct = (
                Image.MIME.get(pil_img.format.upper())
                if pil_img and pil_img.format
                else None
            )
            return ImageInfo(
                filename=actual_img_basename,
                content_type=ct,
                file_path=os.path.join(doc_id_folder_name, actual_img_basename),
            )
        except Exception as e:
            print(f"  ERROR_SAVE_IMG: Bild '{actual_img_basename}': {e}")
        return None

    async def process_pdf_data_and_store(
        self, db: AsyncSession, pdf_bytes: bytes, original_doc_filename: str
    ) -> PdfProcessingResult:
        # Hauptmethode: Verarbeitet PDF, extrahiert, speichert in DB, gibt Pydantic-Modell zurück.
        doc_id_folder_name = f"{''.join(c if c.isalnum() else '_' for c in os.path.splitext(original_doc_filename)[0])}_{uuid.uuid4().hex[:6]}"
        tmp_fd, temp_pdf_path = tempfile.mkstemp(
            suffix=".pdf", dir=TEMP_DIR, prefix=f"{original_doc_filename}_"
        )
        os.close(tmp_fd)

        images_info_for_api: List[ImageInfo] = []
        pydantic_text_chunks_for_api: List[TextChunk] = []
        api_response_metadata: Dict[str, Any] = {
            "source_document": original_doc_filename,
            "processed_document_id": doc_id_folder_name,
        }
        debug_msg: str = ""
        md_text_len = 0
        db_document: Optional[Document] = None

        print(f"LOG_SERVICE_DB_TEST: Versuche Test-DB-Abfrage VOR Marker.")
        try:
            await db.execute(text("SELECT 1"))
            print(f"LOG_SERVICE_DB_TEST: Test-DB-Abfrage OK.")
        except Exception as e_db_test:
            print(
                f"ERROR_SERVICE_DB_TEST: Test-DB-Abfrage VOR Marker fehlgeschlagen: {e_db_test}"
            )

        try:
            pdf_title, pdf_author, pdf_year = None, None, None
            try:
                fitz_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                fitz_meta = fitz_doc.metadata
                fitz_doc.close()
                print(f"DEBUG_PYMUPDF_META für '{original_doc_filename}': {fitz_meta}")
                if fitz_meta:
                    pdf_title = fitz_meta.get("title")
                    pdf_author = fitz_meta.get("author")
                    creation_date_str = fitz_meta.get("creationDate")
                    mod_date_str = fitz_meta.get("modDate")
                    print(
                        f"  DEBUG_PYMUPDF_META: creationDate='{creation_date_str}', modDate='{mod_date_str}'"
                    )
                    date_to_parse = creation_date_str or mod_date_str
                    if (
                        date_to_parse
                        and isinstance(date_to_parse, str)
                        and date_to_parse.startswith("D:")
                    ):
                        year_str = date_to_parse[2:6]
                        try:
                            pdf_year = int(year_str)
                            print(
                                f"  LOG_PYMUPDF_META: Jahr '{pdf_year}' aus '{date_to_parse}' extrahiert."
                            )
                        except ValueError:
                            print(
                                f"  WARN_PYMUPDF_META: Konnte Jahr nicht aus Datumsteil '{year_str}' von '{date_to_parse}' parsen."
                            )
                    api_response_metadata.update(
                        {
                            "title_from_pdf_meta": pdf_title,
                            "author_from_pdf_meta": pdf_author,
                            "year_from_pdf_meta": pdf_year,
                        }
                    )
            except Exception as e_fitz:
                print(f"WARN_PYMUPDF_META: PyMuPDF Fehler: {e_fitz}")

            with open(temp_pdf_path, "wb") as f:
                f.write(pdf_bytes)
            rendered_obj = self.converter(temp_pdf_path)
            if not rendered_obj:
                raise ValueError("Marker gab kein Objekt zurück.")
            md_text, marker_global_meta, img_dict = text_from_rendered(rendered_obj)
            md_text_len = len(md_text)

            if isinstance(marker_global_meta, dict):
                api_response_metadata.update(marker_global_meta)
            elif marker_global_meta is not None:
                api_response_metadata["marker_raw_meta"] = str(marker_global_meta)

            # NEU: Fallback zur Jahresextraktion aus dem Markdown-Text, wenn pdf_year noch None ist
            if pdf_year is None and md_text:
                print(
                    f"LOG_PROCESS_PDF: Kein Jahr aus PDF-Metadaten für '{original_doc_filename}'. Versuche Extraktion aus Text..."
                )
                # Suche nach vierstelligen Zahlen, die wie Jahre aussehen (z.B. 19XX oder 20XX)
                # Konzentriere dich auf die ersten N Zeichen des Dokuments (z.B. erste Seite)
                # oder suche nach "arXiv" und dann nach einem Datum in der Nähe.
                # Beispiel für arXiv: "arXiv:YYMM.NNNNNvX [category] DD Mon YYYY"
                arxiv_date_match = re.search(
                    r"\[\w+-\w+\.?\w*\]\s+\d{1,2}\s+\w+\s+(\d{4})", md_text[:2000]
                )  # Suche in den ersten 2000 Zeichen
                if arxiv_date_match:
                    try:
                        pdf_year = int(arxiv_date_match.group(1))
                        api_response_metadata["year_from_markdown_text"] = pdf_year
                        print(
                            f"LOG_PROCESS_PDF: Jahr '{pdf_year}' aus arXiv-Muster im Text extrahiert."
                        )
                    except ValueError:
                        pass

                if (
                    pdf_year is None
                ):  # Wenn arXiv-Muster nicht passt, allgemeinerer Versuch
                    year_match_md = re.search(r"\b(20\d{2}|19\d{2})\b", md_text[:1000])
                    if year_match_md:
                        try:
                            year_candidate = int(year_match_md.group(1))
                            current_actual_year = datetime.now().year
                            # Plausibilitätscheck (z.B. nicht zu weit in der Zukunft)
                            if (
                                1900 < year_candidate <= current_actual_year + 5
                            ):  # +5 für Preprints/zukünftige Konferenzen
                                pdf_year = year_candidate
                                api_response_metadata["year_from_markdown_text"] = (
                                    pdf_year
                                )
                                print(
                                    f"LOG_PROCESS_PDF: Jahr '{pdf_year}' (allgemein) aus Text extrahiert."
                                )
                        except ValueError:
                            pass

            # Update die Metadaten für die API-Antwort mit dem potenziell neu gefundenen Jahr
            if (
                pdf_year is not None
                and "year_from_pdf_meta" not in api_response_metadata
            ):  # Falls PyMuPDF nichts lieferte
                api_response_metadata["year_from_pdf_meta"] = (
                    pdf_year  # Nutze denselben Key für Konsistenz
                )
            elif (
                pdf_year is not None
                and api_response_metadata.get("year_from_pdf_meta") is None
            ):  # Wenn PyMuPDF None lieferte
                api_response_metadata["year_from_pdf_meta"] = pdf_year

            db_document = await crud_document.get_document_by_processed_id(
                db, doc_id_folder_name
            )
            if not db_document:
                db_document = await crud_document.create_document(
                    db=db,
                    original_filename=original_doc_filename,
                    processed_document_id=doc_id_folder_name,
                    title=pdf_title,
                    author=pdf_author,
                    publication_year=pdf_year,  # pdf_year wird hier verwendet
                    additional_metadata=api_response_metadata.get(
                        "marker_additional_meta"
                    )
                    or marker_global_meta,
                )
            if not db_document or not db_document.id:
                raise ValueError("DB Dokument Fehler.")
            else:
                print(f"LOG_DB: Dokument ID {db_document.id} erhalten/erstellt.")

            toc_for_splitter = api_response_metadata.get("table_of_contents", [])
            chunk_dictionaries = chunk_globally_then_assign_pages(
                md_text, toc_for_splitter
            )
            pydantic_text_chunks_for_api = [
                TextChunk(**cd) for cd in chunk_dictionaries
            ]

            if pydantic_text_chunks_for_api:
                chunk_contents = [c.content for c in pydantic_text_chunks_for_api]
                embeddings = generate_embeddings(chunk_contents)
                await crud_chunk.create_chunks(
                    db,
                    document_id=db_document.id,
                    chunks_data=pydantic_text_chunks_for_api,
                    embeddings=embeddings,
                )

            await db.commit()
            print(f"LOG_DB: Dokument und Chunks für {doc_id_folder_name} commited.")

            if img_dict:
                for key, val in img_dict.items():
                    img_info = self._save_image_and_get_info(
                        val, key, doc_id_folder_name
                    )
                    if img_info:
                        images_info_for_api.append(img_info)

            debug_msg = f"'{original_doc_filename}' OK. MD={md_text_len}, Chunks={len(pydantic_text_chunks_for_api)}, Bilder={len(images_info_for_api)}."
        except Exception as e:
            await db.rollback()
            debug_msg = f"Fehler: {e}"
            print(f"ERROR_SERVICE: {debug_msg}")
            import traceback

            traceback.print_exc()
            api_response_metadata["error_processing_pdf"] = str(e)
        finally:
            if os.path.exists(temp_pdf_path):
                try:
                    os.remove(temp_pdf_path)
                except OSError:
                    pass

        return PdfProcessingResult(
            text_chunks=pydantic_text_chunks_for_api,
            images=images_info_for_api,
            metadata=api_response_metadata,
            debug_message=debug_msg,
        )
