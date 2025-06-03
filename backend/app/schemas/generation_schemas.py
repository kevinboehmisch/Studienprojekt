# app/schemas/generation_schemas.py
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class GenerateTextQuery(BaseModel):
    """Request-Body für den Textgenerierungs-Endpunkt."""
    query: str
    num_sources: Optional[int] = 3

class SourceDetail(BaseModel):
    """Detaillierte Informationen zu einer Quelle, die für die Generierung/Retrieval verwendet wurde."""
    chunk_id: str 
    filename: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    year: Optional[int] = None 
    page: Optional[int] = None 
    content_preview: Optional[str] = None
    distance: Optional[float] = None 

class GeneratedTextResponse(BaseModel):
    """Response-Body für den Textgenerierungs-Endpunkt."""
    generated_text: Optional[str]
    sources: List[SourceDetail] 