from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    icon: Optional[str] = "📚"
    parent_id: Optional[int] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[int] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: str
    icon: str
    parent_id: Optional[int]
    created_at: datetime
    question_count: Optional[int] = 0

    class Config:
        from_attributes = True


class CategoryTreeResponse(CategoryResponse):
    children: List["CategoryTreeResponse"] = []

    class Config:
        from_attributes = True
