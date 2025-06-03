# app/services/retrieval_service.py
import os
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.crud import crud_retrieval # Importiere die Suchfunktion
from .embedding_service import generate_embeddings # Importiere die Haupt-Embedding-Funktion

class RetrievalService:
    async def find_relevant_chunks(
        self, 
        db: AsyncSession, 
        query_text: str, 
        limit: int = 5,
        # Optional: Provider für Embeddings, falls nicht Default
        embedding_provider: str = os.getenv("EMBEDDING_SERVICE_PROVIDER", "google").lower() 
    ) -> List[Dict[str, Any]]:
        """
        Nimmt einen Suchtext, generiert ein Embedding dafür und findet die ähnlichsten Chunks.
        """
        print(f"LOG_RETRIEVAL_SERVICE: Suche relevante Chunks für Query: '{query_text[:50]}...'")
        
        # Query-Embedding generieren
        # Für Google ist "retrieval_query" oft besser für Suchanfragen
        query_embedding_list = generate_embeddings(
            [query_text], 
            provider=embedding_provider, 
            task_type="retrieval_query" if embedding_provider == "google" else "retrieval_document"
        )
        
        if not query_embedding_list or not query_embedding_list[0]:
            print("ERROR_RETRIEVAL_SERVICE: Konnte kein Query-Embedding generieren.")
            return []
        
        query_embedding = query_embedding_list[0]
        
        similar_chunks = await crud_retrieval.find_similar_chunks(
            db=db, 
            query_embedding=query_embedding, 
            limit=limit
        )
        return similar_chunks