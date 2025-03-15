from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_chapters():
    return {"documents": ["Introduction", "Methodology", "Conclusion"]}
