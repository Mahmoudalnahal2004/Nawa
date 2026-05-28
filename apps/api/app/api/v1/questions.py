import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.core.deps import get_db, RoleChecker
from app.core.config import settings
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse, QuestionListResponse, ImportResult
from app.services import question_service
from app.services.excel_service import import_excel
from app.services.pdf_service import parse_pdf_questions
router = APIRouter(prefix="/questions", tags=["Questions"])
admin_only = RoleChecker(["admin"])

from pydantic import BaseModel
class BulkStatusUpdate(BaseModel):
    question_ids: list[int]
    status: str

@router.patch("/bulk/status", dependencies=[Depends(admin_only)])
async def bulk_update_status(data: BulkStatusUpdate, db: AsyncSession = Depends(get_db)):
    await question_service.bulk_update_status(db, data.question_ids, data.status)
    return {"detail": "Status updated"}

@router.get("", response_model=QuestionListResponse, dependencies=[Depends(admin_only)])
async def list_questions(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=10000),
    status_filter: Optional[str] = Query(None, alias="status"),
    category_id: Optional[int] = None, search: Optional[str] = None,
    difficulty: Optional[str] = None, target_year: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    questions, total = await question_service.get_questions_paginated(
        db, page, page_size, status_filter, category_id, search, difficulty, target_year
    )
    return QuestionListResponse(questions=questions, total=total, page=page, page_size=page_size)


@router.post("", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_only)])
async def create_question(data: QuestionCreate, db: AsyncSession = Depends(get_db)):
    q = await question_service.create_question(db, data)
    return QuestionResponse.model_validate(q)

@router.get("/stats", dependencies=[Depends(admin_only)])
async def get_stats(db: AsyncSession = Depends(get_db)):
    return await question_service.get_question_stats(db)



@router.get("/{question_id}", response_model=QuestionResponse, dependencies=[Depends(admin_only)])
async def get_question(question_id: int, db: AsyncSession = Depends(get_db)):
    q = await question_service.get_question_by_id(db, question_id)
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return QuestionResponse.model_validate(q)


@router.put("/{question_id}", response_model=QuestionResponse, dependencies=[Depends(admin_only)])
async def update_question(question_id: int, data: QuestionUpdate, db: AsyncSession = Depends(get_db)):
    q = await question_service.update_question(db, question_id, data)
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return QuestionResponse.model_validate(q)


@router.delete("/{question_id}", dependencies=[Depends(admin_only)])
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    success = await question_service.delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return {"detail": "Question deleted"}


@router.patch("/{question_id}/publish", response_model=QuestionResponse, dependencies=[Depends(admin_only)])
async def toggle_publish(question_id: int, db: AsyncSession = Depends(get_db)):
    q = await question_service.toggle_question_status(db, question_id)
    if q is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return QuestionResponse.model_validate(q)


@router.post("/import", response_model=ImportResult, dependencies=[Depends(admin_only)])
async def import_questions(file: UploadFile = File(...), category_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only Excel files (.xlsx) are accepted")
    content = await file.read()
    result = await import_excel(db, content, default_category_id=category_id)
    return result


@router.post("/import/pdf", dependencies=[Depends(admin_only)])
async def import_questions_pdf(
    category_id: int = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted")
    
    content = await file.read()
    questions_to_create = await parse_pdf_questions(content, category_id)
    
    imported_count = 0
    for q_data in questions_to_create:
        try:
            await question_service.create_question(db, q_data)
            imported_count += 1
        except Exception as e:
            # Skip invalid questions or db errors
            pass
            
    return {"message": "Import successful", "imported_count": imported_count}


class BulkCreateQuestions(BaseModel):
    questions: list[QuestionCreate]


@router.post("/parse-pdf", dependencies=[Depends(admin_only)])
async def parse_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted")
    content = await file.read()
    questions = await parse_pdf_questions(content, category_id=0)
    return {"questions": questions}


@router.post("/bulk-create", dependencies=[Depends(admin_only)])
async def bulk_create_questions(data: BulkCreateQuestions, db: AsyncSession = Depends(get_db)):
    imported_count = 0
    errors = []
    for i, q_data in enumerate(data.questions):
        try:
            await question_service.create_question(db, q_data)
            imported_count += 1
        except Exception as e:
            errors.append({"index": i, "reason": str(e)})
    return {"imported_count": imported_count, "errors": errors}


@router.post("/upload-image", dependencies=[Depends(admin_only)])
async def upload_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image files are accepted")
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}", "filename": filename}

