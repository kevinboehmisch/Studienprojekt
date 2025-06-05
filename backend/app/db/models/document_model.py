# app/db/models/document_model.py
import uuid
from sqlalchemy import Column, String, Integer, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
from sqlalchemy.orm import relationship
from .base_class import Base 

class Document(Base):
    __tablename__ = "documents"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    original_filename = Column(String, index=True, nullable=False)
    processed_document_id = Column(String, unique=True, index=True, nullable=False)
    title = Column(String, nullable=True)
    author = Column(Text, nullable=True)
    publication_year = Column(Integer, nullable=True)
    additional_metadata = Column(JSONB, nullable=True) 

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(id='{self.id}', original_filename='{self.original_filename}')>"