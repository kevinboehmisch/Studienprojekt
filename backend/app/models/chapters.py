from pydantic import BaseModel
from typing import List

class Chapter(BaseModel):
    id: int
    title: str
    content: str

class ChapterResponse(BaseModel):
    chapters: List[Chapter]
