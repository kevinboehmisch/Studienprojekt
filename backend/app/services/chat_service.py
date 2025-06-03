# app/services/chat_service.py
import os
import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from .retrieval_service import RetrievalService
from .llm_service import generate_text_with_llm, get_llm_chat_model
from app.db.crud import crud_chat 

class ChatService:
    def __init__(self):
        self.retrieval_service = RetrievalService()
        self.llm_provider = os.getenv("LLM_PROVIDER", "google").lower()
        self.chat_model = get_llm_chat_model(self.llm_provider)
        print(f"LOG_CHAT_SERVICE_INIT: ChatService initialisiert mit LLM Provider: {self.llm_provider}")

    async def process_chat_message(
        self, 
        db: AsyncSession, 
        session_id: uuid.UUID, 
        user_message_content: str,
        num_retrieved_chunks: int = 3,
        use_rag: bool = True
    ) -> Dict[str, Any]:
        print(f"LOG_CHAT_SERVICE: Verarbeite Nachricht für Session {session_id} (use_rag={use_rag}): '{user_message_content[:70]}...'")
        chat_session_db_obj = await crud_chat.get_or_create_chat_session(db, session_id)
        if not chat_session_db_obj:
            error_msg = f"Chat-Session {session_id} konnte nicht initialisiert werden."
            print(f"ERROR_CHAT_SERVICE: {error_msg}")
            return {"ai_message": f"Fehler: {error_msg}", "retrieved_sources_for_context": []}
        
        await crud_chat.add_chat_message(db, chat_session_db_obj.id, "user", user_message_content)
        chat_history_db_messages = await crud_chat.get_chat_history(db, chat_session_db_obj.id, limit=10) 
        history_for_llm_prompt = [HumanMessage(content=m.content) if m.sender_type=="user" else AIMessage(content=m.content) for m in chat_history_db_messages]
        
        context_for_llm = "Keine spezifischen Dokumenten-Quellen für diese Anfrage herangezogen."
        sources_for_api_response: List[Dict[str, Any]] = [] # Expliziter Typ

        if use_rag:
            print(f"LOG_CHAT_SERVICE: RAG aktiviert. Rufe RetrievalService auf...")
            # retrieved_chunks_data SOLLTE eine List[Dict[str, Any]] sein, wie von crud_retrieval definiert
            retrieved_chunks_data = await self.retrieval_service.find_relevant_chunks(db=db, query_text=user_message_content, limit=num_retrieved_chunks)
            print(f"LOG_CHAT_SERVICE: RetrievalService lieferte {len(retrieved_chunks_data)} Chunks.")
            
            if retrieved_chunks_data:
                context_for_llm = "" 
                for i, chunk_data_dict in enumerate(retrieved_chunks_data):
                    print(f"  LOG_CHAT_SERVICE_CHUNK_PROCESSING_{i}: Original chunk_data_dict von Retrieval: {chunk_data_dict}")
                    
                    # Sicheres Holen der chunk_db_id und Konvertierung zu String
                    raw_chunk_id = chunk_data_dict.get('chunk_db_id')
                    if raw_chunk_id is None:
                        chunk_id_for_api_and_prompt = f'fallback_retrieved_chunk_id_{i}'
                        print(f"  WARN_CHAT_SERVICE: 'chunk_db_id' fehlt oder ist None in chunk_data_dict {i}. Verwende Fallback: {chunk_id_for_api_and_prompt}")
                    else:
                        chunk_id_for_api_and_prompt = str(raw_chunk_id)
                    
                    print(f"  LOG_CHAT_SERVICE_CHUNK_PROCESSING_{i}: Verwendete chunk_id für API/Prompt: '{chunk_id_for_api_and_prompt}'")

                    context_for_llm += f"--- Quelle [ID:{chunk_id_for_api_and_prompt}] (Seite {chunk_data_dict.get('page_number', 'N/A')}) ---\nInhalt: {chunk_data_dict.get('chunk_content', '')}\n---\n\n"
                    
                    source_to_append = {
                        "chunk_id": chunk_id_for_api_and_prompt, 
                        "filename": chunk_data_dict.get('original_filename'),
                        "title": chunk_data_dict.get('document_title'),
                        "author": chunk_data_dict.get('document_author'),
                        "year": chunk_data_dict.get('publication_year'),
                        "page": chunk_data_dict.get('page_number'),
                        "content_preview": chunk_data_dict.get('chunk_content', '')[:150] + "...",
                        "distance": chunk_data_dict.get('distance')
                    }
                    sources_for_api_response.append(source_to_append)
                    print(f"  LOG_CHAT_SERVICE_CHUNK_PROCESSING_{i}: Zu sources_for_api_response hinzugefügt: {source_to_append}")
                print(f"LOG_CHAT_SERVICE: {len(sources_for_api_response)} RAG-Quellen für Kontext und API-Antwort vorbereitet.")
            else: print("LOG_CHAT_SERVICE: Keine relevanten RAG-Quellen gefunden.")
        else: print("LOG_CHAT_SERVICE: RAG deaktiviert.")

        system_prompt_str = ("Du bist PaperPilot... Zitiere mit [ID:CHUNK_ID].") # Gekürzt
        llm_messages: List[SystemMessage | HumanMessage | AIMessage] = [SystemMessage(content=system_prompt_str)]
        llm_messages.extend(history_for_llm_prompt)
        current_user_message_for_llm = user_message_content
        if use_rag and sources_for_api_response: 
            current_user_message_for_llm = (f"Basierend auf Infos:\n{context_for_llm}\nMeine Frage: {user_message_content}")
        llm_messages.append(HumanMessage(content=current_user_message_for_llm))
        
        ai_response_content = "Fehler: LLM nicht verfügbar."
        if self.chat_model:
            try:
                ai_response = await self.chat_model.ainvoke(llm_messages)
                ai_response_content = ai_response.content
            except Exception as e_llm: print(f"ERROR_CHAT_SERVICE: LLM Fehler: {e_llm}"); ai_response_content = "LLM Fehler."
        
        await crud_chat.add_chat_message(db, chat_session_db_obj.id, "ai", ai_response_content)
        await db.commit()
        print(f"LOG_CHAT_SERVICE: Änderungen für Session {session_id} commited.")
        return {"ai_message": ai_response_content, "retrieved_sources_for_context": sources_for_api_response}