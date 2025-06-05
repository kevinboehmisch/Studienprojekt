# app/schemas/document_schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime # Für Timestamps, falls du sie später hinzufügst

class DocumentBase(BaseModel):
    original_filename: str
    title: Optional[str] = None
    author: Optional[str] = None # Im DB Model ist es Text, hier als str
    publication_year: Optional[int] = None
    processed_document_id: str # Hinzugefügt, da es nützlich sein kann

class DocumentDisplay(DocumentBase):
    id: uuid.UUID
    # Du könntest hier noch Timestamps oder die Anzahl der Chunks hinzufügen
    # created_at: datetime # Beispiel
    # chunk_count: int # Beispiel

    class Config:
        orm_mode = True # Erlaube Pydantic, von ORM-Objekten zu lesen