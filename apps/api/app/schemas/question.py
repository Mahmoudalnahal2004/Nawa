from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime


class QuestionCreate(BaseModel):
    category_id: int
    question_text: str
    image_url: Optional[str] = None
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: Optional[str] = ""
    correct_answer: str
    explanation: Optional[str] = ""
    difficulty: str = "medium"
    status: str = "draft"

    @field_validator("correct_answer")
    @classmethod
    def validate_correct_answer(cls, v):
        if v.upper() not in ["A", "B", "C", "D", "E"]:
            raise ValueError("Correct answer must be A, B, C, D, or E")
        return v.upper()


class QuestionUpdate(BaseModel):
    category_id: Optional[int] = None
    question_text: Optional[str] = None
    image_url: Optional[str] = None
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    option_e: Optional[str] = None
    correct_answer: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None

    @field_validator("correct_answer")
    @classmethod
    def validate_correct_answer(cls, v):
        if v is not None and v.upper() not in ["A", "B", "C", "D", "E"]:
            raise ValueError("Correct answer must be A, B, C, D, or E")
        return v.upper() if v else v


class QuestionResponse(BaseModel):
    id: int
    category_id: int
    category_name: Optional[str] = None
    question_text: str
    image_url: Optional[str]
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    option_e: Optional[str]
    correct_answer: str
    explanation: Optional[str]
    difficulty: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionListResponse(BaseModel):
    questions: List[QuestionResponse]
    total: int
    page: int
    page_size: int


class ImportError_(BaseModel):
    row: int
    reason: str


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: List[ImportError_]
