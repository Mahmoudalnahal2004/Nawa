from pydantic import BaseModel
from typing import List, Optional


class OverallProgress(BaseModel):
    total_answered: int
    correct_count: int
    incorrect_count: int
    accuracy_percentage: float
    weak_points_count: int
    rank: Optional[int] = None


class CategoryProgress(BaseModel):
    category_id: int
    category_name: str
    category_icon: str
    total_questions: int
    answered_count: int
    correct_count: int
    accuracy_percentage: float
    strongest_subcategory: Optional[str] = None
    weakest_subcategory: Optional[str] = None


class WeakPointQuestion(BaseModel):
    question_id: int
    question_text: str
    category_name: str
    times_incorrect: int
    last_attempt: str

class RecentQuizSession(BaseModel):
    session_id: str
    category_name: str
    mode: str
    total_questions: int
    score_percentage: float
    created_at: str
    quiz_name: Optional[str] = None
    status: str
    target_year: Optional[int] = None

class AnalyticsDashboardResponse(BaseModel):
    overall: OverallProgress
    categories: List[CategoryProgress]
    recent_sessions: List[RecentQuizSession]


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    display_name: str
    correct_count: int
    total_answered: int
    accuracy_percentage: float
