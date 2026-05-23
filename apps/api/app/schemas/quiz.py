from pydantic import BaseModel
from typing import Optional, List, Literal

class QuizStartRequest(BaseModel):
    category_id: int
    num_questions: int
    mode: Literal['practice', 'exam'] = 'practice'


class QuizQuestion(BaseModel):
    id: int
    question_text: str
    image_url: Optional[str]
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: Optional[str]
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None


class QuizSessionResponse(BaseModel):
    session_id: str
    mode: Literal['practice', 'exam'] = 'practice'
    questions: List[QuizQuestion]
    total_questions: int
    category_name: str
    current_question_index: int = 0
    status: str = 'in_progress'


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


class BatchAnswerRequest(BaseModel):
    answers: List[AnswerRequest]


class QuizAvailabilityRequest(BaseModel):
    mode: Literal['Unused', 'Incorrect', 'Bookmarked', 'All']


class QuizGenerateRequest(BaseModel):
    category_ids: List[int]
    question_count: int
    mode: Literal['Unused', 'Incorrect', 'Bookmarked', 'All']
    quiz_mode: Literal['practice', 'exam'] = 'practice'


class PauseSessionRequest(BaseModel):
    current_question_index: int
