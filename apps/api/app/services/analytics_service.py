from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user_progress import UserProgress
from app.models.question import Question, QuestionStatus
from app.models.category import Category
from app.models.quiz_session import QuizSession
from app.schemas.analytics import OverallProgress, CategoryProgress, WeakPointQuestion, LeaderboardEntry
from typing import List


async def get_valid_category_ids(db: AsyncSession, target_year: int | None, university: str | None) -> list[int]:
    all_cats_query = select(Category.id, Category.parent_id, Category.target_year, Category.university)
    all_cats = (await db.execute(all_cats_query)).all()
    parent_map = {r.id: r.parent_id for r in all_cats}
    def get_top_parent(cat_id):
        curr = cat_id
        while curr is not None and parent_map.get(curr) is not None:
            curr = parent_map[curr]
        return curr
        
    top_categories = {r.id for r in all_cats if r.parent_id is None and (target_year is None or r.target_year == target_year) and (university is None or r.university is None or r.university == university)}
    
    valid_ids = [r.id for r in all_cats if get_top_parent(r.id) in top_categories]
    return valid_ids

async def get_user_overall_rank(db: AsyncSession, target_user_id: int, target_year: int | None = None, university: str | None = None) -> int | None:
    all_cats_query = select(Category.id, Category.parent_id, Category.target_year, Category.university)
    all_cats = (await db.execute(all_cats_query)).all()
    parent_map = {r.id: r.parent_id for r in all_cats}
    def get_top_parent(cat_id):
        curr = cat_id
        while curr is not None and parent_map.get(curr) is not None:
            curr = parent_map[curr]
        return curr
        
    top_categories = {r.id for r in all_cats if r.parent_id is None and (target_year is None or r.target_year == target_year) and (university is None or r.university is None or r.university == university)}

    q_cat_map = {q.id: q.category_id for q in (await db.execute(select(Question.id, Question.category_id))).all()}

    user_stats = {}
    sessions_result = await db.execute(select(QuizSession).order_by(QuizSession.created_at.asc()))
    
    # Store unique question answers per user: user_id -> question_id -> {"is_correct": bool, "cat_id": int}
    user_latest_attempts = {}
    for s in sessions_result.scalars().all():
        uid = s.user_id
        if uid not in user_latest_attempts:
            user_latest_attempts[uid] = {}
        for ans in s.answers:
            qid = ans.get("question_id")
            if qid is not None:
                user_latest_attempts[uid][qid] = {
                    "is_correct": bool(ans.get("is_correct")),
                    "cat_id": q_cat_map.get(qid)
                }

    for uid, attempts in user_latest_attempts.items():
        user_stats[uid] = {"total": 0, "correct": 0}
        for qid, attempt in attempts.items():
            cat_id = attempt["cat_id"]
            if cat_id is not None:
                top_parent_id = get_top_parent(cat_id)
                if top_parent_id in top_categories:
                    user_stats[uid]["total"] += 1
                    if attempt["is_correct"]:
                        user_stats[uid]["correct"] += 1
                
    if target_user_id not in user_stats or user_stats[target_user_id]["total"] == 0:
        return None
        
    entries = []
    for uid, stats in user_stats.items():
        if stats["total"] > 0:
            entries.append({"uid": uid, "correct": stats["correct"], "total": stats["total"]})
            
    entries.sort(key=lambda x: (x["correct"], -x["total"]), reverse=True)
    for i, e in enumerate(entries, 1):
        if e["uid"] == target_user_id:
            return i
            
    return None

async def get_overall_progress(db: AsyncSession, user_id: int, target_year: int | None = None, university: str | None = None) -> OverallProgress:
    categories = await get_category_progress(db, user_id, target_year, university)
    
    total = sum(c.answered_count for c in categories)
    correct = sum(c.correct_count for c in categories)
    
    weak_points = await get_weak_points(db, user_id, target_year, university)
    
    # Calculate user rank
    rank = await get_user_overall_rank(db, user_id, target_year, university)

    return OverallProgress(
        total_answered=total, correct_count=correct, incorrect_count=len(weak_points),
        accuracy_percentage=round((correct / total * 100) if total > 0 else 0, 1),
        weak_points_count=len(weak_points),
        rank=rank
    )


