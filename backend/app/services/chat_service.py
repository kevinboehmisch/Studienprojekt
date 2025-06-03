# app/services/chat_service.py
import os, uuid, time # time hinzugefügt
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
        self, db: AsyncSession, session_id: uuid.UUID, user_message_content: str,
        num_retrieved_chunks: int = 3, use_rag: bool = True
    ) -> Dict[str, Any]:
        service_method_start_time = time.time()
        print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] process_chat_message gestartet für Session {session_id} (use_rag={use_rag}).")

        # DB Op 1: get_or_create_session
        db_op1_start = time.time()
        chat_session_db_obj = await crud_chat.get_or_create_chat_session(db, session_id)
        print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] get_or_create_chat_session beendet. Dauer: {time.time() - db_op1_start:.2f}s")
        if not chat_session_db_obj: # Fehlerbehandlung
            return {"ai_message": "Fehler: Session nicht initialisiert", "retrieved_sources_for_context": []}
        
        # DB Op 2: add_chat_message (user)
        db_op2_start = time.time()
        await crud_chat.add_chat_message(db, chat_session_db_obj.id, "user", user_message_content)
        print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] User-Nachricht gespeichert. Dauer: {time.time() - db_op2_start:.2f}s")
        
        # DB Op 3: get_chat_history
        db_op3_start = time.time()
        chat_history_db_messages = await crud_chat.get_chat_history(db, chat_session_db_obj.id, limit=10) 
        print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] Chat-Historie geladen. Dauer: {time.time() - db_op3_start:.2f}s. Nachrichten: {len(chat_history_db_messages)}")
        history_for_llm_prompt = [HumanMessage(content=m.content) if m.sender_type=="user" else AIMessage(content=m.content) for m in chat_history_db_messages]
        
        context_for_llm = "Kein spezifischer Dokumenten-Kontext angefordert oder gefunden."
        sources_for_api_response: List[Dict[str, Any]] = []

        if use_rag:
            retrieval_start_time = time.time()
            print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] RAG: Starte RetrievalService.find_relevant_chunks...")
            retrieved_chunks_data = await self.retrieval_service.find_relevant_chunks(db=db, query_text=user_message_content, limit=num_retrieved_chunks)
            print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] RAG: RetrievalService beendet. Dauer: {time.time() - retrieval_start_time:.2f}s. Chunks: {len(retrieved_chunks_data)}")
            if retrieved_chunks_data:
                context_for_llm = "" 
                for i, chunk_data in enumerate(retrieved_chunks_data): # Aufbereitung Kontext
                    chunk_id = str(chunk_data.get('chunk_db_id', f'retrieved_chunk_{i}'))
                    context_for_llm += f"--- Quelle [ID:{chunk_id}] (Seite {chunk_data.get('page_number', 'N/A')}) ---\nInhalt: {chunk_data.get('chunk_content', '')}\n---\n\n"
                    sources_for_api_response.append({k: chunk_data.get(k) for k in ["chunk_id", "filename", "title", "author", "year", "page", "distance"]} | {"content_preview": chunk_data.get('chunk_content', '')[:150] + "..."})
        else: print("LOG_CHAT_SERVICE: RAG deaktiviert.")

        system_prompt_str = ("Du bist PaperPilot... Zitiere mit [ID:CHUNK_ID].")
        llm_messages: List[SystemMessage | HumanMessage | AIMessage] = [SystemMessage(content=system_prompt_str)]
        llm_messages.extend(history_for_llm_prompt)
        current_user_message_for_llm = user_message_content
        if use_rag and sources_for_api_response: 
            current_user_message_for_llm = (f"Basierend auf Infos:\n{context_for_llm}\nMeine Frage: {user_message_content}")
        llm_messages.append(HumanMessage(content=current_user_message_for_llm))
        
        ai_response_content = "Fehler: LLM nicht verfügbar."
        if self.chat_model:
            try:
                llm_call_start_time = time.time()
                print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] Sende an LLM. Nachrichten: {len(llm_messages)}")
                ai_response = await self.chat_model.ainvoke(llm_messages)
                ai_response_content = ai_response.content
                print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] LLM-Antwort erhalten. Dauer: {time.time() - llm_call_start_time:.2f}s. (Auszug): {ai_response_content[:70]}...")
            except Exception as e_llm: print(f"ERROR_CHAT_SERVICE: LLM Fehler: {e_llm}"); ai_response_content = "LLM Fehler."
        
        # DB Op 4: add_chat_message (ai) und Commit
        db_op4_start = time.time()
        await crud_chat.add_chat_message(db, chat_session_db_obj.id, "ai", ai_response_content)
        await db.commit()
        print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] AI-Nachricht gespeichert & commited. Dauer: {time.time() - db_op4_start:.2f}s.")
        
        print(f"LOG_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] process_chat_message beendet. Gesamtdauer: {time.time() - service_method_start_time:.2f}s")
        return {"ai_message": ai_response_content, "retrieved_sources_for_context": sources_for_api_response}