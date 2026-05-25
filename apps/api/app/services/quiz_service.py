import random
import uuid
from typing import Dict, List, Tuple
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
from datetime import datetime, timezone

from app.models.question import Question, QuestionStatus
from app.models.category import Category
from app.models.user_progress import UserProgress
from app.models.quiz_session import QuizSession
from app.schemas.quiz import QuizQuestion, QuizSessionResponse, AnswerFeedback, QuizResultSummary
from app.schemas.analytics import RecentQuizSession


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


async def start_quiz(db: AsyncSession, user_id: int, category_id: int, num_questions: int, mode: str = "practice", quiz_name: str | None = None, time_per_question: int = 60) -> QuizSessionResponse:
    from app.models.user import User, UserRole
    from app.models.quota import Quota
    from sqlalchemy.orm import selectinload
    from fastapi import HTTPException
    
    if num_questions > 150:
        raise ValueError("Cannot request more than 150 questions")

    # Check Quota
    user_db = await db.execute(select(User).options(selectinload(User.quota).selectinload(Quota.categories)).where(User.id == user_id))
    user_loaded = user_db.scalar_one()
    if user_loaded.role == UserRole.STUDENT:
        if not user_loaded.quota_id or not user_loaded.quota:
            raise HTTPException(status_code=403, detail="No quota assigned. Access denied.")
        allowed_category_ids = [cat.id for cat in user_loaded.quota.categories]
        if category_id not in allowed_category_ids:
            raise HTTPException(status_code=403, detail="This category is not in your assigned quota.")

    cat_result = await db.execute(select(Category).where(Category.id == category_id))
    category = cat_result.scalar_one_or_none()
    if category is None:
        raise ValueError("Category not found")

    count_query = select(func.count(Question.id)).where(
        Question.category_id == category_id, 
        Question.status == QuestionStatus.PUBLISHED
    )
    available_count = await db.scalar(count_query) or 0
    if num_questions > available_count:
        raise ValueError(f"Requested {num_questions} questions but only {available_count} are available")

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
        answer_key[str(q.id)] = {"correct_answer": new_correct, "explanation": q.explanation} # using str because json keys are strings
        quiz_questions.append({
            "id": q.id, "question_text": q.question_text, "image_url": q.image_url,
            "option_a": shuffled_opts["option_a"], "option_b": shuffled_opts["option_b"],
            "option_c": shuffled_opts["option_c"], "option_d": shuffled_opts["option_d"],
            "option_e": shuffled_opts.get("option_e"),
        })

    db_session = QuizSession(
        id=session_id,
        user_id=user_id,
        category_id=category_id,
        category_name=category.name,
        quiz_name=quiz_name or category.name,
        mode=mode,
        questions=quiz_questions,
        answer_key=answer_key,
        answers=[],
        exam_answers={},
        flagged_questions={},
        status="in_progress",
        current_question_index=0,
        time_per_question=time_per_question
    )
    db.add(db_session)
    await db.commit()
    
    # map to pydantic model
    q_objects = [QuizQuestion(**q) for q in quiz_questions]
    return QuizSessionResponse(
        session_id=session_id, mode=mode, questions=q_objects, 
        total_questions=len(quiz_questions), category_name=category.name,
        quiz_name=quiz_name or category.name,
        status="in_progress", current_question_index=0,
        time_per_question=time_per_question
    )


async def submit_answer(db: AsyncSession, session_id: str, user_id: int, question_id: int, selected_answer: str) -> AnswerFeedback:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
        
    key = db_session.answer_key.get(str(question_id))
    if key is None:
        raise ValueError("Question not in this quiz session")
        
    selected = selected_answer.upper()
    correct = key["correct_answer"]
    is_correct = selected == correct
    
    feedback = AnswerFeedback(question_id=question_id, selected_answer=selected, correct_answer=correct, is_correct=is_correct, explanation=key["explanation"])
    
    db_session.answers.append(feedback.model_dump())
    flag_modified(db_session, "answers")
    
    progress = UserProgress(user_id=user_id, question_id=question_id, selected_answer=selected, is_correct=is_correct)
    db.add(progress)
    
    await db.commit()
    return feedback


