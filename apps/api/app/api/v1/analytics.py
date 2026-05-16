from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.schemas.analytics import OverallProgress, CategoryProgress, WeakPointQuestion
from app.schemas.quiz import QuizStartRequest, QuizSessionResponse
from app.services import analytics_service, quiz_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])
student_only = RoleChecker(["student"])


@router.get("/progress", response_model=OverallProgress, dependencies=[Depends(student_only)])
async def get_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    return await analytics_service.get_overall_progress(db, user.id)


@router.get("/by-category", response_model=List[CategoryProgress], dependencies=[Depends(student_only)])
async def get_category_progress(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    return await analytics_service.get_category_progress(db, user.id)


@router.get("/weak-points", response_model=List[WeakPointQuestion], dependencies=[Depends(student_only)])
async def get_weak_points(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    return await analytics_service.get_weak_points(db, user.id)


@router.post("/weak-points/quiz", response_model=QuizSessionResponse, dependencies=[Depends(student_only)])
async def start_weak_points_quiz(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    weak = await analytics_service.get_weak_points(db, user.id)
    if not weak:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No weak points found")
    # Group by first category and create quiz
    category_id = None
    from sqlalchemy import select
    from app.models.question import Question
    for wp in weak:
        result = await db.execute(select(Question.category_id).where(Question.id == wp.question_id))
        row = result.scalar_one_or_none()
        if row:
            category_id = row
            break
    if category_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not find questions")
    try:
        return await quiz_service.start_quiz(db, user.id, category_id, min(len(weak), 20))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
