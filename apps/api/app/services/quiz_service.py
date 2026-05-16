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


async def start_quiz(db: AsyncSession, user_id: int, category_id: int, num_questions: int) -> QuizSessionResponse:
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
    _quiz_sessions[session_id] = {
        "user_id": user_id, "category_id": category_id, "category_name": category.name,
        "questions": quiz_questions, "answer_key": answer_key, "answers": [],
    }
    return QuizSessionResponse(session_id=session_id, questions=quiz_questions, total_questions=len(quiz_questions), category_name=category.name)


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