async def get_category_progress(db: AsyncSession, user_id: int, target_year: int | None = None, university: str | None = None) -> List[CategoryProgress]:
    from sqlalchemy import or_

    # 1. Fetch all categories to build the parent map and find top-level categories
    all_cats_query = select(Category.id, Category.name, Category.icon, Category.parent_id, Category.target_year, Category.university)
    all_cats_result = await db.execute(all_cats_query)
    all_cats = all_cats_result.all()
    
    parent_map = {r.id: r.parent_id for r in all_cats}
    
    def get_top_parent(cat_id):
        curr = cat_id
        while curr is not None and parent_map.get(curr) is not None:
            curr = parent_map[curr]
        return curr

    top_categories = {}
    for r in all_cats:
        if r.parent_id is None:
            if target_year is not None and r.target_year != target_year:
                continue
            if university is not None and r.university is not None and r.university != university:
                continue
            top_categories[r.id] = {
                "name": r.name,
                "icon": r.icon or "📚",
                "total_questions": 0,
                "answered": 0,
                "correct": 0,
                "sub_stats": {}
            }

    # 2. Load all questions to map id -> category_id and count total published
    questions_result = await db.execute(select(Question.id, Question.category_id, Question.status))
    q_cat_map = {}
    for q in questions_result.all():
        q_cat_map[q.id] = q.category_id
        if q.status == QuestionStatus.PUBLISHED:
            top_parent_id = get_top_parent(q.category_id)
            if top_parent_id in top_categories:
                top_categories[top_parent_id]["total_questions"] += 1

    # 3. Process quiz sessions to get answered/correct counts
    sessions_result = await db.execute(
        select(QuizSession)
        .where(QuizSession.user_id == user_id)
        .order_by(QuizSession.created_at.asc())
    )
    
    # Store the latest attempt's results for each unique question_id
    # format: qid -> {"is_correct": bool, "cat_id": int}
    latest_attempts = {}
    for s in sessions_result.scalars().all():
        for ans in s.answers:
            qid = ans.get("question_id")
            if qid is not None:
                latest_attempts[qid] = {
                    "is_correct": bool(ans.get("is_correct")),
                    "cat_id": q_cat_map.get(qid)
                }

    for qid, attempt in latest_attempts.items():
        cat_id = attempt["cat_id"]
        if cat_id is not None:
            top_parent_id = get_top_parent(cat_id)
            if top_parent_id in top_categories:
                top_categories[top_parent_id]["answered"] += 1
                if attempt["is_correct"]:
                    top_categories[top_parent_id]["correct"] += 1
                    
                if cat_id != top_parent_id:
                    if cat_id not in top_categories[top_parent_id]["sub_stats"]:
                        top_categories[top_parent_id]["sub_stats"][cat_id] = {"answered": 0, "correct": 0}
                    top_categories[top_parent_id]["sub_stats"][cat_id]["answered"] += 1
                    if attempt["is_correct"]:
                        top_categories[top_parent_id]["sub_stats"][cat_id]["correct"] += 1

    cat_names = {r.id: r.name for r in all_cats}

    result = []
    for cid, data in top_categories.items():
        answered = data["answered"]
        correct = data["correct"]
        
        strongest_sub = None
        weakest_sub = None
        
        if data["sub_stats"]:
            valid_subs = [
                (cat_id, stats["correct"] / stats["answered"] * 100) 
                for cat_id, stats in data["sub_stats"].items() 
                if stats["answered"] > 0
            ]
            if valid_subs:
                valid_subs.sort(key=lambda x: x[1])
                weakest_cat_id = valid_subs[0][0]
                strongest_cat_id = valid_subs[-1][0]
                weakest_sub = cat_names.get(weakest_cat_id)
                strongest_sub = cat_names.get(strongest_cat_id)

        result.append(CategoryProgress(
            category_id=cid,
            category_name=data["name"],
            category_icon=data["icon"],
            total_questions=data["total_questions"],
            answered_count=answered,
            correct_count=correct,
            accuracy_percentage=round((correct / answered * 100) if answered > 0 else 0, 1),
            strongest_subcategory=strongest_sub,
            weakest_subcategory=weakest_sub
        ))
    return result


async def get_weak_points(db: AsyncSession, user_id: int, target_year: int | None = None, university: str | None = None) -> List[WeakPointQuestion]:
    latest_is_correct = {}
    wrong_counts = {}
    last_attempt = {}
    
    sessions_result = await db.execute(
        select(QuizSession)
        .where(QuizSession.user_id == user_id)
        .order_by(QuizSession.created_at.asc())
    )
    
    for s in sessions_result.scalars().all():
        for ans in s.answers:
            qid = ans.get("question_id")
            if qid is not None:
                is_correct = bool(ans.get("is_correct"))
                latest_is_correct[qid] = is_correct
                last_attempt[qid] = s.created_at
                if not is_correct:
                    wrong_counts[qid] = wrong_counts.get(qid, 0) + 1
                    
    weak_qids = [qid for qid, correct in latest_is_correct.items() if not correct]
    
    if not weak_qids:
        return []
        
    result = await db.execute(
        select(Question.id, Question.question_text, Question.category_id, Category.name.label("category_name"))
        .outerjoin(Category, Question.category_id == Category.id)
        .where(Question.id.in_(weak_qids))
    )
    
    questions_map = {r.id: r for r in result.all()}
    
    # Filter by target_year and university
    all_cats_query = select(Category.id, Category.parent_id, Category.target_year, Category.university)
    all_cats = (await db.execute(all_cats_query)).all()
    parent_map = {r.id: r.parent_id for r in all_cats}
    def get_top_parent(cat_id):
        curr = cat_id
        while curr is not None and parent_map.get(curr) is not None:
            curr = parent_map[curr]
        return curr
        
    top_categories = {r.id for r in all_cats if r.parent_id is None and (target_year is None or r.target_year == target_year) and (university is None or r.university is None or r.university == university)}
    
    weak_points = []
    for qid in weak_qids:
        r = questions_map.get(qid)
        if r:
            top_parent_id = get_top_parent(r.category_id)
            if top_parent_id in top_categories:
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
    
    user_latest_attempts = {}
    sessions_result = await db.execute(select(QuizSession).order_by(QuizSession.created_at.asc()))
    for s in sessions_result.scalars().all():
        uid = s.user_id
        if uid not in user_latest_attempts:
            user_latest_attempts[uid] = {}
        for ans in s.answers:
            qid = ans.get("question_id")
            if qid is not None:
                user_latest_attempts[uid][qid] = bool(ans.get("is_correct"))
                
    user_stats = {}
    for uid, attempts in user_latest_attempts.items():
        user_stats[uid] = {"total": 0, "correct": 0}
        for qid, is_correct in attempts.items():
            if cat_qids is None or qid in cat_qids:
                user_stats[uid]["total"] += 1
                if is_correct:
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
