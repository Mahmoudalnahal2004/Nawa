from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.deps import get_db, RoleChecker
from app.models.user import User
from app.schemas.user import UserListResponse, UserToggleActive
from app.services import user_service

router = APIRouter(prefix="/users", tags=["User Management"])

admin_only = RoleChecker(["admin"])


@router.get("", response_model=List[UserListResponse], dependencies=[Depends(admin_only)])
async def list_students(db: AsyncSession = Depends(get_db)):
    students = await user_service.list_students(db)
    return [UserListResponse.model_validate(s) for s in students]


@router.patch("/{user_id}/activate", response_model=UserListResponse, dependencies=[Depends(admin_only)])
async def toggle_activation(user_id: int, data: UserToggleActive, db: AsyncSession = Depends(get_db)):
    user = await user_service.toggle_user_active(db, user_id, data.is_active)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserListResponse.model_validate(user)
