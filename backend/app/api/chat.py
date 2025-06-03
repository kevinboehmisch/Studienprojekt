# app/api/chat_endpoints.py
import uuid
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional # Dict, Any hier nicht mehr zwingend nötig
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.chat_service import ChatService
from app.db.session import get_async_db
from app.schemas.chat_schemas import ChatRequest, ChatResponse, SourceDetail 

router = APIRouter(prefix="/chat", tags=["Chat (RAG)"])

@router.post("/", response_model=ChatResponse)
async def handle_chat_message(request_body: ChatRequest, db: AsyncSession = Depends(get_async_db)):
    if not request_body.message.strip(): raise HTTPException(status_code=400, detail="Nachricht leer.")
    session_id = uuid.UUID(request_body.session_id) if request_body.session_id else uuid.uuid4()
    print(f"LOG_API_CHAT: Request Session {session_id}, Msg: '{request_body.message[:50]}...', RAG: {request_body.use_rag}")
    
    service = ChatService()
    try:
        service_result = await service.process_chat_message(
            db, session_id, request_body.message, 
            request_body.num_sources, request_body.use_rag
        )
        
        api_sources_pydantic_list: List[SourceDetail] = []
        retrieved_sources_from_service = service_result.get("retrieved_sources_for_context", [])
        print(f"LOG_API_CHAT: retrieved_sources_from_service (Anzahl: {len(retrieved_sources_from_service)}): {retrieved_sources_from_service[:2]}") # Logge die ersten beiden

        if retrieved_sources_from_service:
            for i, source_dict in enumerate(retrieved_sources_from_service):
                try:
                    # Stelle sicher, dass alle erwarteten Felder für SourceDetail vorhanden sind oder Defaults haben
                    # Pydantic wird Fehler werfen, wenn ein _nicht-optionales_ Feld fehlt und keinen Default hat
                    # chunk_id ist in SourceDetail NICHT optional
                    if source_dict.get("chunk_id") is None:
                        print(f"ERROR_API_CHAT: Fehlende 'chunk_id' in source_dict Index {i}: {source_dict}")
                        # Überspringe diesen Eintrag oder behandle den Fehler anders
                        continue 
                    
                    api_sources_pydantic_list.append(SourceDetail(**source_dict))
                except Exception as e_pydantic: # Fange Pydantic Validierungsfehler oder andere hier
                    print(f"ERROR_API_CHAT: Fehler beim Erstellen von SourceDetail für source_dict Index {i}: {source_dict}")
                    print(f"  Pydantic-Fehler: {e_pydantic}")
                    # import traceback; traceback.print_exc() # Für vollen Traceback des Pydantic-Fehlers
                    # Fahre fort, aber logge den Fehler
        
        return ChatResponse(
            session_id=str(session_id), 
            ai_message=service_result.get("ai_message", "Fehler: Keine Antwort erhalten."),
            retrieved_sources=api_sources_pydantic_list # Gib die Liste der Pydantic-Objekte zurück
        )
    except Exception as e:
        print(f"ERROR_API_CHAT: Unerwarteter Fehler im Endpunkt: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Chat Fehler: {str(e)}")