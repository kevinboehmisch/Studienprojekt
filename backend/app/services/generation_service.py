# app/services/generation_service.py
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .retrieval_service import RetrievalService 
from .llm_service import generate_text_with_llm 
# TextChunk Pydantic Schema wird hier nicht direkt benötigt, da wir Dictionaries verarbeiten und zurückgeben

class GenerationService:
    def __init__(self):
        self.retrieval_service = RetrievalService()
        self.llm_provider = os.getenv("LLM_PROVIDER", "google").lower()
        print(f"LOG_GEN_SERVICE_INIT: GenerationService initialisiert mit LLM Provider: {self.llm_provider}")

    async def generate_text_with_context( # NEUE Methode und Parameter
            self,
            db: AsyncSession,
            editor_context_html: str,
            user_prompt: Optional[str], # Kann None sein
            num_retrieved_chunks: Optional[int] = 3
        ) -> Dict[str, Any]:
            """
            Generiert Text basierend auf dem gesamten Editor-Kontext und einer optionalen Nutzeranweisung.
            Findet relevante Quellen basierend auf dem Nutzer-Prompt oder dem Kontext.
            """
            print(f"LOG_GEN_SERVICE: Starte generate_text_with_context.")
            print(f"  User Prompt: '{str(user_prompt)[:70]}...'")
            print(f"  Editor Context HTML (erste 100 Zeichen): '{editor_context_html[:100]}...'")
            query_for_retrieval = user_prompt
            if not query_for_retrieval or not query_for_retrieval.strip():
                query_for_retrieval = "Allgemeiner Kontext des Dokuments"
                print(f"LOG_GEN_SERVICE: Kein spezifischer User-Prompt, verwende Fallback-Query für Retrieval: '{query_for_retrieval}'")
            retrieved_chunks_data = await self.retrieval_service.find_relevant_chunks(
                db=db,
                query_text=query_for_retrieval, # Nutze die bestimmte Query
                limit=num_retrieved_chunks if num_retrieved_chunks is not None else 3
            )

            sources_for_api_response = []
            context_for_llm_sources = "" # Separater Kontext nur für die Quellen

            if not retrieved_chunks_data:
                print(f"LOG_GEN_SERVICE: Keine relevanten Chunks für Query '{query_for_retrieval}' gefunden.")
                # Auch wenn keine Quellen gefunden werden, kann das LLM versuchen,
                # basierend auf dem editor_context_html und user_prompt zu generieren.
            else:
                print(f"LOG_GEN_SERVICE: Bereite Kontext aus {len(retrieved_chunks_data)} Chunks vor.")
                for i, chunk_data in enumerate(retrieved_chunks_data):
                    chunk_id = str(chunk_data.get('chunk_db_id', f'retrieved_chunk_{i}'))
                    context_for_llm_sources += f"--- Quelle [ID:{chunk_id}] ---\n"
                    context_for_llm_sources += f"Dokument: {chunk_data.get('original_filename', 'N/A')}\n"
                    # ... (restliche Quellformatierung bleibt gleich)
                    context_for_llm_sources += f"Inhalt des Chunks:\n{chunk_data.get('chunk_content', '')}\n"
                    context_for_llm_sources += f"--- Ende Quelle [ID:{chunk_id}] ---\n\n"

                    sources_for_api_response.append({
                        "chunk_id": chunk_id,
                        # ... (restliche Felder für API-Antwort bleiben gleich)
                        "filename": chunk_data.get('original_filename'), "title": chunk_data.get('document_title'),
                        "author": chunk_data.get('document_author'), "year": chunk_data.get('publication_year'),
                        "page": chunk_data.get('page_number'),
                        "content_preview": chunk_data.get('chunk_content', '')[:200] + "...",
                        "distance": chunk_data.get('distance')
                    })

            # Erstelle den finalen Prompt für das LLM
            # Dieser beinhaltet jetzt den Editor-Kontext, die Quellen und den User-Prompt.
            # Konvertiere editor_context_html zu reinem Text für bessere LLM-Verarbeitung, falls nötig
            # from bs4 import BeautifulSoup
            # soup = BeautifulSoup(editor_context_html, 'html.parser')
            # plain_editor_text_for_llm = soup.get_text(separator=' ', strip=True)
            # Für den Anfang verwenden wir das HTML direkt, manche LLMs können damit umgehen oder es ist Teil des System-Prompts.

            prompt_template = (
                "SYSTEMNACHRICHT: Du bist ein hochqualifizierter KI-Assistent mit Expertise in der wissenschaftlichen Forschung und der Erstellung von Fachdokumentationen. "
                "Deine Aufgabe ist es, präzise, kohärente und gut strukturierte Textabschnitte zu verfassen, die den VORHANDENEN DOKUMENTKONTEXT fortführen oder eine spezifische ANWEISUNG DES NUTZERS bearbeiten. "
                "Deine generierten Texte müssen ausschließlich auf den zusätzlich BEREITGESTELLTEN QUELLEN basieren, falls welche vorhanden sind.\n"
                "Vermeide jede Form von Spekulation oder Informationen, die nicht explizit in den Quellen oder dem vorhandenen Dokumentkontext genannt werden. "
                "Wenn die Quellen keine ausreichende Antwort auf die Anfrage des Nutzers liefern oder das Thema nicht abdecken, weise klar und deutlich darauf hin.\n\n"

                "VORHANDENER DOKUMENTKONTEXT (HTML-Format, an dem der neue Text angefügt oder der bearbeitet werden soll):\n"
                "--- Anfang Dokumentkontext ---\n"
                "{editor_context}\n"
                "--- Ende Dokumentkontext ---\n\n"

                "BEREITGESTELLTE QUELLEN (jeder Block ist mit einer eindeutigen CHUNK_ID gekennzeichnet und enthält relevante Metadaten wie Dokument, Autor, Jahr und Seite. Nutze diese für Fakten und Zitationen):\n"
                "--- Anfang Quellen ---\n"
                "{source_context}\n" # Hier wird context_for_llm_sources eingesetzt (kann leer sein)
                "--- Ende Quellen ---\n\n"

                "ANWEISUNG DES NUTZERS (falls vorhanden; wenn nicht, führe den Dokumentkontext thematisch passend und unter Verwendung der Quellen fort):\n"
                "--- Anfang Nutzeranweisung ---\n"
                "{user_instruction}\n"
                "--- Ende Nutzeranweisung ---\n\n"

                "ANWEISUNG FÜR DIE ANTWORTGENERIERUNG UND ZITATION:\n"
                "1. Formuliere einen oder mehrere Absätze als Antwort oder Fortführung.\n"
                "2. Integriere Informationen aus den BEREITGESTELLTEN QUELLEN natürlich und logisch in deinen Text, falls sie relevant sind.\n"
                "3. ZITATION: Wenn du Informationen direkt aus einer der BEREITGESTELLTEN QUELLEN entnimmst, **MUSST** du am Ende des Satzes oder Absatzes, der diese Information primär enthält, die eindeutige ID des Quell-Chunks im exakten Format `[ID:CHUNK_ID_HIER]` angeben. Ersetze `CHUNK_ID_HIER` mit der tatsächlichen ID aus dem Quelltext (z.B. `[ID:2177095a-f576-437c-8551-f5df3db4fb93]`).\n"
                "4. PRO ABSATZ EINE PRIMÄRE QUELLE: Strebe an, dass jeder Absatz, der auf Quellen basiert, sich primär auf Informationen aus *einer* Quelle stützt und entsprechend zitiert wird. Vermeide es, mehrere `[ID:...]`-Tags für denselben Informationsblock zu verwenden, es sei denn, es ist ein direkter Vergleich mehrerer Quellen notwendig.\n"
                "5. QUELLENVIELFALT: Wenn mehrere Quellen relevante Informationen bieten, versuche, diese über verschiedene Sätze oder Absätze hinweg zu verteilen und entsprechend zu zitieren, um eine breitere Quellenbasis zu zeigen.\n"
                "6. KEINE SPEKULATION: Generiere keine Informationen oder Zitate für Quellen, die nicht bereitgestellt wurden.\n"
                "7. Präsentiere den Text in einem klaren, akademischen Stil.\n\n"
                "GENERIERTER TEXTABSCHNITT (nur der neue Text, ohne Wiederholung der Anweisungen oder des Kontexts):\n"
            )
            prompt_data = {
                "editor_context": editor_context_html, # HTML-Kontext übergeben
                "source_context": context_for_llm_sources.strip() if context_for_llm_sources else "Keine spezifischen Quellen für diese Anfrage gefunden/verwendet.",
                "user_instruction": user_prompt if user_prompt and user_prompt.strip() else "Führe den vorhandenen Dokumentkontext thematisch passend fort oder ergänze ihn."
            }

            print(f"LOG_GEN_SERVICE: Rufe LLM zur Textgenerierung auf. Provider: {self.llm_provider}")
            generated_text_from_llm = await generate_text_with_llm(
                prompt_template_str=prompt_template,
                context_data=prompt_data,
                provider=self.llm_provider
            )

            if generated_text_from_llm is None:
                generated_text_from_llm = "Fehler: Das Sprachmodell konnte keine Antwort generieren."
                print(f"ERROR_GEN_SERVICE: LLM hat None zurückgegeben.")

            return {"generated_text": generated_text_from_llm, "sources": sources_for_api_response}    
            
        