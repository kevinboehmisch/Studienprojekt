# app/schemas/chat_schemas.py
from pydantic import BaseModel
from typing import List, Optional 

# Importiere SourceDetail, da ChatResponse es verwendet
from .generation_schemas import SourceDetail 

class ChatRequest(BaseModel):
    """Request-Body für den Chat-Endpunkt."""
    session_id: Optional[str] = None
    message: str
    num_sources: Optional[int] = 3
    use_rag: Optional[bool] = True

class ChatResponse(BaseModel):
    """Response-Body für den Chat-Endpunkt."""
    session_id: str
    ai_message: str
    retrieved_sources: List[SourceDetail] 