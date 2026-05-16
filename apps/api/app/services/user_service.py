from typing import List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


async def list_students(db: AsyncSession) -> List[User]:
    """List all student accounts."""
    result = await db.execute(
        select(User)
        .where(User.role == UserRole.STUDENT)
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


async def get_student_count(db: AsyncSession) -> int:
    """Count active students."""
    result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.STUDENT,
            User.is_active == True,
        )
    )
    return result.scalar_one()
