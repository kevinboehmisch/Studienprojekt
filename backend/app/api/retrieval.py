# app/api/retrieval_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.retrieval_service import RetrievalService
from app.db.session import get_async_db
from app.schemas.processing_schemas import RetrievedChunk
from pydantic import BaseModel

router = APIRouter(
    prefix="/retrieval",
    tags=["Content Retrieval & RAG"],
)


@router.post("/find-similar", response_model=List[RetrievedChunk])
async def find_similar_content(
    query: str = Query(..., min_length=3, description="Der Suchtext oder die Frage."),
    limit: int = Query(5, ge=1, le=20, description="Maximale Anzahl zurückgegebener Chunks."),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Nimmt einen Suchtext entgegen, findet die semantisch ähnlichsten Text-Chunks
    aus der Datenbank und gibt sie zusammen mit ihren Quelleninformationen zurück.
    """
    if not query.strip():
        raise HTTPException(status_code=400, detail="Suchanfrage darf nicht leer sein.")

    retrieval_service = RetrievalService()
    try:
        similar_chunks_data = await retrieval_service.find_relevant_chunks(
            db=db, 
            query_text=query, 
            limit=limit
        )
        
        # Konvertiere die Dictionaries vom Service in Pydantic-Modelle für die Antwort
        response_data = []
        for chunk_data in similar_chunks_data:
            response_data.append(RetrievedChunk(
                chunk_content=chunk_data.get("chunk_content", ""),
                page_number=chunk_data.get("page_number"),
                document_title=chunk_data.get("document_title"),
                document_author=chunk_data.get("document_author"),
                original_filename=chunk_data.get("original_filename"),
                publication_year=chunk_data.get("publication_year"),
                distance=chunk_data.get("distance")
            ))
        return response_data

    except Exception as e:
        print(f"ERROR_API_RETRIEVAL: Fehler bei Ähnlichkeitssuche: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Fehler bei der Ähnlichkeitssuche: {str(e)}")