# app/api/pdf_processing.py
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status, Path
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession # NEU: Import für DB-Session
import uuid
from app.services.pdf_processing_service import PdfProcessingService
from app.dependencies import get_marker_resources 
from app.schemas.processing_schemas import PdfProcessingResult
from app.db.session import get_async_db # NEU: Importiere die DB-Session Dependency
from app.db.crud import crud_document # Importiere die neuen CRUD-Funktionen
from app.schemas.document_schemas import DocumentDisplay
from app.schemas.online_search_schemas import ImportFromUrlRequest, BatchImportFromUrlResponse, BatchImportFromUrlRequest


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
    
    
@router.get("/documents", response_model=List[DocumentDisplay])
async def read_documents(
    skip: int = 0,
    limit: int = 20, # Default-Limit etwas niedriger für Listenansichten
    db: AsyncSession = Depends(get_async_db)
):
    """
    Ruft eine Liste aller verarbeiteten Dokumente ab.
    """
    documents = await crud_document.get_documents(db, skip=skip, limit=limit)
    return documents

# NEUER Endpunkt: Ein spezifisches Dokument abrufen
@router.get("/documents/{document_id}", response_model=DocumentDisplay)
async def read_document(
    document_id: uuid.UUID = Path(..., description="Die ID des abzurufenden Dokuments"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Ruft ein spezifisches Dokument anhand seiner ID ab.
    """
    db_document = await crud_document.get_document(db, document_id=document_id)
    if db_document is None:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return db_document

# NEUER Endpunkt: Ein Dokument löschen
@router.delete("/documents/{document_id}", response_model=DocumentDisplay) # Gibt das gelöschte Dokument zurück
async def delete_document_endpoint( # Name geändert, um Konflikt zu vermeiden, falls du delete_document importierst
    document_id: uuid.UUID = Path(..., description="Die ID des zu löschenden Dokuments"),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Löscht ein spezifisches Dokument anhand seiner ID.
    Die zugehörigen Chunks werden durch die Cascade-Beziehung in der DB ebenfalls gelöscht.
    """
    deleted_document = await crud_document.delete_document(db, document_id=document_id)
    if deleted_document is None:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    
    await db.commit() # Wichtig: Commit nach der Löschoperation
    print(f"LOG_API: Dokument mit ID {document_id} erfolgreich gelöscht.")
    return deleted_document


@router.post("/import-from-url", response_model=PdfProcessingResult, status_code=status.HTTP_201_CREATED)
async def import_pdf_from_url_endpoint(
    request_data: ImportFromUrlRequest,
    marker_res: Dict[str, Any] = Depends(get_marker_resources), # Brauchen wir immer noch für den Service
    db: AsyncSession = Depends(get_async_db)
):
    """
    Nimmt eine PDF-URL und zugehörige Metadaten entgegen, lädt die PDF serverseitig herunter,
    verarbeitet sie und speichert sie in der Datenbank.
    """
    print(f"API_LOG: Empfange Import-Anfrage für URL: {request_data.pdf_url}")
    
    service_config = marker_res.get("config", {})
    artifact_dict = marker_res.get("artifact_dict", {})
    service = PdfProcessingService(artifact_dict=artifact_dict, config=service_config)

    try:
        processing_output = await service.import_pdf_from_url_and_store(
            db=db,
            request_data=request_data
        )
        print(f"API_LOG: Import und Verarbeitung für URL '{request_data.pdf_url}' abgeschlossen.")
        return processing_output
    except ValueError as ve: # Spezifische Fehler vom Service (z.B. Download-Fehler)
        print(f"API_ERROR: Validierungs- oder Logikfehler beim Import von URL '{request_data.pdf_url}': {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"API_ERROR: Unerwarteter Serverfehler beim Import von URL '{request_data.pdf_url}': {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ein interner Serverfehler ist beim Import von URL aufgetreten: {str(e)}"
        )
        
        
@router.post("/batch-import-from-urls", response_model=BatchImportFromUrlResponse, status_code=status.HTTP_200_OK)
async def batch_import_pdfs_from_urls_endpoint(
    request_data: BatchImportFromUrlRequest,
    marker_res: Dict[str, Any] = Depends(get_marker_resources),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Nimmt eine Liste von PDF-URLs und zugehörigen Metadaten entgegen,
    lädt die PDFs serverseitig herunter, verarbeitet sie und speichert sie in der Datenbank.
    Gibt den Status für jedes versuchte Paper zurück.
    """
    print(f"API_LOG: Empfange Batch-Import-Anfrage für {len(request_data.papers)} Paper.")
    
    service_config = marker_res.get("config", {})
    artifact_dict = marker_res.get("artifact_dict", {})
    service = PdfProcessingService(artifact_dict=artifact_dict, config=service_config)

    try:
        batch_processing_results = await service.batch_import_pdfs_from_urls(
            db=db,
            papers_to_import=request_data.papers
        )
        print(f"API_LOG: Batch-Import und Verarbeitung abgeschlossen.")
        return BatchImportFromUrlResponse(results=batch_processing_results)
    except Exception as e: # Fängt allgemeine Fehler im Batch-Prozess ab (sollte selten sein, da Fehler pro Item gehandhabt werden)
        print(f"API_ERROR: Unerwarteter Serverfehler beim Batch-Import: {e}")
        import traceback
        traceback.print_exc()
        # Du könntest hier auch eine Liste von Fehlern zurückgeben, wenn der ganze Batch fehlschlägt
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ein interner Serverfehler ist beim Batch-Import aufgetreten: {str(e)}"
        )