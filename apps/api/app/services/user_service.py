from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.core.security import verify_password, hash_password


async def list_all_users(db: AsyncSession) -> List[User]:
    """List all accounts."""
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
    )
    return list(result.scalars().all())


async def toggle_user_active(db: AsyncSession, user_id: int, is_active: bool) -> User | None:
    """Toggle the is_active status of a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    user.is_active = is_active
    await db.flush()
    await db.refresh(user)
    return user


async def promote_to_admin(db: AsyncSession, user_id: int) -> User | None:
    """Promote a student to an admin role."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    user.role = UserRole.ADMIN
    user.is_active = True
    await db.flush()
    await db.refresh(user)
    return user


async def demote_from_admin(db: AsyncSession, user_id: int) -> User | None:
    """Demote an admin back to a student role. Protects super admin."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    
    from app.core.config import settings
    if user.email == settings.SUPER_ADMIN_EMAIL:
        return None  # Cannot demote super admin
        
    user.role = UserRole.STUDENT
    await db.flush()
    await db.refresh(user)
    return user


async def assign_quota(db: AsyncSession, user_id: int, quota_id: int | None) -> User | None:
    """Assign or remove a quota for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    user.quota_id = quota_id
    await db.flush()
    await db.refresh(user)
    return user


async def update_profile(db: AsyncSession, user_id: int, full_name: str | None, university: str | None, study_year: int | None, is_anonymous: bool | None = None) -> User | None:
    """Update a user's profile fields."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if full_name is not None:
        user.full_name = full_name
    if university is not None:
        user.university = university
    if study_year is not None:
        user.study_year = study_year
    if is_anonymous is not None:
        user.is_anonymous = is_anonymous
    await db.flush()
    await db.refresh(user)
    return user


async def change_password(db: AsyncSession, user_id: int, current_password: str, new_password: str) -> bool:
    """Change a user's password."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return False
    if not verify_password(current_password, user.hashed_password):
        return False
    
    user.hashed_password = hash_password(new_password)
    await db.flush()
    return True


async def get_student_count(db: AsyncSession) -> int:
    """Count active students."""
    result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.STUDENT,
            User.is_active == True,
        )
    )
    return result.scalar_one()


async def delete_user(db: AsyncSession, user_id: int) -> bool:
    """Delete a user account and all of their related dependent records."""
    from app.models.user import User
    from app.models.quiz_session import QuizSession
    from app.models.bookmark import Bookmark
    from app.models.note import Note
    from app.models.user_progress import UserProgress
    from sqlalchemy import delete

    # 1. Fetch user to verify they exist
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        return False

    # 2. Check if we are trying to delete the super admin
    from app.core.config import settings
    if user.email == settings.SUPER_ADMIN_EMAIL:
        return False

    # 3. Clean up dependent tables manually to prevent SQLite constraint failures
    await db.execute(delete(QuizSession).where(QuizSession.user_id == user_id))
    await db.execute(delete(Bookmark).where(Bookmark.user_id == user_id))
    await db.execute(delete(Note).where(Note.user_id == user_id))
    await db.execute(delete(UserProgress).where(UserProgress.user_id == user_id))

    # 4. Delete user
    await db.execute(delete(User).where(User.id == user_id))
    await db.flush()
    return True

