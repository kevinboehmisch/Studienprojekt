# app/schemas/online_search_schemas.py
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class ArxivSearchRequest(BaseModel):
    context_text: Optional[str] = None
    user_prompt: Optional[str] = None
    num_results: int = Field(10, ge=1, le=30, description="Number of results to fetch from arXiv (max 30).")
    # Optional: model_name und temperature, falls du das pro Request steuern willst
    # llm_model_name: Optional[str] = None
    # llm_temperature: Optional[float] = None


class ArxivPaperResult(BaseModel):
    arxiv_id: str
    title: str
    authors: List[str]
    published_date: str
    updated_date: str
    abstract_summary_llm: str
    full_abstract: str
    pdf_url: str
    arxiv_page_url: str
    primary_category: Optional[str] = None

class ArxivSearchResponse(BaseModel):
    results: List[ArxivPaperResult]
    message: Optional[str] = None
    
    
class ImportFromUrlRequest(BaseModel):
    pdf_url: str = Field(..., description="Die direkte URL zur PDF-Datei.")
    # Metadaten, die direkt von arXiv kommen und wir nutzen wollen:
    original_filename: str # Kann z.B. arxiv_id.pdf oder ein abgeleiteter Name sein
    title: Optional[str] = None
    authors: Optional[List[str]] = None # arXiv liefert eine Liste, dein DB-Modell hat Text
    publication_year: Optional[int] = None
    arxiv_id: Optional[str] = None # Nützlich für die processed_document_id
    
# NEU: Request-Schema für Batch-Import
class BatchImportFromUrlRequest(BaseModel):
    papers: List[ImportFromUrlRequest] = Field(..., min_items=1, description="Liste der zu importierenden Paper.")

# NEU: Schema für das Ergebnis eines einzelnen Imports im Batch
class BatchImportResultItem(BaseModel):
    original_filename: str
    arxiv_id: Optional[str] = None
    status: Literal["success", "error"]
    message: str
    processed_document_id: Optional[str] = None # Von PdfProcessingResult.metadata
    # document_db_id: Optional[uuid.UUID] = None # Falls du die DB ID auch zurückgeben willst

# NEU: Response-Schema für Batch-Import
class BatchImportFromUrlResponse(BaseModel):
    results: List[BatchImportResultItem]