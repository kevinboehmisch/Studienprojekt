# app/api/pdf_processing.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession # NEU: Import für DB-Session

from app.services.pdf_processing_service import PdfProcessingService
from app.dependencies import get_marker_resources 
from app.schemas.processing_schemas import PdfProcessingResult
from app.db.session import get_async_db # NEU: Importiere die DB-Session Dependency

# Router für PDF-Verarbeitungs-Endpunkte
router = APIRouter(
    prefix="/pdf-processor", 
    tags=["PDF Content Extraction & Storage"], 
)


@router.post("/extract-and-store", response_model=PdfProcessingResult) 
async def extract_and_store_content_from_pdf( # Name der Funktion ggf. auch anpassen
    uploaded_file: UploadFile = File(..., description="Die hochzuladende PDF-Datei."),
    marker_res: Dict[str, Any] = Depends(get_marker_resources),
    db: AsyncSession = Depends(get_async_db) # NEU: DB-Session als Dependency injizieren
):
    """
    Nimmt eine PDF entgegen, extrahiert Inhalte, speichert Dokument-Metadaten
    und gechunkte Texte mit Embeddings in der Datenbank und gibt das Ergebnis zurück.
    """
    if not uploaded_file.content_type == "application/pdf":
        print(f"WARN_API: Ungültiger Dateityp: {uploaded_file.content_type} für {uploaded_file.filename}")
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Ungültiger Dateityp. Es werden nur PDF-Dateien unterstützt."
        )

    print(f"LOG_API: Empfange PDF für Verarbeitung und Speicherung: {uploaded_file.filename}")
    
    try:
        pdf_content_bytes = await uploaded_file.read()
    except Exception as e:
        print(f"ERROR_API: Fehler beim Lesen der Datei '{uploaded_file.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Datei konnte nicht gelesen werden.")
    finally:
        await uploaded_file.close() 

    # Service-Instanz mit den gecachten Marker-Ressourcen erstellen
    # Die `config` kommt jetzt direkt von `marker_res`
    service_config = marker_res.get("config", {}) # Standardmäßig leeres Dict, falls nicht vorhanden
    artifact_dict = marker_res.get("artifact_dict", {})

    service = PdfProcessingService(
        artifact_dict=artifact_dict,
        config=service_config 
    )

    try:
        # Rufe die neue asynchrone Service-Methode auf, die auch in die DB speichert
        processing_output = await service.process_pdf_data_and_store( # await, da die Methode jetzt async ist
            db=db,                                      # Übergebe die DB-Session
            pdf_bytes=pdf_content_bytes, 
            original_doc_filename=uploaded_file.filename
        )
        
        print(f"LOG_API: Verarbeitung und Speicherung für '{uploaded_file.filename}' abgeschlossen. Sende Ergebnis.")
        return processing_output
    except ValueError as ve: # Fange spezifische Fehler vom Service ab
        print(f"ERROR_API: Validierungs- oder Logikfehler vom Service für '{uploaded_file.filename}': {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e: # Fange alle anderen unerwarteten Fehler ab
        print(f"ERROR_API: Unerwarteter Serverfehler bei Verarbeitung von '{uploaded_file.filename}': {e}")
        import traceback
        traceback.print_exc() # Logge den vollen Traceback für Debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ein interner Serverfehler ist aufgetreten: {str(e)}")