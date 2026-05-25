from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    category_id = Column(Integer, nullable=True)
    category_name = Column(String, nullable=True)
    quiz_name = Column(String, nullable=True)
    mode = Column(String, nullable=False)
    status = Column(String, default="in_progress")
    current_question_index = Column(Integer, default=0)
    time_per_question = Column(Integer, default=60)
    
    questions = Column(JSON, default=list)
    answer_key = Column(JSON, default=dict)
    answers = Column(JSON, default=list)
    exam_answers = Column(JSON, default=dict)
    flagged_questions = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=func.now())
