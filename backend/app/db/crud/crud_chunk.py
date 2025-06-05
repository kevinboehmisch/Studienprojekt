# app/db/crud/crud_chunk.py
import os
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.models import Chunk # SQLAlchemy Chunk-Modell
from app.schemas.processing_schemas import TextChunk as TextChunkSchema # Pydantic TextChunk Schema

async def create_chunks(db: AsyncSession, *, # Stern erzwingt Keyword-Argumente
                        document_id: uuid.UUID, 
                        chunks_data: List[TextChunkSchema], # Liste von Pydantic-Objekten
                        embeddings: Optional[List[List[float]]] = None
                        ) -> List[Chunk]:
    """Erstellt mehrere Chunk-Einträge für ein gegebenes Dokument."""
    db_chunks_to_create: List[Chunk] = []
    embedding_dim_from_env = int(os.getenv("EMBEDDING_DIMENSION", "768")) # Für Dummy-Embeddings

    for i, p_chunk_schema in enumerate(chunks_data):
        embedding_vector = None
        if embeddings and i < len(embeddings) and embeddings[i] is not None:
            if len(embeddings[i]) == embedding_dim_from_env:
                embedding_vector = embeddings[i]
            else:
                print(f"WARN_CRUD_CHUNK: Embedding-Dimension für Chunk {i} ({len(embeddings[i])}) passt nicht zu DB-Schema ({embedding_dim_from_env}). Setze auf None/Dummy.")
                # Optional: Dummy-Embedding mit korrekter Dimension erstellen
                # embedding_vector = [0.0] * embedding_dim_from_env 
        
        db_chunk = Chunk(
            document_id=document_id,
            content=p_chunk_schema.content,
            page_number=p_chunk_schema.page_number,
            char_count=p_chunk_schema.char_count,
            embedding=embedding_vector # Kann None sein, wenn Embedding fehlgeschlagen oder falsche Dimension
        )
        db_chunks_to_create.append(db_chunk)
    
    if db_chunks_to_create:
        db.add_all(db_chunks_to_create)
        # Das Commit sollte idealerweise vom aufrufenden Service oder der API-Route
        # am Ende einer Transaktion gehandhabt werden.
        # await db.commit() # Vorerst kein Commit hier
        await db.flush() # Um IDs zu bekommen, falls die DB sie generiert (hier UUIDs clientseitig)
        # Refresh für eine Liste ist etwas umständlicher, oft nicht nötig, wenn man nur speichert.
    return db_chunks_to_create

async def get_chunks_by_document_id(db: AsyncSession, document_id: uuid.UUID) -> List[Chunk]:
    """Ruft alle Chunks für ein gegebenes Dokument ab."""
    result = await db.execute(
        select(Chunk).filter(Chunk.document_id == document_id).order_by(Chunk.page_number, Chunk.id) # Sortiere für Konsistenz
    )
    return result.scalars().all()

# Die Funktion find_similar_chunks bleibt in crud_retrieval.py, da sie eine spezifische Suchlogik ist.