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
    quota_id: Optional[int] = None
    university: Optional[str] = None
    study_year: Optional[int] = None

    class Config:
        from_attributes = True


class UserToggleActive(BaseModel):
    is_active: bool


class UserAssignQuota(BaseModel):
    quota_id: Optional[int] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    university: Optional[str] = None
    study_year: Optional[int] = None
    is_anonymous: Optional[bool] = None


class ProfileResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    is_active: bool
    university: Optional[str] = None
    study_year: Optional[int] = None
    current_streak: int = 0
    is_anonymous: bool = False

    class Config:
        from_attributes = True
