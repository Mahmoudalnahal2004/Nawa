import random
import uuid
from typing import Dict, List, Tuple
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.question import Question, QuestionStatus
from app.models.category import Category
from app.models.user_progress import UserProgress
from app.schemas.quiz import QuizQuestion, QuizSessionResponse, AnswerFeedback, QuizResultSummary

_quiz_sessions: Dict[str, dict] = {}


def _shuffle_options(question: Question) -> Tuple[dict, str]:
    options = [("A", question.option_a), ("B", question.option_b), ("C", question.option_c), ("D", question.option_d)]
    if question.option_e:
        options.append(("E", question.option_e))
    original_correct = question.correct_answer.upper()
    option_values = [v for _, v in options]
    correct_value = dict(options).get(original_correct, "")
    random.shuffle(option_values)
    labels = ["A", "B", "C", "D", "E"]
    shuffled = {}
    new_correct = "A"
    for i, val in enumerate(option_values):
        label = labels[i]
        shuffled[f"option_{label.lower()}"] = val
        if val == correct_value:
            new_correct = label
    if "option_e" not in shuffled:
        shuffled["option_e"] = ""
    return shuffled, new_correct


async def start_quiz(db: AsyncSession, user_id: int, category_id: int, num_questions: int, mode: str = "practice") -> QuizSessionResponse:
    cat_result = await db.execute(select(Category).where(Category.id == category_id))
    category = cat_result.scalar_one_or_none()
    if category is None:
        raise ValueError("Category not found")
    result = await db.execute(
        select(Question).where(Question.category_id == category_id, Question.status == QuestionStatus.PUBLISHED)
        .order_by(func.random()).limit(num_questions)
    )
    questions = list(result.scalars().all())
    if len(questions) == 0:
        raise ValueError("No published questions available in this category")
    random.shuffle(questions)
    session_id = str(uuid.uuid4())
    quiz_questions = []
    answer_key = {}
    for q in questions:
        shuffled_opts, new_correct = _shuffle_options(q)
        answer_key[q.id] = {"correct_answer": new_correct, "explanation": q.explanation}
        quiz_questions.append(QuizQuestion(
            id=q.id, question_text=q.question_text, image_url=q.image_url,
            option_a=shuffled_opts["option_a"], option_b=shuffled_opts["option_b"],
            option_c=shuffled_opts["option_c"], option_d=shuffled_opts["option_d"],
            option_e=shuffled_opts.get("option_e"),
        ))
    from datetime import datetime, timezone
    _quiz_sessions[session_id] = {
        "user_id": user_id, "category_id": category_id, "category_name": category.name,
        "mode": mode, "questions": quiz_questions, "answer_key": answer_key, "answers": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "in_progress", "current_question_index": 0
    }
    return QuizSessionResponse(
        session_id=session_id, mode=mode, questions=quiz_questions, 
        total_questions=len(quiz_questions), category_name=category.name,
        status="in_progress", current_question_index=0
    )


async def submit_answer(db: AsyncSession, session_id: str, user_id: int, question_id: int, selected_answer: str) -> AnswerFeedback:
    session = _quiz_sessions.get(session_id)
    if session is None:
        raise ValueError("Quiz session not found")
    if session["user_id"] != user_id:
        raise ValueError("Not your quiz session")
    key = session["answer_key"].get(question_id)
    if key is None:
        raise ValueError("Question not in this quiz session")
    selected = selected_answer.upper()
    correct = key["correct_answer"]
    is_correct = selected == correct
    feedback = AnswerFeedback(question_id=question_id, selected_answer=selected, correct_answer=correct, is_correct=is_correct, explanation=key["explanation"])
    session["answers"].append(feedback)
    progress = UserProgress(user_id=user_id, question_id=question_id, selected_answer=selected, is_correct=is_correct)
    db.add(progress)
    await db.flush()
    return feedback


async def submit_batch_answers(db: AsyncSession, session_id: str, user_id: int, answers: list) -> list[AnswerFeedback]:
    session = _quiz_sessions.get(session_id)
    if session is None:
        raise ValueError("Quiz session not found")
    if session["user_id"] != user_id:
        raise ValueError("Not your quiz session")
    
    feedbacks = []
    for ans in answers:
        key = session["answer_key"].get(ans.question_id)
        if key is None:
            continue
        selected = ans.selected_answer.upper()
        correct = key["correct_answer"]
        is_correct = selected == correct
        feedback = AnswerFeedback(question_id=ans.question_id, selected_answer=selected, correct_answer=correct, is_correct=is_correct, explanation=key["explanation"])
        feedbacks.append(feedback)
        
        # Check if already answered in session to avoid duplicates
        if not any(a.question_id == ans.question_id for a in session["answers"]):
            session["answers"].append(feedback)
            progress = UserProgress(user_id=user_id, question_id=ans.question_id, selected_answer=selected, is_correct=is_correct)
            db.add(progress)
            
    await db.flush()
    return feedbacks


async def pause_quiz(session_id: str, user_id: int, current_question_index: int) -> dict:
    session = _quiz_sessions.get(session_id)
    if session is None:
        raise ValueError("Quiz session not found")
    if session["user_id"] != user_id:
        raise ValueError("Not your quiz session")
    
    session["current_question_index"] = current_question_index
    session["status"] = "in_progress"
    
    return {"message": "Session paused successfully", "current_question_index": current_question_index}


