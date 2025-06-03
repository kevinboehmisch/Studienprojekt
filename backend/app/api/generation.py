# app/api/generation_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any, Optional # Dict, Any sind hier evtl. nicht mehr nötig
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.generation_service import GenerationService
from app.db.session import get_async_db
# Importiere die neuen Pydantic-Modelle für diesen Endpunkt
from app.schemas.generation_schemas import GenerateTextQuery, GeneratedTextResponse, SourceDetail

router = APIRouter(
    prefix="/generation",
    tags=["Text Generation (RAG)"],
)

@router.post("/generate-from-query", response_model=GeneratedTextResponse)
async def generate_text_from_sources_endpoint(
    request_body: GenerateTextQuery, # Verwendet das neue Request-Schema
    db: AsyncSession = Depends(get_async_db)
):
    """
    Nimmt eine Nutzeranfrage entgegen, findet relevante Quellen in der Datenbank
    und generiert basierend darauf einen neuen Text mit einem LLM.
    """
    if not request_body.query.strip():
        raise HTTPException(status_code=400, detail="Anfrage darf nicht leer sein.")

    generation_service = GenerationService()
    try:
        # Der Service gibt ein Dictionary zurück: {"generated_text": "...", "sources": [...]}
        # wobei die "sources" eine Liste von Dictionaries ist.
        service_result = await generation_service.generate_text_from_query(
            db=db,
            user_query=request_body.query,
            num_retrieved_chunks=request_body.num_sources
        )
        
        # Konvertiere die Dictionaries in der "sources"-Liste des Service-Ergebnisses
        # in Pydantic SourceDetail-Objekte für die API-Antwort.
        api_sources = []
        if service_result.get("sources"):
            for source_dict in service_result["sources"]:
                api_sources.append(SourceDetail(**source_dict))
        
        return GeneratedTextResponse(
            generated_text=service_result.get("generated_text"),
            sources=api_sources
        )
    except Exception as e:
        print(f"ERROR_API_GENERATE: Fehler bei Textgenerierung: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Fehler bei der Textgenerierung: {str(e)}")