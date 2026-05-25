from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.models.note import Note
from app.models.question import Question
from app.schemas.note import NoteCreate, NoteResponse, NotePaginatedResponse, NoteWithQuestionResponse

router = APIRouter(prefix="/notes", tags=["Notes"])
student_only = RoleChecker(["student"])


@router.get("", response_model=NotePaginatedResponse, dependencies=[Depends(student_only)])
async def get_all_notes(
    skip: int = 0, 
    limit: int = 50, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_active_user)
):
    from app.services.analytics_service import get_valid_category_ids
    valid_cat_ids = await get_valid_category_ids(db, user.study_year, user.university)
    valid_cond = Question.category_id.in_(valid_cat_ids) if valid_cat_ids else Question.category_id == -1

    count_query = (
        select(func.count(Note.id))
        .join(Question, Note.question_id == Question.id)
        .where(Note.user_id == user.id, valid_cond)
    )
    total = await db.scalar(count_query) or 0

    query = (
        select(Note, Question.question_text)
        .join(Question, Note.question_id == Question.id)
        .where(Note.user_id == user.id, valid_cond)
        .order_by(Note.updated_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.all()
    
    items = []
    for note_obj, q_text in rows:
        items.append(NoteWithQuestionResponse(
            id=note_obj.id,
            question_id=note_obj.question_id,
            content=note_obj.content,
            created_at=note_obj.created_at,
            updated_at=note_obj.updated_at,
            question_text=q_text
        ))

    return NotePaginatedResponse(items=items, total=total)


@router.get("/{question_id}", response_model=NoteResponse, dependencies=[Depends(student_only)])
async def get_note(question_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    result = await db.execute(
        select(Note).where(Note.user_id == user.id, Note.question_id == question_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.post("", response_model=NoteResponse, dependencies=[Depends(student_only)])
async def save_note(data: NoteCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    result = await db.execute(
        select(Note).where(Note.user_id == user.id, Note.question_id == data.question_id)
    )
    note = result.scalar_one_or_none()
    
    if note:
        note.content = data.content
    else:
        note = Note(user_id=user.id, question_id=data.question_id, content=data.content)
        db.add(note)
        
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}", dependencies=[Depends(student_only)])
async def delete_note(note_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == user.id)
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    
    await db.delete(note)
    await db.commit()
    return {"message": "Note deleted successfully"}
