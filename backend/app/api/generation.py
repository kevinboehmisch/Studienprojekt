# app/api/generation_endpoints.py
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.generation_service import GenerationService
from app.db.session import get_async_db
from app.schemas.generation_schemas import GenerateTextQuery, GeneratedTextResponse, SourceDetail

router = APIRouter(
    prefix="/generation",
    tags=["Text Generation (RAG)"],
)

@router.post("/generate-from-query", response_model=GeneratedTextResponse)
async def generate_text_from_sources_endpoint(
    request_body: GenerateTextQuery, # Verwendet das aktualisierte Request-Schema
    db: AsyncSession = Depends(get_async_db)
):
    """
    Nimmt einen Editor-Kontext und eine optionale Nutzeranweisung entgegen,
    findet relevante Quellen und generiert basierend darauf einen neuen Text.
    """

    query_for_retrieval = request_body.user_prompt
    if not query_for_retrieval or not query_for_retrieval.strip():
   
        if not request_body.editor_context_html.strip(): # Zumindest der Editor-Kontext sollte nicht leer sein
             raise HTTPException(status_code=400, detail="Editor-Kontext darf nicht leer sein.")

    generation_service = GenerationService()
    try:
        service_result = await generation_service.generate_text_with_context( # NEUER Methodenname im Service
            db=db,
            editor_context_html=request_body.editor_context_html,
            user_prompt=request_body.user_prompt, # Kann None sein
            num_retrieved_chunks=request_body.num_sources
        )

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