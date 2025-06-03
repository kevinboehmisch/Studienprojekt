# app/services/retrieval_service.py
import os
import time # NEU
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.crud import crud_retrieval # Importiere die Suchfunktion
from .embedding_service import generate_embeddings # Importiere die Haupt-Embedding-Funktion

class RetrievalService:
     async def find_relevant_chunks(
        self, db: AsyncSession, query_text: str, limit: int = 5,
        embedding_provider: str = os.getenv("EMBEDDING_SERVICE_PROVIDER", "google").lower() 
    ) -> List[Dict[str, Any]]:
        service_method_start_time = time.time()
        print(f"LOG_RETRIEVAL_TIMING: [{time.strftime('%H:%M:%S')}] find_relevant_chunks gestartet für Query: '{query_text[:50]}...'")
        
        embedding_start_time = time.time()
        query_embedding_list = generate_embeddings(
            [query_text], provider=embedding_provider, 
            task_type="retrieval_query" if embedding_provider == "google" else "retrieval_document"
        )
        print(f"LOG_RETRIEVAL_TIMING: [{time.strftime('%H:%M:%S')}] Query-Embedding generiert. Dauer: {time.time() - embedding_start_time:.2f}s")
        
        if not query_embedding_list or not query_embedding_list[0]:
            print("ERROR_RETRIEVAL_SERVICE: Konnte kein Query-Embedding generieren.")
            return []
        query_embedding = query_embedding_list[0]
        
        db_call_start_time = time.time()
        print(f"LOG_RETRIEVAL_TIMING: [{time.strftime('%H:%M:%S')}] Rufe crud_retrieval.find_similar_chunks auf...")
        similar_chunks = await crud_retrieval.find_similar_chunks(
            db=db, query_embedding=query_embedding, limit=limit
        )
        print(f"LOG_RETRIEVAL_TIMING: [{time.strftime('%H:%M:%S')}] crud_retrieval.find_similar_chunks beendet. Dauer: {time.time() - db_call_start_time:.2f}s. Chunks: {len(similar_chunks)}")
        
        print(f"LOG_RETRIEVAL_TIMING: [{time.strftime('%H:%M:%S')}] find_relevant_chunks beendet. Gesamtdauer: {time.time() - service_method_start_time:.2f}s")
        return similar_chunks