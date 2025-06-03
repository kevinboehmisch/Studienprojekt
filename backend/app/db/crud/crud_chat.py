# app/db/crud/crud_chat.py
import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.models import ChatSession, ChatMessage

async def get_or_create_chat_session(db: AsyncSession, session_id: uuid.UUID) -> ChatSession:
    result = await db.execute(
        select(ChatSession).filter(ChatSession.id == session_id)
    )
    chat_session = result.scalars().first()
    if not chat_session:
        chat_session = ChatSession(id=session_id)
        db.add(chat_session)
        await db.flush() 
        print(f"LOG_CRUD_CHAT: Neue Chat-Session erstellt: {session_id}")
    return chat_session

async def add_chat_message(db: AsyncSession, session_id: uuid.UUID, sender_type: str, content: str) -> ChatMessage:
    message = ChatMessage(session_id=session_id, sender_type=sender_type, content=content)
    db.add(message)
    await db.flush() 
    return message

async def get_chat_history(db: AsyncSession, session_id: uuid.UUID, limit: int = 10) -> List[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc()) 
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = result.scalars().all()
    return list(reversed(messages)) 