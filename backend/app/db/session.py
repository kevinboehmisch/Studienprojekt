# app/db/session.py
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text 
from dotenv import load_dotenv
from app.db.models import Base 


load_dotenv()


SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG_DB_SESSION: Geladene DATABASE_URL: {SQLALCHEMY_DATABASE_URL}")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL ist nicht in der .env Datei gesetzt!")

async_engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL, 
    echo=False, # True für SQL-Logging, wenn es gebraucht wird
    pool_pre_ping=True,
    pool_recycle=1800, 
)

AsyncSessionLocal = sessionmaker(
    bind=async_engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autocommit=False, 
    autoflush=False
)

async def get_async_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

async def create_db_tables():
    print("INFO_DB: Versuche Tabellen zu erstellen...")
    async with async_engine.begin() as conn:
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            print("INFO_DB: pgvector Erweiterung geprüft/erstellt.")
        except Exception as e:
            print(f"HINWEIS_DB: pgvector (existiert evtl. schon): {e}")
            
        await conn.run_sync(Base.metadata.create_all)
        print("INFO_DB: Tabellenerstellung (Base.metadata.create_all) abgeschlossen.")