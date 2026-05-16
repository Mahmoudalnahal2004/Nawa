from pydantic import BaseModel
from typing import List, Optional


class OverallProgress(BaseModel):
    total_answered: int
    correct_count: int
    incorrect_count: int
    accuracy_percentage: float


class CategoryProgress(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    total_questions: int
    answered_count: int
    correct_count: int
    accuracy_percentage: float


class WeakPointQuestion(BaseModel):
    question_id: int
    question_text: str
    category_name: str
    times_incorrect: int
    last_attempt: str
