from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserListResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserToggleActive(BaseModel):
    is_active: bool