async def submit_batch_answers(db: AsyncSession, session_id: str, user_id: int, answers: list) -> list[AnswerFeedback]:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
    
    feedbacks = []
    
    for ans in answers:
        key = db_session.answer_key.get(str(ans.question_id))
        if key is None:
            continue
        selected = ans.selected_answer.upper()
        correct = key["correct_answer"]
        is_correct = selected == correct
        feedback = AnswerFeedback(question_id=ans.question_id, selected_answer=selected, correct_answer=correct, is_correct=is_correct, explanation=key["explanation"])
        feedbacks.append(feedback)
        
        # Check if already answered
        if not any(a["question_id"] == ans.question_id for a in db_session.answers):
            db_session.answers.append(feedback.model_dump())
            progress = UserProgress(user_id=user_id, question_id=ans.question_id, selected_answer=selected, is_correct=is_correct)
            db.add(progress)
            
    flag_modified(db_session, "answers")
    await db.commit()
    return feedbacks


async def pause_quiz(db: AsyncSession, session_id: str, user_id: int, request) -> dict:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
    
    db_session.current_question_index = request.current_question_index
    if request.exam_answers is not None:
        db_session.exam_answers = request.exam_answers
        flag_modified(db_session, "exam_answers")
    if request.flagged_questions is not None:
        db_session.flagged_questions = request.flagged_questions
        flag_modified(db_session, "flagged_questions")
        
    db_session.status = "in_progress"
    
    await db.commit()
    return {"message": "Session paused successfully", "current_question_index": request.current_question_index}


async def submit_exam(db: AsyncSession, session_id: str, user_id: int) -> dict:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
        
    db_session.status = "completed"
    
    total = len(db_session.questions)
    correct = sum(1 for a in db_session.answers if a["is_correct"])
    score = (correct / total * 100) if total > 0 else 0
    
    await db.commit()
    return {"message": "Quiz submitted successfully", "score_percentage": round(score, 1), "status": "completed"}


async def get_quiz_results(db: AsyncSession, session_id: str, user_id: int) -> QuizResultSummary:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
        
    answers = [AnswerFeedback(**a) for a in db_session.answers]
    total = len(db_session.questions)
    correct = sum(1 for a in answers if a.is_correct)
    score = (correct / total * 100) if total > 0 else 0
    
    return QuizResultSummary(session_id=session_id, total_questions=total, correct_count=correct, incorrect_count=total - correct, score_percentage=round(score, 1), answers=answers)


async def get_quiz_session(db: AsyncSession, session_id: str) -> dict | None:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        return None
        
    return {
        "user_id": db_session.user_id,
        "category_id": db_session.category_id,
        "category_name": db_session.category_name,
        "quiz_name": db_session.quiz_name,
        "mode": db_session.mode,
        "questions": [QuizQuestion(**q) for q in db_session.questions],
        "answer_key": db_session.answer_key, # dictionary string keys are fine
        "answers": [AnswerFeedback(**a) for a in db_session.answers],
        "exam_answers": db_session.exam_answers,
        "flagged_questions": db_session.flagged_questions,
        "created_at": db_session.created_at.isoformat() if db_session.created_at else None,
        "status": db_session.status,
        "current_question_index": db_session.current_question_index,
        "time_per_question": db_session.time_per_question
    }


