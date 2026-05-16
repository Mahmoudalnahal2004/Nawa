from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuizStartRequest(BaseModel):
    category_id: int
    num_questions: int


class QuizQuestion(BaseModel):
    id: int
    question_text: str
    image_url: Optional[str]
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: Optional[str]
    # Note: correct_answer is NOT included — revealed after answering


class QuizSessionResponse(BaseModel):
    session_id: str
    questions: List[QuizQuestion]
    total_questions: int
    category_name: str


class AnswerRequest(BaseModel):
    question_id: int
    selected_answer: str


class AnswerFeedback(BaseModel):
    question_id: int
    selected_answer: str
    correct_answer: str
    is_correct: bool
    explanation: Optional[str]


class QuizResultSummary(BaseModel):
    session_id: str
    total_questions: int
    correct_count: int
    incorrect_count: int
    score_percentage: float
    answers: List[AnswerFeedback]
