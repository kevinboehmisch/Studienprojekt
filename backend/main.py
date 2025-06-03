# main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.routes import api_router 
from app.db.session import create_db_tables # Sicherstellen, dass der Import korrekt ist

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("INFO_MAIN: Application startup... Calling create_db_tables().")
    await create_db_tables() 
    print("INFO_MAIN: Database tables checked/created.")
    yield
    print("INFO_MAIN: Application shutdown.")
    
    
app = FastAPI(
    title="Dokumenten-Extraktions-Backend",
    description="Extrahiert Inhalte aus PDFs für Analyse und zukünftige Vektor-DB Speicherung.",
    version="0.2.0", 
    lifespan=lifespan
)

@app.get("/", tags=["Root"])
async def root_welcome():
    """Zeigt an, dass das Backend läuft und verweist auf die API-Dokumentation."""
    return {
        "message": "Willkommen zum Dokumenten-Extraktions-Backend!",
        "api_docs_url": app.docs_url, 
        "api_base_path_example": "/pdf-processor/extract" 
    }


app.include_router(api_router)

