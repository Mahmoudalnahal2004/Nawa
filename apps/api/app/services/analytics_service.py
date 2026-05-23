from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_progress import UserProgress
from app.models.question import Question, QuestionStatus
from app.models.category import Category
from app.models.quiz_session import QuizSession
from app.schemas.analytics import OverallProgress, CategoryProgress, WeakPointQuestion, LeaderboardEntry
from typing import List


async def get_overall_progress(db: AsyncSession, user_id: int) -> OverallProgress:
    query = select(QuizSession).where(QuizSession.user_id == user_id)
    result = await db.execute(query)
    
    total = 0
    correct = 0
    for s in result.scalars().all():
        for ans in s.answers:
            total += 1
            if ans.get("is_correct"):
                correct += 1

    # Calculate weak points count
    weak_points = await get_weak_points(db, user_id)

    return OverallProgress(
        total_answered=total, correct_count=correct, incorrect_count=total - correct,
        accuracy_percentage=round((correct / total * 100) if total > 0 else 0, 1),
        weak_points_count=len(weak_points)
    )


async def get_category_progress(db: AsyncSession, user_id: int, target_year: int | None = None, university: str | None = None) -> List[CategoryProgress]:
    # Get all categories with published question counts, filtered by target year and university if set
    cat_query = select(
        Category.id, Category.name, Category.icon,
        func.count(Question.id).label("total_questions"),
    ).outerjoin(Question, and_(Question.category_id == Category.id, Question.status == QuestionStatus.PUBLISHED)
    ).group_by(Category.id, Category.name, Category.icon)

    from sqlalchemy import or_

    if target_year is not None:
        cat_query = cat_query.where(Category.target_year == target_year)
        
    if university is not None:
        cat_query = cat_query.where(
            or_(Category.university == None, Category.university == university)
        )

    cat_result = await db.execute(cat_query)
    categories = cat_result.all()

    # Load all question category_ids into a dict for fast lookup
    questions_result = await db.execute(select(Question.id, Question.category_id))
    q_cat_map = {r.id: r.category_id for r in questions_result.all()}

    progress_map = {}
    
    sessions_result = await db.execute(select(QuizSession).where(QuizSession.user_id == user_id))
    for s in sessions_result.scalars().all():
        for ans in s.answers:
            qid = ans.get("question_id")
            cat_id = q_cat_map.get(qid)
            if cat_id is not None:
                if cat_id not in progress_map:
                    progress_map[cat_id] = {"answered": 0, "correct": 0}
                progress_map[cat_id]["answered"] += 1
                if ans.get("is_correct"):
                    progress_map[cat_id]["correct"] += 1

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
    wrong_counts = {}
    got_right = set()
    last_attempt = {}
    
    sessions_result = await db.execute(select(QuizSession).where(QuizSession.user_id == user_id).order_by(QuizSession.created_at.asc()))
    
    for s in sessions_result.scalars().all():
        for ans in s.answers:
            qid = ans.get("question_id")
            last_attempt[qid] = s.created_at
            if ans.get("is_correct"):
                got_right.add(qid)
            else:
                if qid in got_right:
                    got_right.remove(qid) # if they get it wrong again, it's a weak point again
                wrong_counts[qid] = wrong_counts.get(qid, 0) + 1
                    
    weak_qids = [qid for qid, count in wrong_counts.items() if qid not in got_right and count > 0]
    
    if not weak_qids:
        return []
        
    result = await db.execute(
        select(Question.id, Question.question_text, Category.name.label("category_name"))
        .outerjoin(Category, Question.category_id == Category.id)
        .where(Question.id.in_(weak_qids))
    )
    
    questions_map = {r.id: r for r in result.all()}
    
    weak_points = []
    for qid in weak_qids:
        r = questions_map.get(qid)
        if r:
            weak_points.append(WeakPointQuestion(
                question_id=qid, 
                question_text=r.question_text[:100] + "..." if len(r.question_text) > 100 else r.question_text,
                category_name=r.category_name or "Uncategorized", 
                times_incorrect=wrong_counts[qid],
                last_attempt=str(last_attempt[qid])
            ))
            
    weak_points.sort(key=lambda x: x.times_incorrect, reverse=True)
    return weak_points


async def get_leaderboard(db: AsyncSession, category_id: int) -> List[LeaderboardEntry]:
    from app.models.user import User as UserModel, UserRole
    
    if category_id == 0:
        cat_qids = None
    else:
        questions_result = await db.execute(select(Question.id).where(Question.category_id == category_id))
        cat_qids = {r.id for r in questions_result.all()}
    
    user_stats = {}
    sessions_result = await db.execute(select(QuizSession))
    for s in sessions_result.scalars().all():
        uid = s.user_id
        if uid not in user_stats:
            user_stats[uid] = {"total": 0, "correct": 0}
            
        for ans in s.answers:
            if cat_qids is None or ans.get("question_id") in cat_qids:
                user_stats[uid]["total"] += 1
                if ans.get("is_correct"):
                    user_stats[uid]["correct"] += 1
                    
    valid_uids = [uid for uid, stats in user_stats.items() if stats["total"] > 0]
    if not valid_uids:
        return []
        
    result = await db.execute(
        select(UserModel.id, UserModel.full_name, UserModel.is_anonymous)
        .where(UserModel.id.in_(valid_uids), UserModel.role == UserRole.STUDENT)
    )
    users_map = {r.id: r for r in result.all()}
    
    entries = []
    for uid, stats in user_stats.items():
        if uid in users_map:
            u = users_map[uid]
            correct = stats["correct"]
            total = stats["total"]
            accuracy = round((correct / total * 100) if total > 0 else 0, 1)
            display_name = "Anonymous Student" if u.is_anonymous else u.full_name
            entries.append(LeaderboardEntry(
                rank=0, user_id=uid, display_name=display_name,
                correct_count=correct, total_answered=total,
                accuracy_percentage=accuracy,
            ))
            
    entries.sort(key=lambda x: (x.correct_count, -x.total_answered), reverse=True)
    for i, e in enumerate(entries, 1):
        e.rank = i
        
    return entries[:10]
