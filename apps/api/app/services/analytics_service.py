from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_progress import UserProgress
from app.models.question import Question, QuestionStatus
from app.models.category import Category
from app.schemas.analytics import OverallProgress, CategoryProgress, WeakPointQuestion
from typing import List


async def get_overall_progress(db: AsyncSession, user_id: int) -> OverallProgress:
    # Get best attempt per question
    subq = select(
        UserProgress.question_id,
        func.max(case((UserProgress.is_correct == True, 1), else_=0)).label("is_correct")
    ).where(UserProgress.user_id == user_id).group_by(UserProgress.question_id).subquery()

    result = await db.execute(
        select(
            func.count(subq.c.question_id).label("total"),
            func.sum(subq.c.is_correct).label("correct"),
        )
    )
    row = result.one()
    total = row.total or 0
    correct = row.correct or 0
    return OverallProgress(
        total_answered=total, correct_count=correct, incorrect_count=total - correct,
        accuracy_percentage=round((correct / total * 100) if total > 0 else 0, 1),
    )


async def get_category_progress(db: AsyncSession, user_id: int, target_year: int | None = None, university: str | None = None) -> List[CategoryProgress]:
    # Get all categories with published question counts, filtered by target year and university if set
    cat_query = select(
        Category.id, Category.name, Category.icon,
        func.count(Question.id).label("total_questions"),
    ).outerjoin(Question, and_(Question.category_id == Category.id, Question.status == QuestionStatus.PUBLISHED)
    ).group_by(Category.id, Category.name, Category.icon)

    from sqlalchemy import or_

    # If student has a target_year set, show only universal categories (NULL) + their year
    if target_year is not None:
        cat_query = cat_query.where(
            or_(Category.target_year == None, Category.target_year == target_year)
        )
        
    # If student has a university set, show only universal categories (NULL) + their university
    if university is not None:
        cat_query = cat_query.where(
            or_(Category.university == None, Category.university == university)
        )

    cat_result = await db.execute(cat_query)
    categories = cat_result.all()

    # Get best attempt per question per category
    subq = select(
        Question.category_id,
        UserProgress.question_id,
        func.max(case((UserProgress.is_correct == True, 1), else_=0)).label("is_correct")
    ).join(Question, UserProgress.question_id == Question.id
    ).where(UserProgress.user_id == user_id
    ).group_by(Question.category_id, UserProgress.question_id).subquery()

    # Aggregate by category
    progress_query = select(
        subq.c.category_id,
        func.count(subq.c.question_id).label("answered"),
        func.sum(subq.c.is_correct).label("correct"),
    ).group_by(subq.c.category_id)
    
    prog_result = await db.execute(progress_query)
    progress_map = {r.category_id: {"answered": r.answered, "correct": r.correct or 0} for r in prog_result.all()}

    result = []
    for cat in categories:
        prog = progress_map.get(cat.id, {"answered": 0, "correct": 0})
        answered = prog["answered"]
        correct = prog["correct"]
        result.append(CategoryProgress(
            category_id=cat.id, category_name=cat.name, category_icon=cat.icon or "📚",
            total_questions=cat.total_questions or 0, answered_count=answered, correct_count=correct,
            accuracy_percentage=round((correct / answered * 100) if answered > 0 else 0, 1),
        ))
    return result


async def get_weak_points(db: AsyncSession, user_id: int) -> List[WeakPointQuestion]:
    # Questions the user got wrong (latest attempt was incorrect)
    subq = select(
        UserProgress.question_id,
        func.count(UserProgress.id).label("times_incorrect"),
        func.max(UserProgress.answered_at).label("last_attempt"),
    ).where(UserProgress.user_id == user_id, UserProgress.is_correct == False
    ).group_by(UserProgress.question_id).subquery()

    # Exclude questions the user later answered correctly
    correct_subq = select(UserProgress.question_id).where(
        UserProgress.user_id == user_id, UserProgress.is_correct == True
    ).distinct().subquery()

    result = await db.execute(
        select(subq.c.question_id, subq.c.times_incorrect, subq.c.last_attempt,
               Question.question_text, Category.name.label("category_name"))
        .join(Question, subq.c.question_id == Question.id)
        .outerjoin(Category, Question.category_id == Category.id)
        .where(subq.c.question_id.notin_(select(correct_subq.c.question_id)))
        .order_by(subq.c.times_incorrect.desc())
    )
    return [
        WeakPointQuestion(
            question_id=r.question_id, question_text=r.question_text[:100] + "..." if len(r.question_text) > 100 else r.question_text,
            category_name=r.category_name or "Uncategorized", times_incorrect=r.times_incorrect,
            last_attempt=str(r.last_attempt),
        ) for r in result.all()
    ]


async def get_leaderboard(db: AsyncSession, category_id: int):
    from app.schemas.analytics import LeaderboardEntry
    from app.models.user import User as UserModel, UserRole

    # Aggregate best attempt per question per user for this category
    subq = select(
        UserProgress.user_id,
        UserProgress.question_id,
        func.max(case((UserProgress.is_correct == True, 1), else_=0)).label("is_correct")
    ).join(Question, UserProgress.question_id == Question.id
    ).where(Question.category_id == category_id
    ).group_by(UserProgress.user_id, UserProgress.question_id).subquery()

    # Sum per user
    agg = select(
        subq.c.user_id,
        func.count(subq.c.question_id).label("total_answered"),
        func.sum(subq.c.is_correct).label("correct_count"),
    ).group_by(subq.c.user_id).having(func.count(subq.c.question_id) >= 1).subquery()

    result = await db.execute(
        select(
            agg.c.user_id, agg.c.total_answered, agg.c.correct_count,
            UserModel.full_name, UserModel.is_anonymous,
        ).join(UserModel, agg.c.user_id == UserModel.id
        ).where(UserModel.role == UserRole.STUDENT
        ).order_by(agg.c.correct_count.desc(), agg.c.total_answered.asc()
        ).limit(10)
    )

    entries = []
    for rank, r in enumerate(result.all(), 1):
        correct = r.correct_count or 0
        total = r.total_answered or 0
        accuracy = round((correct / total * 100) if total > 0 else 0, 1)
        display_name = "Anonymous Student" if r.is_anonymous else r.full_name
        entries.append(LeaderboardEntry(
            rank=rank, user_id=r.user_id, display_name=display_name,
            correct_count=correct, total_answered=total,
            accuracy_percentage=accuracy,
        ))
    return entries
