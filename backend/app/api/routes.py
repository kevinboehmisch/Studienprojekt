from fastapi import APIRouter
from app.api import chapters, documents

router = APIRouter()

router.include_router(chapters.router, prefix="/chapters", tags=["Chapters"])
router.include_router(documents.router, prefix="/documents", tags=["Documents"])
