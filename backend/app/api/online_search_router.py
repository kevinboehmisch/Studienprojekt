# app/api/routers/online_search_router.py
from fastapi import APIRouter, HTTPException, status, Body
from typing import List

from app.schemas.online_search_schemas import ArxivSearchRequest, ArxivSearchResponse, ArxivPaperResult
from app.services.online_search_service import search_arxiv_service # Angepasster Service-Name

router = APIRouter(
    prefix="/online-search", # Bleibt gleich
    tags=["Online Search"],  # Bleibt gleich
)

@router.post("/arxiv", response_model=ArxivSearchResponse)
async def perform_arxiv_search_endpoint( # Endpunkt-Funktionsname leicht geändert zur Klarheit
    request_data: ArxivSearchRequest = Body(...)
):
    if not request_data.context_text and not request_data.user_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entweder 'context_text' oder 'user_prompt' muss angegeben werden."
        )
    
    print(f"API_LOG: Empfange arXiv Suchanfrage: context_len={len(request_data.context_text or '')}, prompt_len={len(request_data.user_prompt or '')}, num_results={request_data.num_results}")
    
    try:
        results: List[ArxivPaperResult] = await search_arxiv_service(request_data) # Service aufrufen
        
        if not results:
            print(f"API_LOG: Keine Ergebnisse von search_arxiv_service für Anfrage.")
            return ArxivSearchResponse(results=[], message="Keine Ergebnisse für die Anfrage gefunden oder Fehler bei der Verarbeitung.")
        
        print(f"API_LOG: Sende {len(results)} Ergebnisse an Client.")
        return ArxivSearchResponse(results=results, message=f"{len(results)} Ergebnisse gefunden.")
    
    except HTTPException as http_exc: # Bereits geworfene HTTPExceptions weiterleiten
        raise http_exc
    except Exception as e:
        print(f"API_ERROR: Unerwarteter Fehler bei der arXiv-Suche: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ein interner Serverfehler ist aufgetreten: {str(e)}"
        )