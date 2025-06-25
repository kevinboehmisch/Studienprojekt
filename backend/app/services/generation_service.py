# app/services/generation_service.py
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from bs4 import BeautifulSoup # Hinzufügen, um HTML zu parsen und zu Text zu konvertieren

from .retrieval_service import RetrievalService
from .llm_service import generate_text_with_llm

class GenerationService:
    def __init__(self):
        self.retrieval_service = RetrievalService()
        self.llm_provider = os.getenv("LLM_PROVIDER", "google").lower()

    async def generate_text_with_context(
            self,
            db: AsyncSession,
            editor_context_html: str,
            user_prompt: Optional[str],
            num_retrieved_chunks: Optional[int] = 3,
            insertion_pos: Optional[int] = None # NEU: Position hier empfangen
        ) -> Dict[str, Any]:
            print(f"LOG_GEN_SERVICE: Starte generate_text_with_context.")
            print(f"  User Prompt: '{str(user_prompt)[:70]}...'")
            print(f"  Editor Context HTML (erste 100 Zeichen): '{editor_context_html[:100]}...'")
            print(f"  Insertion Position: {insertion_pos}")


            # 1. HTML-Kontext zu reinem Text konvertieren und Marker einfügen
            # Dies ist entscheidend, damit das LLM die HTML-Tags nicht sieht und den Marker versteht.
            soup = BeautifulSoup(editor_context_html, 'html.parser')
            plain_editor_text = soup.get_text(separator='\n', strip=True) # Konvertiere HTML zu reinem Text mit Zeilenumbrüchen

            # Einfüge-Marker im reinen Text platzieren
            context_with_marker = plain_editor_text
            marker_text = "\n[--- HIER SOLL DER NEUE TEXT EINGEFÜGT WERDEN ---]\n"
            if insertion_pos is not None and 0 <= insertion_pos <= len(plain_editor_text):
                context_with_marker = plain_editor_text[:insertion_pos] + marker_text + plain_editor_text[insertion_pos:]
                print(f"LOG_GEN_SERVICE: Marker im Kontext bei Position {insertion_pos} platziert.")
            else:
                context_with_marker += marker_text # Marker ans Ende, wenn keine Position gegeben ist
                print(f"LOG_GEN_SERVICE: Marker am Ende des Kontexts platziert (keine genaue Position).")

            # 2. QUERY FÜR RETRIEVAL:
            # Nutze den user_prompt für die Quellensuche. Wenn kein user_prompt, nimm Kontext um den Marker.
            query_for_retrieval = user_prompt
            if not query_for_retrieval or not query_for_retrieval.strip():
                # Bessere Fallback-Query: Extrahiere relevanten Text um die Einfügeposition
                # Nimm z.B. 100 Zeichen vor und 100 Zeichen nach dem Marker (oder Ende des Dokuments)
                if insertion_pos is not None:
                    start_idx = max(0, insertion_pos - 100)
                    end_idx = min(len(plain_editor_text), insertion_pos + 100)
                    context_around_marker = plain_editor_text[start_idx:end_idx].strip()
                    if context_around_marker:
                        query_for_retrieval = context_around_marker
                        print(f"LOG_GEN_SERVICE: Fallback-Query aus Kontext um Marker: '{query_for_retrieval[:70]}...'")
                    else:
                        query_for_retrieval = "Allgemeiner Kontext des Dokuments"
                else:
                    query_for_retrieval = "Allgemeiner Kontext des Dokuments"


            retrieved_chunks_data = await self.retrieval_service.find_relevant_chunks(
                db=db,
                query_text=query_for_retrieval,
                limit=num_retrieved_chunks if num_retrieved_chunks is not None else 3
            )

            sources_for_api_response = []
            context_for_llm_sources = ""

            if not retrieved_chunks_data:
                print(f"LOG_GEN_SERVICE: Keine relevanten Chunks für Query '{query_for_retrieval}' gefunden.")
            else:
                for i, chunk_data in enumerate(retrieved_chunks_data):
                    chunk_id = str(chunk_data.get('chunk_db_id', f'retrieved_chunk_{i}'))
                    context_for_llm_sources += f"--- Quelle [ID:{chunk_id}] ---\n"
                    context_for_llm_sources += f"Dokument: {chunk_data.get('original_filename', 'N/A')}\n"
                    context_for_llm_sources += f"Titel: {chunk_data.get('document_title', 'N/A')}\n"
                    context_for_llm_sources += f"Autor: {chunk_data.get('document_author', 'N/A')}\n"
                    context_for_llm_sources += f"Jahr: {chunk_data.get('publication_year', 'N/A')}\n"
                    context_for_llm_sources += f"Seite: {chunk_data.get('page_number', 'N/A')}\n"
                    context_for_llm_sources += f"Inhalt des Chunks:\n{chunk_data.get('chunk_content', '')}\n"
                    context_for_llm_sources += f"--- Ende Quelle [ID:{chunk_id}] ---\n\n"

                    sources_for_api_response.append({
                        "chunk_id": chunk_id, "filename": chunk_data.get('original_filename'),
                        "title": chunk_data.get('document_title'), "author": chunk_data.get('document_author'),
                        "year": chunk_data.get('publication_year'), "page": chunk_data.get('page_number'),
                        "content_preview": chunk_data.get('chunk_content', '')[:200] + "...", "distance": chunk_data.get('distance')
                    })

            # Erstelle den finalen Prompt für das LLM
            prompt_template = (
                "SYSTEMNACHRICHT: Du bist ein hochqualifizierter KI-Assistent mit Spezialisierung auf wissenschaftliches Schreiben, Argumentationslogik und Fachtextproduktion. "
                "Deine Aufgabe ist es, den bestehenden Dokumentkontext sinnvoll fortzuführen oder eine konkrete Nutzeranweisung in kohärenter, akademisch fundierter Form zu bearbeiten. "
                "Dabei kombinierst du präzises Schreiben mit kritischem Denken und nutzt bereitgestellte Quellen, um deine Aussagen zu untermauern.\n\n"

                "Nutze die BEREITGESTELLTEN QUELLEN, falls verfügbar, um Aussagen zu belegen. Du darfst auch kontextbasiert argumentieren, wenn die Faktenlage es zulässt – vermeide jedoch jegliche Spekulation. "
                "Du sollst nicht einfach Informationen wiedergeben, sondern den Text *inhaltlich fortführen*, mit einem klaren roten Faden und einem wissenschaftlich fundierten Stil.\n\n"

                "QUELLENNUTZUNG:\n"
                "– Nutze Quellen als Belege für zentrale Aussagen.\n"
                "– Jeder Absatz sollte sich primär auf eine Quelle stützen, wenn möglich – gib in diesem Fall eine Zitation im Format `[ID:CHUNK_ID_HIER]` an.\n"
                "– Nutze nicht mehrere Quellen pro Absatz nur, wenn ein Vergleich oder eine Synthese sinnvoll ist.\n"
                "– Falls keine passenden Quellen existieren, schreibe vorsichtig und betone ggf. die Lücke.\n\n"

                "ZIEL: Schreibe einen oder mehrere neue Absätze, die thematisch und stilistisch zum vorhandenen Dokument passen. "
                "Der neue Abschnitt soll *strukturiert, argumentativ* und wissenschaftlich *klar* formuliert sein. Schreibe aktiv, nicht paraphrasierend.\n\n"

                # HIER SIND DIE KRITISCHEN NEUEN ANWEISUNGEN FÜR DIE NICHT-WIEDERHOLUNG:
                "ANWEISUNG ZUR AUSGABEFORM UND WIEDERHOLUNG:\n"
                "1. Deine Antwort muss *ausschließlich aus dem NEUEN TEXT* bestehen, den du generierst.\n"
                "2. **Wiederhole auf keinen Fall** den Inhalt des bereitgestellten 'VORHANDENEN DOKUMENTKONTEXTS' oder der 'ANWEISUNG DES NUTZERS'.\n"
                "3. Der generierte Text soll direkt dort anknüpfen, wo er im Dokument benötigt wird, insbesondere am Marker `[--- HIER SOLL DER NEUE TEXT EINGEFÜGT WERDEN ---]`. Entferne diesen Marker im generierten Text NICHT, aber du musst ihn auch nicht explizit im generierten Text erwähnen.\n"
                "4. Generiere nur die Fortsetzung oder die Antwort auf die Anweisung, *ohne Einleitungssätze* wie 'Basierend auf den Quellen...' oder 'Die Antwort auf Ihre Frage lautet...'. Beginne direkt mit dem Inhalt.\n"
                "5. Wenn der Dokumentkontext oder die Quellen nicht ausreichend sind, gib eine kurze, klare Meldung aus, dass du keinen relevanten Text generieren kannst, ohne zu wiederholen.\n\n"
                
                "VORHANDENER DOKUMENTKONTEXT:\n"
                "--- Anfang Dokumentkontext ---\n"
                "{editor_context}\n"
                "--- Ende Dokumentkontext ---\n\n"

                "BEREITGESTELLTE QUELLEN (falls vorhanden):\n"
                "--- Anfang Quellen ---\n"
                "{source_context}\n"
                "--- Ende Quellen ---\n\n"

                "ANWEISUNG DES NUTZERS:\n"
                "--- Anfang Nutzeranweisung ---\n"
                "{user_instruction}\n"
                "--- Ende Nutzeranweisung ---\n\n"

                "GENERIERTER TEXTABSCHNITT (nur NEUER Inhalt, keine Wiederholung):\n"
            )

            prompt_data = {
                "editor_context": context_with_marker, # Der reine Text mit dem Marker
                "source_context": context_for_llm_sources.strip() if context_for_llm_sources else "Keine spezifischen Quellen für diese Anfrage gefunden/verwendet.",
                "user_instruction": user_prompt if user_prompt and user_prompt.strip() else "Führe den vorhandenen Dokumentkontext thematisch passend fort oder ergänze ihn, insbesondere ab dem Marker [--- HIER SOLL DER NEUE TEXT EINGEFÜGT WERDEN ---]."
            }

            generated_text_from_llm = await generate_text_with_llm(
                prompt_template_str=prompt_template,
                context_data=prompt_data,
                provider=self.llm_provider
            )

            if generated_text_from_llm is None:
                generated_text_from_llm = "Fehler: Das Sprachmodell konnte keine Antwort generieren."

            return {"generated_text": generated_text_from_llm, "sources": sources_for_api_response}