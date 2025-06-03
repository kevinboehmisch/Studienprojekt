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

    async def generate_text_from_query(
        self, 
        db: AsyncSession, 
        user_query: str,
        num_retrieved_chunks: int = 3 
    ) -> Dict[str, Any]:
        """
        Findet relevante Quellen (Chunks) zu einer Query, erstellt einen Kontext für ein LLM
        und generiert daraus einen Text. Gibt den Text und die verwendeten Quellen zurück.
        """
        print(f"LOG_GEN_SERVICE: Starte Textgenerierung für Query: '{user_query[:70]}...'")

        retrieved_chunks_data = await self.retrieval_service.find_relevant_chunks(
            db=db,
            query_text=user_query,
            limit=num_retrieved_chunks
        )

        if not retrieved_chunks_data:
            print("LOG_GEN_SERVICE: Keine relevanten Chunks für die Query gefunden.")
            return {
                "generated_text": "Ich konnte leider keine spezifischen Informationen zu Ihrer Anfrage in den vorhandenen Dokumenten finden.", 
                "sources": []
            }

        context_for_llm = ""
        sources_for_api_response = [] # Wird an den API-Client zurückgegeben

        print(f"LOG_GEN_SERVICE: Bereite Kontext aus {len(retrieved_chunks_data)} Chunks vor.")
        for i, chunk_data in enumerate(retrieved_chunks_data):
            # chunk_data ist ein Dict von crud_retrieval.find_similar_chunks
            chunk_id = str(chunk_data.get('chunk_db_id', f'retrieved_chunk_{i}')) # Verwende chunk_db_id
            
            context_for_llm += f"--- Quelle [ID:{chunk_id}] ---\n"
            context_for_llm += f"Dokument: {chunk_data.get('original_filename', 'N/A')}\n"
            context_for_llm += f"Titel: {chunk_data.get('document_title', 'N/A')}\n"
            context_for_llm += f"Autor: {chunk_data.get('document_author', 'N/A')}\n"
            context_for_llm += f"Jahr: {chunk_data.get('publication_year', 'N/A')}\n"
            context_for_llm += f"Seite: {chunk_data.get('page_number', 'N/A')}\n"
            context_for_llm += f"Inhalt des Chunks:\n{chunk_data.get('chunk_content', '')}\n"
            context_for_llm += f"--- Ende Quelle [ID:{chunk_id}] ---\n\n"
            
            sources_for_api_response.append({
                "chunk_id": chunk_id, # Wichtig für das Frontend zur Zuordnung
                "filename": chunk_data.get('original_filename'),
                "title": chunk_data.get('document_title'),
                "author": chunk_data.get('document_author'),
                "year": chunk_data.get('publication_year'),
                "page": chunk_data.get('page_number'),
                "content_preview": chunk_data.get('chunk_content', '')[:200] + "...", # Längere Vorschau
                "distance": chunk_data.get('distance')
            })
        
        prompt_template = (
            "SYSTEMNACHRICHT: Du bist ein hochqualifizierter KI-Assistent mit Expertise in der wissenschaftlichen Forschung und der Erstellung von Fachdokumentationen. Deine Aufgabe ist es, präzise, kohärente und gut strukturierte Texte zu verfassen, die ausschließlich auf den bereitgestellten Quellen basieren.\n"
            "Vermeide jede Form von Spekulation oder Informationen, die nicht explizit in den Quellen genannt werden. Wenn die Quellen keine ausreichende Antwort auf die Anfrage des Nutzers liefern, weise klar und deutlich darauf hin.\n\n"
            "BEREITGESTELLTE QUELLEN (jeder Block ist mit einer eindeutigen CHUNK_ID gekennzeichnet und enthält relevante Metadaten wie Dokument, Autor, Jahr und Seite):\n"
            "{context}\n\n"  # Hier wird der aufbereitete context_for_llm eingesetzt
            "ANFRAGE DES NUTZERS:\n"
            "{user_query}\n\n"
            "ANWEISUNG FÜR DIE ANTWORTGENERIERUNG:\n"
            "1. Formuliere eine umfassende und wissenschaftlich fundierte Antwort auf die Anfrage des Nutzers.\n"
            "2. Integriere die Informationen aus den Quellen natürlich und logisch in deinen Text.\n"
            "3. ZITATION: Verwende für jeden einzelnen Absatz genau eine Quelle, indem du die ID desjenigen Quell-Chunks im Format [ID:CHUNK_ID_HIER] angibst, aus dem die überwiegend verwendeten Informationen dieses Absatzes stammen.\n"
            "4. VERMEIDE MULTI-ZITATE: Vermeide Zitationen mit mehreren IDs, außer es ist zwingend notwendig (z. B. bei direkten Vergleichen). Strebe an, dass pro Absatz nur eine CHUNK_ID verwendet wird. Nutze andere Quellen in den folgenden Absätzen.\n"
            "5. VERMEIDE REDUNDANZ: Verwende nicht wiederholt dieselbe Quelle, wenn andere relevante Quellen zur Verfügung stehen. Variiere die Quellen über die Absätze hinweg, um möglichst viele Quellen einzubinden.\n"
            "6. Präsentiere den Text in einem klaren, akademischen Stil.\n"
            "GENERIERTER TEXT:"
        )
        
        prompt_data = {
            "context": context_for_llm.strip(),
            "user_query": user_query
        }

        print(f"LOG_GEN_SERVICE: Rufe LLM zur Textgenerierung auf. Provider: {self.llm_provider}")
        generated_text_from_llm = await generate_text_with_llm(
            prompt_template_str=prompt_template,
            context_data=prompt_data,
            provider=self.llm_provider
        )

        if generated_text_from_llm is None:
            generated_text_from_llm = "Fehler: Das Sprachmodell konnte keine Antwort generieren."
            print(f"ERROR_GEN_SERVICE: LLM hat None zurückgegeben für Query '{user_query[:70]}...'")


        return {"generated_text": generated_text_from_llm, "sources": sources_for_api_response}