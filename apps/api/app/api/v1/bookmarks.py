from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func


from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.models.bookmark import Bookmark
from app.models.question import Question
from app.schemas.question import QuestionListResponse, QuestionResponse


router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])
student_only = RoleChecker(["student"])


@router.get("", response_model=QuestionListResponse, dependencies=[Depends(student_only)])
async def get_bookmarks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_ids: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    conds = [Bookmark.user_id == user.id]
    
    if category_ids:
        try:
            ids = [int(x.strip()) for x in category_ids.split(",") if x.strip()]
            if ids:
                conds.append(Question.category_id.in_(ids))
        except ValueError:
            pass

    if search:
        conds.append(Question.question_text.ilike(f"%{search}%"))

    # Total count
    count_query = select(func.count(Bookmark.id)).join(Question, Bookmark.question_id == Question.id).where(*conds)
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Fetch paginated questions
    offset = (page - 1) * page_size
    query = (
        select(Question)
        .join(Bookmark, Bookmark.question_id == Question.id)
        .where(*conds)
        .order_by(Bookmark.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    questions = result.scalars().all()

    # The schema requires category_name, but it might be None if we don't join Category.
    # To keep it simple, we just use the QuestionResponse model validate which will work.
    return QuestionListResponse(
        questions=[QuestionResponse.model_validate(q) for q in questions],
        total=total,
        page=page,
        page_size=page_size
    )



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
