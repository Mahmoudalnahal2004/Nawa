from pydantic import BaseModel
from typing import List, Optional
from app.schemas.category import CategoryResponse

class QuotaBase(BaseModel):
    name: str
    description: Optional[str] = None

class QuotaCreate(QuotaBase):
    category_ids: List[int] = []
    color: Optional[str] = "#10b981"

class QuotaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_ids: Optional[List[int]] = None
    color: Optional[str] = None

class QuotaResponse(QuotaBase):
    id: int
    is_default: bool
    color: Optional[str] = "#10b981"
    categories: List[CategoryResponse] = []
    student_count: int = 0

    class Config:
        from_attributes = True
