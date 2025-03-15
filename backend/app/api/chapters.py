from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_chapters():
    return {"chapters": ["Introduction", "Methodology", "Conclusion"]}
