from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NoteCreate(BaseModel):
    question_id: int
    content: str


class NoteResponse(BaseModel):
    id: int
    question_id: int
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NoteWithQuestionResponse(NoteResponse):
    question_text: str


class NotePaginatedResponse(BaseModel):
    items: list[NoteWithQuestionResponse]
    total: int
