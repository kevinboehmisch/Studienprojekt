from fastapi import APIRouter
from app.models.llm import LLMRequest, LLMResponse
from app.services.llm_service import query_llm

router = APIRouter()

@router.post("/", response_model=LLMResponse)
def chat_with_llm(request: LLMRequest):
    response_text = query_llm(request)
    return LLMResponse(response=response_text)

@router.get("/get")
def get_chapters():
    return {"chapters": ["Introduction", "Methodology", "Conclusion"]}
