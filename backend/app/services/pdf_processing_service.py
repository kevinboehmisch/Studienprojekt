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

from app.schemas.online_search_schemas import ImportFromUrlRequest, BatchImportResultItem
from app.db.models.document_model import Document
import httpx


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
        self, db: AsyncSession, pdf_bytes: bytes, original_doc_filename: str,
        # NEU: Optionale Parameter für von außen bereitgestellte Metadaten
        provided_title: Optional[str] = None,
        provided_author: Optional[str] = None, # Wird als String erwartet
        provided_year: Optional[int] = None,
        external_processed_id_candidate: Optional[str] = None,
        additional_provided_metadata: Optional[Dict[str, Any]] = None
    ) -> PdfProcessingResult:
        # Doku-ID Logik
        if external_processed_id_candidate:
            # Erstelle einen eindeutigen Ordnernamen basierend auf der externen ID
            # Entferne ungültige Zeichen und füge Eindeutigkeit hinzu
            sanitized_external_id = ''.join(c if c.isalnum() else '_' for c in external_processed_id_candidate)
            doc_id_folder_name = f"{sanitized_external_id}_{uuid.uuid4().hex[:6]}"
        else:
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
        if additional_provided_metadata: # Von außen übergebene zusätzliche Metadaten hinzufügen
            api_response_metadata.update(additional_provided_metadata)

        debug_msg: str = ""
        md_text_len = 0
        db_document_obj: Optional[Document] = None # Umbenannt von db_document zur Klarheit

        # Test-DB-Abfrage (optional, aber gut für Debugging)
        # print(f"LOG_SERVICE_DB_TEST: Versuche Test-DB-Abfrage VOR Marker.")
        # try:
        #     await db.execute(text("SELECT 1"))
        #     print(f"LOG_SERVICE_DB_TEST: Test-DB-Abfrage OK.")
        # except Exception as e_db_test:
        #     print(f"ERROR_SERVICE_DB_TEST: Test-DB-Abfrage VOR Marker fehlgeschlagen: {e_db_test}")

        try:
            # Metadaten aus PDF (PyMuPDF) - als Fallback oder Ergänzung
            pdf_title_fitz, pdf_author_fitz, pdf_year_fitz = None, None, None
            try:
                fitz_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                fitz_meta = fitz_doc.metadata
                fitz_doc.close()
                if fitz_meta:
                    pdf_title_fitz = fitz_meta.get("title")
                    pdf_author_fitz = fitz_meta.get("author")
                    creation_date_str = fitz_meta.get("creationDate")
                    mod_date_str = fitz_meta.get("modDate")
                    date_to_parse = creation_date_str or mod_date_str
                    if date_to_parse and isinstance(date_to_parse, str) and date_to_parse.startswith("D:"):
                        year_str_fitz = date_to_parse[2:6]
                        try: pdf_year_fitz = int(year_str_fitz)
                        except ValueError: pass
                # Speichere Fitz-Metadaten in api_response_metadata zur Info
                api_response_metadata.update({
                    "title_from_pdf_meta_fitz": pdf_title_fitz,
                    "author_from_pdf_meta_fitz": pdf_author_fitz,
                    "year_from_pdf_meta_fitz": pdf_year_fitz,
                })
            except Exception as e_fitz:
                print(f"WARN_PDF_SERVICE: PyMuPDF Metadaten-Extraktionsfehler für '{original_doc_filename}': {e_fitz}")

            # Entscheide, welche Metadaten für die DB verwendet werden: Priorität auf `provided_` Werten
            final_title = provided_title if provided_title is not None else pdf_title_fitz
            final_author_str = provided_author if provided_author is not None else pdf_author_fitz
            final_year = provided_year if provided_year is not None else pdf_year_fitz

            # Marker-Verarbeitung
            with open(temp_pdf_path, "wb") as f: f.write(pdf_bytes)
            rendered_obj = self.converter(temp_pdf_path)
            if not rendered_obj: raise ValueError("Marker gab kein Objekt zurück.")
            md_text, marker_global_meta, img_dict = text_from_rendered(rendered_obj)
            md_text_len = len(md_text)

            if isinstance(marker_global_meta, dict): api_response_metadata.update(marker_global_meta)
            elif marker_global_meta is not None: api_response_metadata["marker_raw_meta"] = str(marker_global_meta)
            
            # Fallback für Jahr aus Markdown, wenn final_year immer noch None ist
            if final_year is None and md_text:
                print(f"LOG_PROCESS_PDF: Kein Jahr aus PDF-Metadaten oder bereitgestellten Daten für '{original_doc_filename}'. Versuche Extraktion aus Text...")
                arxiv_date_match = re.search(r"\[\w+-\w+\.?\w*\]\s+\d{1,2}\s+\w+\s+(\d{4})", md_text[:2000])
                if arxiv_date_match:
                    try: final_year = int(arxiv_date_match.group(1))
                    except ValueError: pass
                if final_year is None:
                    year_match_md = re.search(r"\b(19\d{2}|20\d{2})\b", md_text[:1000]) # Jahre 1900-2099
                    if year_match_md:
                        try:
                            year_candidate = int(year_match_md.group(1))
                            current_actual_year = datetime.now().year
                            if 1900 <= year_candidate <= current_actual_year + 5: # Plausibilitätscheck
                                final_year = year_candidate
                        except ValueError: pass
                if final_year is not None:
                     api_response_metadata["year_from_markdown_text"] = final_year


            # DB-Dokument erstellen/abrufen
            db_document_obj = await crud_document.get_document_by_processed_id(db, doc_id_folder_name)
            if not db_document_obj:
                print(f"LOG_PDF_SERVICE_DB: Erstelle neues Dokument für processed_id: {doc_id_folder_name}")
                db_document_obj = await crud_document.create_document(
                    db=db,
                    original_filename=original_doc_filename,
                    processed_document_id=doc_id_folder_name,
                    title=final_title,
                    author=final_author_str,
                    publication_year=final_year,
                    additional_metadata=api_response_metadata # Speichere alle gesammelten Metadaten
                )
            if not db_document_obj or not db_document_obj.id:
                raise ValueError(f"DB Dokument konnte nicht erstellt/abgerufen werden für {doc_id_folder_name}.")
            else:
                print(f"LOG_PDF_SERVICE_DB: Dokument ID {db_document_obj.id} für {doc_id_folder_name} vorhanden/erstellt.")

            # Chunking und Embedding
            toc_for_splitter = api_response_metadata.get("table_of_contents", [])
            chunk_dictionaries = chunk_globally_then_assign_pages(md_text, toc_for_splitter)
            pydantic_text_chunks_for_api = [TextChunk(**cd) for cd in chunk_dictionaries]

            if pydantic_text_chunks_for_api:
                chunk_contents = [c.content for c in pydantic_text_chunks_for_api]
                embeddings = generate_embeddings(chunk_contents)
                await crud_chunk.create_chunks(
                    db, document_id=db_document_obj.id,
                    chunks_data=pydantic_text_chunks_for_api, embeddings=embeddings
                )
            await db.commit() # Commit nach erfolgreicher Dokument- und Chunk-Erstellung
            print(f"LOG_PDF_SERVICE_DB: Dokument und Chunks für {doc_id_folder_name} commited.")

            # Bildverarbeitung
            if img_dict:
                for key, val in img_dict.items():
                    img_info = self._save_image_and_get_info(val, key, doc_id_folder_name)
                    if img_info: images_info_for_api.append(img_info)

            debug_msg = f"'{original_doc_filename}' erfolgreich verarbeitet. MD-Länge={md_text_len}, Chunks={len(pydantic_text_chunks_for_api)}, Bilder={len(images_info_for_api)}."
        
        except Exception as e:
            await db.rollback() # Rollback bei Fehlern
            debug_msg = f"Fehler bei PDF-Verarbeitung ({original_doc_filename}): {e}"
            print(f"ERROR_PDF_SERVICE: {debug_msg}")
            import traceback; traceback.print_exc()
            api_response_metadata["error_processing_pdf"] = str(e) # Fehler in Metadaten für API-Antwort speichern
        finally:
            if os.path.exists(temp_pdf_path):
                try: os.remove(temp_pdf_path)
                except OSError as e_rm: print(f"WARN_PDF_SERVICE: Konnte temp PDF nicht löschen: {temp_pdf_path}, Fehler: {e_rm}")

        return PdfProcessingResult(
            text_chunks=pydantic_text_chunks_for_api,
            images=images_info_for_api,
            metadata=api_response_metadata,
            debug_message=debug_msg,
            # document_id=str(db_document_obj.id) if db_document_obj and db_document_obj.id else None # Optional: ID zurückgeben
        )

    async def import_pdf_from_url_and_store(
        self, db: AsyncSession, request_data: ImportFromUrlRequest
    ) -> PdfProcessingResult:
        print(f"LOG_PDF_SERVICE: Starte Import von URL: {request_data.pdf_url}")
        
        # HIER DIE ÄNDERUNG: follow_redirects=True
        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            try:
                response = await client.get(request_data.pdf_url)
                response.raise_for_status() # Löst jetzt keinen Fehler mehr bei 3xx aus, wenn follow_redirects=True und erfolgreich
                pdf_bytes = await response.aread()
                print(f"LOG_PDF_SERVICE: PDF von {request_data.pdf_url} (ggf. nach Redirect) erfolgreich heruntergeladen ({len(pdf_bytes)} bytes).")
                print(f"LOG_PDF_SERVICE: Finale URL nach Redirects (falls vorhanden): {response.url}") # Gibt die finale URL aus
            except httpx.HTTPStatusError as e:
                err_msg = f"Konnte PDF von URL nicht herunterladen (HTTP {e.response.status_code}): {request_data.pdf_url}"
                print(f"ERROR_PDF_SERVICE: {err_msg} - Details: {e.response.text[:200]}")
                raise ValueError(err_msg)
            except httpx.RequestError as e:
                err_msg = f"Netzwerkfehler beim PDF-Download von {request_data.pdf_url}: {str(e)}"
                print(f"ERROR_PDF_SERVICE: {err_msg}")
                raise ValueError(err_msg)
            except httpx.TooManyRedirects as e: # Fange explizit ab, falls es eine Redirect-Schleife gibt
                err_msg = f"Zu viele Redirects beim Versuch, PDF von {request_data.pdf_url} herunterzuladen: {str(e)}"
                print(f"ERROR_PDF_SERVICE: {err_msg}")
                raise ValueError(err_msg)

        author_str: Optional[str] = None
        if request_data.authors and isinstance(request_data.authors, list):
            author_str = "; ".join(filter(None, request_data.authors)) # Filtert None-Werte und verbindet

        processed_id_candidate = request_data.arxiv_id if request_data.arxiv_id else \
                                 os.path.splitext(request_data.original_filename)[0]
        
        # Sammle alle Metadaten von arXiv, um sie im Document.additional_metadata zu speichern
        author_str: Optional[str] = None
        if request_data.authors and isinstance(request_data.authors, list):
            author_str = "; ".join(filter(None, request_data.authors))

        processed_id_candidate = request_data.arxiv_id if request_data.arxiv_id else \
                                 os.path.splitext(request_data.original_filename)[0]
        
        arxiv_metadata_for_db = {
            "source_type": "arxiv_import",
            "arxiv_id": request_data.arxiv_id,
            "pdf_url_source": str(response.url), # Speichere die finale URL
        }
        arxiv_metadata_for_db = {k: v for k, v in arxiv_metadata_for_db.items() if v is not None}

        return await self.process_pdf_data_and_store(
            db=db,
            pdf_bytes=pdf_bytes,
            original_doc_filename=request_data.original_filename,
            provided_title=request_data.title,
            provided_author=author_str,
            provided_year=request_data.publication_year,
            external_processed_id_candidate=processed_id_candidate,
            additional_provided_metadata=arxiv_metadata_for_db
        )
        
    async def batch_import_pdfs_from_urls(
        self, db: AsyncSession, papers_to_import: List[ImportFromUrlRequest]
    ) -> List[BatchImportResultItem]:
        batch_results: List[BatchImportResultItem] = []

        print(f"LOG_PDF_SERVICE_BATCH: Starte sequenziellen Import von {len(papers_to_import)} Papern.")
        for paper_data in papers_to_import:
            try:
                print(f"LOG_PDF_SERVICE_BATCH: Verarbeite (sequenziell) {paper_data.original_filename} von URL {paper_data.pdf_url}...")
                # Rufe die bestehende Methode für ein einzelnes Paper auf
                processing_result = await self.import_pdf_from_url_and_store(
                    db=db, # Die DB-Session wird hier für jeden Aufruf wiederverwendet
                           # und `import_pdf_from_url_and_store` ruft `process_pdf_data_and_store` auf,
                           # welches den Commit pro Dokument macht. Das ist bei sequenzieller Verarbeitung sicher.
                    request_data=paper_data
                )
                batch_results.append(BatchImportResultItem(
                    original_filename=paper_data.original_filename,
                    arxiv_id=paper_data.arxiv_id,
                    status="success",
                    message=processing_result.debug_message or f"'{paper_data.original_filename}' erfolgreich importiert.",
                    processed_document_id=processing_result.metadata.get("processed_document_id")
                    # document_db_id=uuid.UUID(processing_result.metadata.get("document_db_id")) if processing_result.metadata.get("document_db_id") else None # Falls du die DB ID brauchst
                ))
                print(f"LOG_PDF_SERVICE_BATCH: {paper_data.original_filename} erfolgreich verarbeitet.")
            except Exception as e:
                error_message = str(e)
                print(f"ERROR_PDF_SERVICE_BATCH: Fehler bei {paper_data.original_filename}: {error_message}")
                import traceback
                traceback.print_exc() # Für detailliertere Fehler im Server-Log
                batch_results.append(BatchImportResultItem(
                    original_filename=paper_data.original_filename,
                    arxiv_id=paper_data.arxiv_id,
                    status="error",
                    message=error_message
                ))
        
        print(f"LOG_PDF_SERVICE_BATCH: Sequenzieller Batch-Import abgeschlossen. {len(batch_results)} Ergebnisse.")
        return batch_results
