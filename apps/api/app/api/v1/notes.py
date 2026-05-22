from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteResponse

router = APIRouter(prefix="/notes", tags=["Notes"])
student_only = RoleChecker(["student"])


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
