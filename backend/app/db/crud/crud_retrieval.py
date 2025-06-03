# app/db/crud/crud_retrieval.py
import os
import uuid
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select 

from app.db.models import Chunk, Document 

EMBEDDING_DIM_FROM_ENV = int(os.getenv("EMBEDDING_DIMENSION", "768"))

async def find_similar_chunks(
    db: AsyncSession, 
    query_embedding: List[float], 
    limit: int = 5,
    document_id_filter: Optional[uuid.UUID] = None,
) -> List[Dict[str, Any]]:
    print(f"LOG_CRUD_RETRIEVAL: find_similar_chunks aufgerufen. Query-Embedding-Länge: {len(query_embedding) if query_embedding else 'None'}")
    if not query_embedding or len(query_embedding) != EMBEDDING_DIM_FROM_ENV:
        print(f"ERROR_CRUD_RETRIEVAL: Ungültiges Query-Embedding. Erw: {EMBEDDING_DIM_FROM_ENV}, Erh: {len(query_embedding) if query_embedding else 'None'}.")
        return []

    distance_calculation = Chunk.embedding.cosine_distance(query_embedding)
    
    stmt = (
        select(
            Chunk.id.label("chunk_db_id"), 
            Chunk.content.label("chunk_content"),
            Chunk.page_number,
            Chunk.char_count,
            Document.id.label("document_db_id"),
            Document.original_filename,
            Document.title.label("document_title"),
            Document.author.label("document_author"),
            Document.publication_year,
            distance_calculation.label("distance") 
        )
        .join(Document, Chunk.document_id == Document.id)
    )

    if document_id_filter:
        stmt = stmt.filter(Chunk.document_id == document_id_filter)
    
    stmt = stmt.order_by(distance_calculation.asc()).limit(limit)

    print(f"LOG_CRUD_RETRIEVAL: Führe Vektorsuche aus. SQL (ungefähr): {str(stmt)}") # Logge das SQL-Statement (ungefähr)
    try:
        result = await db.execute(stmt)
        similar_chunks_rows = result.mappings().all()
        
        results_as_dicts = []
        for i, row_mapping in enumerate(similar_chunks_rows):
            row_dict = dict(row_mapping) # Konvertiere RowMapping zu einem echten Dictionary
            print(f"  LOG_CRUD_RETRIEVAL_ROW_{i}: {row_dict}") # Logge jedes zurückgegebene Dictionary
            results_as_dicts.append(row_dict)

        print(f"LOG_CRUD_RETRIEVAL: {len(results_as_dicts)} ähnliche Chunks gefunden und als Dicts zurückgegeben.")
        return results_as_dicts
    except Exception as e:
        print(f"ERROR_CRUD_RETRIEVAL: Fehler bei Vektorsuche: {e}")
        import traceback; traceback.print_exc()
        return []