# app/schemas/processing_schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

# Schemas für die Verarbeitung von PDF-Dokumenten, welche Text und Bilder extrahieren und strukturieren
class ImageInfo(BaseModel):
    filename: str
    content_type: Optional[str] = None
    file_path: Optional[str] = None


class TextChunk(BaseModel):
    content: str
    page_number: Optional[int] = None 
    char_count: Optional[int] = None


class PdfProcessingResult(BaseModel):
    text_chunks: List[TextChunk]
    images: List[ImageInfo]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    debug_message: Optional[str] = None
    
    
# Pydantic Modell für die Antwort des Retrieval-Endpunkts
class RetrievedChunk(BaseModel):
    chunk_content: str
    page_number: Optional[int] = None
    document_title: Optional[str] = None
    document_author: Optional[str] = None
    original_filename: Optional[str] = None
    distance: Optional[float] = None 
    publication_year: Optional[int] = None