async def submit_exam(session_id: str, user_id: int) -> dict:
    session = _quiz_sessions.get(session_id)
    if session is None:
        raise ValueError("Quiz session not found")
    if session["user_id"] != user_id:
        raise ValueError("Not your quiz session")
        
    session["status"] = "completed"
    
    total = len(session["questions"])
    correct = sum(1 for a in session["answers"] if a.is_correct)
    score = (correct / total * 100) if total > 0 else 0
    
    return {"message": "Quiz submitted successfully", "score_percentage": round(score, 1), "status": "completed"}


async def get_quiz_results(session_id: str, user_id: int) -> QuizResultSummary:
    session = _quiz_sessions.get(session_id)
    if session is None:
        raise ValueError("Quiz session not found")
    if session["user_id"] != user_id:
        raise ValueError("Not your quiz session")
    answers = session["answers"]
    total = len(session["questions"])
    correct = sum(1 for a in answers if a.is_correct)
    score = (correct / total * 100) if total > 0 else 0
    return QuizResultSummary(session_id=session_id, total_questions=total, correct_count=correct, incorrect_count=total - correct, score_percentage=round(score, 1), answers=answers)


def get_quiz_session(session_id: str) -> dict | None:
    return _quiz_sessions.get(session_id)


def get_recent_sessions(user_id: int) -> list:
    from app.schemas.analytics import RecentQuizSession
    sessions = []
    for sid, s in _quiz_sessions.items():
        if s.get("user_id") == user_id:
            total = len(s["questions"])
            correct = sum(1 for a in s["answers"] if a.is_correct)
            score = (correct / total * 100) if total > 0 else 0
            created_at = s.get("created_at")
            if not created_at:
                from datetime import datetime, timezone
                created_at = datetime.now(timezone.utc).isoformat()
            sessions.append(RecentQuizSession(
                session_id=sid,
                category_name=s["category_name"],
                mode=s.get("mode", "practice"),
                total_questions=total,
                score_percentage=round(score, 1),
                created_at=created_at
            ))
    # Sort by created_at descending
    sessions.sort(key=lambda x: x.created_at, reverse=True)
    return sessions[:10]


async def get_quiz_availability(db: AsyncSession, user_id: int, mode: str) -> dict[int, int]:
    from app.models.bookmark import Bookmark
    
    query = select(Question.category_id, func.count(Question.id)).where(Question.status == QuestionStatus.PUBLISHED)
    
    if mode == "Unused":
        query = query.where(~Question.id.in_(select(UserProgress.question_id).where(UserProgress.user_id == user_id)))
    elif mode == "Incorrect":
        query = query.where(Question.id.in_(select(UserProgress.question_id).where(UserProgress.user_id == user_id, UserProgress.is_correct == False)))
    elif mode == "Bookmarked":
        query = query.where(Question.id.in_(select(Bookmark.question_id).where(Bookmark.user_id == user_id)))
        
    query = query.group_by(Question.category_id)
    result = await db.execute(query)
    
    counts = {}
    for row in result.all():
        counts[row[0]] = row[1]
    return counts


async def generate_custom_quiz(db: AsyncSession, user_id: int, request) -> QuizSessionResponse:
    from app.models.bookmark import Bookmark
    
    query = select(Question).where(
        Question.category_id.in_(request.category_ids),
        Question.status == QuestionStatus.PUBLISHED
    )
    
    if request.mode == "Unused":
        query = query.where(~Question.id.in_(select(UserProgress.question_id).where(UserProgress.user_id == user_id)))
    elif request.mode == "Incorrect":
        query = query.where(Question.id.in_(select(UserProgress.question_id).where(UserProgress.user_id == user_id, UserProgress.is_correct == False)))
    elif request.mode == "Bookmarked":
        query = query.where(Question.id.in_(select(Bookmark.question_id).where(Bookmark.user_id == user_id)))
        
    query = query.order_by(func.random()).limit(request.question_count)
    result = await db.execute(query)
    questions = list(result.scalars().all())
    
    if len(questions) == 0:
        raise ValueError("No questions available matching these criteria")
        
    random.shuffle(questions)
    session_id = str(uuid.uuid4())
    quiz_questions = []
    answer_key = {}
    
    for q in questions:
        shuffled_opts, new_correct = _shuffle_options(q)
        answer_key[q.id] = {"correct_answer": new_correct, "explanation": q.explanation}
        quiz_questions.append(QuizQuestion(
            id=q.id, question_text=q.question_text, image_url=q.image_url,
            option_a=shuffled_opts["option_a"], option_b=shuffled_opts["option_b"],
            option_c=shuffled_opts["option_c"], option_d=shuffled_opts["option_d"],
            option_e=shuffled_opts.get("option_e"),
        ))
        
    from datetime import datetime, timezone
    _quiz_sessions[session_id] = {
        "user_id": user_id, "category_id": 0, "category_name": "Custom Generated Quiz",
        "mode": request.quiz_mode, "questions": quiz_questions, "answer_key": answer_key, "answers": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "in_progress", "current_question_index": 0
    }
    
    return QuizSessionResponse(
        session_id=session_id, mode=request.quiz_mode, 
        questions=quiz_questions, total_questions=len(quiz_questions), 
        category_name="Custom Generated Quiz",
        status="in_progress", current_question_index=0
    )
