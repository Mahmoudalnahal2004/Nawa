import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Difficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuestionStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    option_e: Mapped[str] = mapped_column(Text, nullable=True, default="")
    correct_answer: Mapped[str] = mapped_column(String(1), nullable=False)  # A, B, C, D, or E
    explanation: Mapped[str] = mapped_column(Text, nullable=True, default="")
    difficulty: Mapped[Difficulty] = mapped_column(
        String(20),
        nullable=False,
        default=Difficulty.MEDIUM,
    )
    status: Mapped[QuestionStatus] = mapped_column(
        String(20),
        nullable=False,
        default=QuestionStatus.DRAFT,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    category = relationship("Category", back_populates="questions")
    progress_records = relationship("UserProgress", back_populates="question")

    def __repr__(self) -> str:
        return f"<Question(id={self.id}, status='{self.status}')>"
