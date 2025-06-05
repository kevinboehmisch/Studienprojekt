# app/schemas/generation_schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class GenerateTextQuery(BaseModel):
    """Request-Body für den Textgenerierungs-Endpunkt."""
    editor_context_html: str = Field(..., description="Der gesamte HTML-Inhalt des Editors als Kontext.")
    user_prompt: Optional[str] = Field(None, description="Die spezifische Anweisung oder Frage des Nutzers (optional).")
    num_sources: Optional[int] = Field(default=2, ge=1, le=10, description="Anzahl der zu berücksichtigenden Quellen.")

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