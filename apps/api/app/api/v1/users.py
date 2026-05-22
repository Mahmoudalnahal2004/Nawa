from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.models.user import User
from app.schemas.user import UserListResponse, UserToggleActive, ProfileUpdate, ProfileResponse
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


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user: User = Depends(get_current_active_user)):
    """Return the current authenticated user's profile."""
    return ProfileResponse.model_validate(user)


@router.patch("/me/profile", response_model=ProfileResponse)
async def update_my_profile(
    data: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Update the current user's profile (full_name, university, study_year)."""
    updated = await user_service.update_profile(db, user.id, data.full_name, data.university, data.study_year, data.is_anonymous)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return ProfileResponse.model_validate(updated)
