# app/api/chat_endpoints.py
import uuid
import time # NEU
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.chat_service import ChatService
from app.db.session import get_async_db
from app.schemas.chat_schemas import ChatRequest, ChatResponse, SourceDetail 

router = APIRouter(prefix="/chat", tags=["Chat (RAG)"])

@router.post("/", response_model=ChatResponse)
async def handle_chat_message(request_body: ChatRequest, db: AsyncSession = Depends(get_async_db)):
    request_received_time = time.time() # Zeitstempel: Request erhalten
    print(f"LOG_API_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] Request empfangen.")

    if not request_body.message.strip(): raise HTTPException(status_code=400, detail="Nachricht leer.")
    session_id = uuid.UUID(request_body.session_id) if request_body.session_id else uuid.uuid4()
    
    print(f"LOG_API_CHAT: Request Session {session_id}, Msg: '{request_body.message[:50]}...', RAG: {request_body.use_rag}")

    chat_service = ChatService()
    try:
        service_call_start_time = time.time()
        print(f"LOG_API_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] Rufe ChatService.process_chat_message auf...")
        service_result = await chat_service.process_chat_message(
            db, session_id, request_body.message, 
            request_body.num_sources, request_body.use_rag
        )
        service_call_end_time = time.time()
        print(f"LOG_API_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] ChatService.process_chat_message beendet. Dauer: {service_call_end_time - service_call_start_time:.2f}s")
        
        api_sources_pydantic_list: List[SourceDetail] = []
        retrieved_sources_from_service = service_result.get("retrieved_sources_for_context", [])
        if retrieved_sources_from_service:
            for source_dict in retrieved_sources_from_service:
                if source_dict.get("chunk_id") is None: continue 
                api_sources_pydantic_list.append(SourceDetail(**source_dict))
        
        response_object_creation_start_time = time.time()
        response = ChatResponse(
            session_id=str(session_id), 
            ai_message=service_result.get("ai_message", "Fehler: Keine Antwort erhalten."),
            retrieved_sources=api_sources_pydantic_list
        )
        response_object_creation_end_time = time.time()
        print(f"LOG_API_CHAT_TIMING: [{time.strftime('%H:%M:%S')}] ChatResponse Objekt erstellt. Dauer: {response_object_creation_end_time - response_object_creation_start_time:.2f}s")
        
        print(f"LOG_API_CHAT: Verarbeitung abgeschlossen. Sende Ergebnis.")
        return response
    except Exception as e:
        print(f"ERROR_API_CHAT: Unerwarteter Fehler im Endpunkt: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat Fehler: {str(e)}")