async def get_recent_sessions(db: AsyncSession, user_id: int) -> list:
    query = select(QuizSession).where(QuizSession.user_id == user_id).order_by(QuizSession.created_at.desc()).limit(10)
    result = await db.execute(query)
    sessions = []
    
    for s in result.scalars().all():
        total = len(s.questions)
        correct = sum(1 for a in s.answers if a["is_correct"])
        score = (correct / total * 100) if total > 0 else 0
        
        sessions.append(RecentQuizSession(
            session_id=s.id,
            category_name=s.category_name,
            mode=s.mode,
            total_questions=total,
            score_percentage=round(score, 1),
            created_at=s.created_at.isoformat() if s.created_at else datetime.now(timezone.utc).isoformat(),
            quiz_name=s.quiz_name or s.category_name,
            status=s.status
        ))
    return sessions


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
    from app.models.user import User, UserRole
    from app.models.quota import Quota
    from sqlalchemy.orm import selectinload
    from fastapi import HTTPException
    
    if request.question_count > 150:
        raise ValueError("Cannot request more than 150 questions")

    # Check Quota
    user_db = await db.execute(select(User).options(selectinload(User.quota).selectinload(Quota.categories)).where(User.id == user_id))
    user_loaded = user_db.scalar_one()
    if user_loaded.role == UserRole.STUDENT:
        if not user_loaded.quota_id or not user_loaded.quota:
            raise HTTPException(status_code=403, detail="No quota assigned. Access denied.")
        allowed_category_ids = [cat.id for cat in user_loaded.quota.categories]
        for req_cat_id in request.category_ids:
            if req_cat_id not in allowed_category_ids:
                raise HTTPException(status_code=403, detail=f"Category {req_cat_id} is not in your assigned quota.")

    conds = [
        Question.category_id.in_(request.category_ids),
        Question.status == QuestionStatus.PUBLISHED
    ]
    
    if request.mode == "Unused":
        conds.append(~Question.id.in_(select(UserProgress.question_id).where(UserProgress.user_id == user_id)))
    elif request.mode == "Incorrect":
        conds.append(Question.id.in_(select(UserProgress.question_id).where(UserProgress.user_id == user_id, UserProgress.is_correct == False)))
    elif request.mode == "Bookmarked":
        conds.append(Question.id.in_(select(Bookmark.question_id).where(Bookmark.user_id == user_id)))
        
    count_query = select(func.count(Question.id)).where(*conds)
    available_count = await db.scalar(count_query) or 0
    if request.question_count > available_count:
        raise ValueError(f"Requested {request.question_count} questions but only {available_count} are available")

    query = select(Question).where(*conds).order_by(func.random()).limit(request.question_count)
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
        answer_key[str(q.id)] = {"correct_answer": new_correct, "explanation": q.explanation}
        quiz_questions.append({
            "id": q.id, "question_text": q.question_text, "image_url": q.image_url,
            "option_a": shuffled_opts["option_a"], "option_b": shuffled_opts["option_b"],
            "option_c": shuffled_opts["option_c"], "option_d": shuffled_opts["option_d"],
            "option_e": shuffled_opts.get("option_e"),
        })
        
    db_session = QuizSession(
        id=session_id,
        user_id=user_id,
        category_id=0,
        category_name="Custom Generated Quiz",
        quiz_name=request.quiz_name or "Custom Generated Quiz",
        mode=request.quiz_mode,
        questions=quiz_questions,
        answer_key=answer_key,
        answers=[],
        exam_answers={},
        flagged_questions={},
        status="in_progress",
        current_question_index=0,
        time_per_question=request.time_per_question
    )
    db.add(db_session)
    await db.commit()
    
    q_objects = [QuizQuestion(**q) for q in quiz_questions]
    return QuizSessionResponse(
        session_id=session_id, mode=request.quiz_mode, 
        questions=q_objects, total_questions=len(quiz_questions), 
        category_name="Custom Generated Quiz",
        quiz_name=request.quiz_name or "Custom Generated Quiz",
        status="in_progress", current_question_index=0,
        time_per_question=request.time_per_question
    )


async def rename_quiz_session(db: AsyncSession, session_id: str, user_id: int, new_name: str) -> dict:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
    
    db_session.quiz_name = new_name
    await db.commit()
    return {"message": "Quiz renamed successfully", "quiz_name": new_name}


async def delete_quiz_session(db: AsyncSession, session_id: str, user_id: int) -> dict:
    db_session = await db.get(QuizSession, session_id)
    if db_session is None:
        raise ValueError("Quiz session not found")
    if db_session.user_id != user_id:
        raise ValueError("Not your quiz session")
        
    question_ids = [a["question_id"] for a in db_session.answers]
    
    if question_ids:
        # Check other sessions to avoid deleting progress for questions answered elsewhere
        other_sessions = await db.execute(
            select(QuizSession).where(QuizSession.user_id == user_id, QuizSession.id != session_id)
        )
        
        other_answered_ids = set()
        for sess in other_sessions.scalars().all():
            for a in sess.answers:
                other_answered_ids.add(a["question_id"])
                
        ids_to_delete = [qid for qid in question_ids if qid not in other_answered_ids]
        
        if ids_to_delete:
            await db.execute(
                delete(UserProgress).where(
                    UserProgress.user_id == user_id,
                    UserProgress.question_id.in_(ids_to_delete)
                )
            )
        
    await db.delete(db_session)
    await db.commit()
    return {"message": "Quiz session deleted successfully"}


async def get_user_session_count(db: AsyncSession, user_id: int) -> int:
    query = select(func.count(QuizSession.id)).where(QuizSession.user_id == user_id)
    count = await db.scalar(query)
    return count or 0
