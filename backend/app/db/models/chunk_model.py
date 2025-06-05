# app/db/models/chunk_model.py
import os
import uuid
from sqlalchemy import Column, Integer, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship
from .base_class import Base

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIMENSION", "768")) 

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(PG_UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True) # Index für FK ist gut
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)
    document = relationship("Document", back_populates="chunks")

    __table_args__ = (
        Index(
            f'idx_chunk_embedding_hnsw_{EMBEDDING_DIM}', 
            embedding, 
            postgresql_using='hnsw', 
            postgresql_ops={'embedding': 'vector_cosine_ops'} 

        ),
        Index('idx_chunk_document_page', 'document_id', 'page_number'), 
    )

    def __repr__(self):
        return f"<Chunk(id='{self.id}', page='{self.page_number}', doc_id='{self.document_id}')>"