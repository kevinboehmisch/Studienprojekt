# app/schemas/metadata_extraction_schemas.py
from pydantic import BaseModel
from typing import List, Optional

# Metadata Extrakion Schemas für die PDF Dokumente
class ExtractedDocumentMetadata(BaseModel):
    title: Optional[str] = None
    authors: Optional[List[str]] = None
    abstract: Optional[str] = None
    keywords: Optional[List[str]] = None
