from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.schemas.analytics import CategoryProgress
from app.services import analytics_service

router = APIRouter(prefix="/student", tags=["Student Dashboard"])
student_only = RoleChecker(["student"])

@router.get("/categories", response_model=List[CategoryProgress], dependencies=[Depends(student_only)])
async def get_student_categories(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    """
    Returns all active categories with their total question counts (published questions only)
    and the current student's progress for each category.
    """
    return await analytics_service.get_category_progress(db, user.id)
