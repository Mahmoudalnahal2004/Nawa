from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.models.bookmark import Bookmark
from app.models.question import Question

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])
student_only = RoleChecker(["student"])


@router.post("/{question_id}", response_model=dict, dependencies=[Depends(student_only)])
async def create_bookmark(question_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    # Check if question exists
    q_result = await db.execute(select(Question).where(Question.id == question_id))
    if not q_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
        
    # Check if already bookmarked
    b_result = await db.execute(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.question_id == question_id))
    if b_result.scalar_one_or_none():
        return {"status": "already_bookmarked"}
        
    bookmark = Bookmark(user_id=user.id, question_id=question_id)
    db.add(bookmark)
    await db.commit()
    return {"status": "bookmarked"}


@router.delete("/{question_id}", response_model=dict, dependencies=[Depends(student_only)])
async def remove_bookmark(question_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    b_result = await db.execute(select(Bookmark).where(Bookmark.user_id == user.id, Bookmark.question_id == question_id))
    bookmark = b_result.scalar_one_or_none()
    if not bookmark:
        return {"status": "not_bookmarked"}
        
    await db.delete(bookmark)
    await db.commit()
    return {"status": "removed"}
