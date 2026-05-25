from typing import List, Optional, Tuple

from sqlalchemy import select, func, delete, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.question import Question, QuestionStatus, Difficulty
from app.models.category import Category
from app.schemas.question import QuestionCreate, QuestionUpdate, QuestionResponse


async def create_question(db: AsyncSession, data: QuestionCreate) -> Question:
    """Create a new question."""
    question = Question(
        category_id=data.category_id,
        question_text=data.question_text,
        image_url=data.image_url,
        option_a=data.option_a,
        option_b=data.option_b,
        option_c=data.option_c,
        option_d=data.option_d,
        option_e=data.option_e or "",
        correct_answer=data.correct_answer.upper(),
        explanation=data.explanation or "",
        difficulty=Difficulty(data.difficulty),
        status=QuestionStatus(data.status),
    )
    db.add(question)
    await db.flush()
    await db.refresh(question)
    return question


async def get_questions_paginated(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    difficulty: Optional[str] = None,
    target_year: Optional[str] = None,
) -> Tuple[List[dict], int]:
    """Get paginated questions with optional filters."""
    from sqlalchemy.orm import aliased
    ParentCategory = aliased(Category)
    GrandParentCategory = aliased(Category)

    query = select(
        Question, 
        Category.name.label("category_name"),
        ParentCategory.name.label("parent_name"),
        GrandParentCategory.name.label("grandparent_name")
    ).outerjoin(
        Category, Question.category_id == Category.id
    ).outerjoin(
        ParentCategory, Category.parent_id == ParentCategory.id
    ).outerjoin(
        GrandParentCategory, ParentCategory.parent_id == GrandParentCategory.id
    )

    # Apply filters
    if status:
        query = query.where(Question.status == QuestionStatus(status))
    if category_id:
        query = query.where(Question.category_id == category_id)
    if difficulty:
        query = query.where(Question.difficulty == Difficulty(difficulty))
    if target_year == "Global":
        query = query.where(Category.target_year.is_(None))
    elif target_year and target_year != "All":
        query = query.where(Category.target_year == int(target_year))
    if search:
        query = query.where(
            or_(
                Question.question_text.ilike(f"%{search}%"),
                Question.option_a.ilike(f"%{search}%"),
                Question.option_b.ilike(f"%{search}%"),
                Question.option_c.ilike(f"%{search}%"),
                Question.option_d.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginate
    sort_col_1 = func.coalesce(GrandParentCategory.name, ParentCategory.name, Category.name)
    sort_col_2 = func.coalesce(ParentCategory.name, Category.name)
    sort_col_3 = Category.name

    query = query.order_by(
        sort_col_1.asc(),
        sort_col_2.asc(),
        sort_col_3.asc(),
        Question.created_at.desc()
    )
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    questions = []
    for row in result.all():
        q = row[0]
        cat_name = row[1]
        parent_name = row[2]
        grandparent_name = row[3]
        
        parts = [name for name in [grandparent_name, parent_name, cat_name] if name]
        full_cat_name = " - ".join(parts) if parts else "Uncategorized"
        
        questions.append({
            "id": q.id,
            "category_id": q.category_id,
            "category_name": full_cat_name,
            "question_text": q.question_text,
            "image_url": q.image_url,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "option_e": q.option_e,
            "correct_answer": q.correct_answer,
            "explanation": q.explanation,
            "difficulty": q.difficulty if isinstance(q.difficulty, str) else q.difficulty.value,
            "status": q.status if isinstance(q.status, str) else q.status.value,
            "created_at": q.created_at,
        })

    return questions, total


async def get_question_by_id(db: AsyncSession, question_id: int) -> Question | None:
    """Fetch a single question by ID."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    return result.scalar_one_or_none()


async def update_question(db: AsyncSession, question_id: int, data: QuestionUpdate) -> Question | None:
    """Update an existing question."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "difficulty" and value is not None:
            setattr(question, field, Difficulty(value))
        elif field == "status" and value is not None:
            setattr(question, field, QuestionStatus(value))
        elif field == "correct_answer" and value is not None:
            setattr(question, field, value.upper())
        else:
            setattr(question, field, value)

    await db.flush()
    await db.refresh(question)
    return question


async def delete_question(db: AsyncSession, question_id: int) -> bool:
    """Delete a question."""
    result = await db.execute(delete(Question).where(Question.id == question_id))
    await db.flush()
    return result.rowcount > 0


async def toggle_question_status(db: AsyncSession, question_id: int) -> Question | None:
    """Toggle a question between draft and published."""
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if question is None:
        return None

    question.status = (
        QuestionStatus.PUBLISHED if question.status == QuestionStatus.DRAFT
        else QuestionStatus.DRAFT
    )
    await db.flush()
    await db.refresh(question)
    return question


async def get_question_stats(db: AsyncSession) -> dict:
    """Get question statistics for the admin dashboard."""
    total = (await db.execute(select(func.count(Question.id)))).scalar_one()
    published = (await db.execute(
        select(func.count(Question.id)).where(Question.status == QuestionStatus.PUBLISHED)
    )).scalar_one()
    draft = (await db.execute(
        select(func.count(Question.id)).where(Question.status == QuestionStatus.DRAFT)
    )).scalar_one()

    return {"total": total, "published": published, "draft": draft}

async def bulk_update_status(db: AsyncSession, question_ids: list[int], status: str) -> bool:
    """Bulk update the status of multiple questions."""
    if not question_ids:
        return True
    await db.execute(
        update(Question)
        .where(Question.id.in_(question_ids))
        .values(status=QuestionStatus(status))
    )
    await db.flush()
    return True
