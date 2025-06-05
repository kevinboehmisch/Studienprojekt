# app/api/routes.py
from fastapi import APIRouter
from .pdf_processing import router as pdf_processing_router
from .retrieval import router as retrieval_router
from .generation import router as generation_router
from .chat import router as chat_router
from .simple_google_ai import router as simple_google_ai_router
from .online_search_router import router as online_search_router

api_router = APIRouter()

api_router.include_router(pdf_processing_router)
api_router.include_router(retrieval_router)
api_router.include_router(generation_router)
api_router.include_router(chat_router)
api_router.include_router(simple_google_ai_router)
api_router.include_router(online_search_router)
