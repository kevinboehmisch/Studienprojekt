# app/db/crud/crud_document.py
import uuid
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload # Für Eager Loading von Relationships, falls später benötigt

from app.db.models import Document # Importiere dein SQLAlchemy Document-Modell

async def get_document_by_id(db: AsyncSession, document_id: uuid.UUID) -> Optional[Document]:
    """Ruft ein Dokument anhand seiner UUID ab."""
    result = await db.execute(select(Document).filter(Document.id == document_id))
    return result.scalars().first()

async def get_document_by_processed_id(db: AsyncSession, processed_document_id: str) -> Optional[Document]:
    """Ruft ein Dokument anhand seiner processed_document_id ab."""
    result = await db.execute(
        select(Document).filter(Document.processed_document_id == processed_document_id)
    )
    return result.scalars().first()

async def create_document(db: AsyncSession, *, # Stern erzwingt Keyword-Argumente
                          original_filename: str, 
                          processed_document_id: str,
                          title: Optional[str] = None, 
                          author: Optional[str] = None, 
                          publication_year: Optional[int] = None,
                          additional_metadata: Optional[Dict[str, Any]] = None
                          ) -> Document:
    """Erstellt einen neuen Dokument-Eintrag in der Datenbank."""
    db_document = Document(
        original_filename=original_filename,
        processed_document_id=processed_document_id,
        title=title,
        author=author,
        publication_year=publication_year,
        additional_metadata=additional_metadata
    )
    db.add(db_document)
    # Das Commit sollte idealerweise vom aufrufenden Service oder der API-Route
    # am Ende einer Transaktion gehandhabt werden, wenn mehrere Operationen beteiligt sind.
    # Für einzelne Create-Operationen ist ein Commit hier oft okay, aber für
    # das Speichern von Dokument + Chunks machen wir den Commit im Service.
    # await db.commit() # Vorerst kein Commit hier, wird im Service gemacht
    await db.flush() # Um die ID und andere DB-generierte Werte zu bekommen
    await db.refresh(db_document) # Um das Objekt mit allen Werten aus der DB zu aktualisieren
    return db_document

# Weitere Funktionen könnten sein:
# async def update_document(db: AsyncSession, ...) -> Optional[Document]: ...
# async def delete_document(db: AsyncSession, document_id: uuid.UUID) -> bool: ...