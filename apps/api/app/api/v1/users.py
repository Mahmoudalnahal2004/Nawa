from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.models.user import User
from app.schemas.user import UserListResponse, UserToggleActive, ProfileUpdate, ProfileResponse, ChangePasswordRequest, UserAssignQuota
from app.services import user_service

router = APIRouter(prefix="/users", tags=["User Management"])

admin_only = RoleChecker(["admin"])


@router.get("", response_model=List[UserListResponse], dependencies=[Depends(admin_only)])
async def list_all_users(db: AsyncSession = Depends(get_db)):
    users = await user_service.list_all_users(db)
    return [UserListResponse.model_validate(u) for u in users]


@router.patch("/{user_id}/activate", response_model=UserListResponse, dependencies=[Depends(admin_only)])
async def toggle_activation(user_id: int, data: UserToggleActive, db: AsyncSession = Depends(get_db)):
    user = await user_service.toggle_user_active(db, user_id, data.is_active)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserListResponse.model_validate(user)


@router.patch("/{user_id}/quota", response_model=UserListResponse, dependencies=[Depends(admin_only)])
async def assign_user_quota(user_id: int, data: UserAssignQuota, db: AsyncSession = Depends(get_db)):
    user = await user_service.assign_quota(db, user_id, data.quota_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserListResponse.model_validate(user)


@router.patch("/{user_id}/promote", response_model=UserListResponse, dependencies=[Depends(admin_only)])
async def promote_to_admin(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await user_service.promote_to_admin(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserListResponse.model_validate(user)


@router.patch("/{user_id}/demote", response_model=UserListResponse, dependencies=[Depends(admin_only)])
async def demote_from_admin(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await user_service.demote_from_admin(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote user or user not found")
    return UserListResponse.model_validate(user)


@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    """Return the current authenticated user's profile."""
    from datetime import date, timedelta
    today = date.today()
    if user.last_login_date != today:
        if user.last_login_date is None:
            user.current_streak = 1
        elif user.last_login_date == today - timedelta(days=1):
            user.current_streak += 1
        else:
            user.current_streak = 1
        user.last_login_date = today
        await db.commit()
        await db.refresh(user)
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


@router.post("/me/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user),
):
    """Change the current user's password."""
    success = await user_service.change_password(db, user.id, data.current_password, data.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password")
    return {"detail": "Password changed successfully"}
