from sqlalchemy import Column, ForeignKey, Integer, String, Table, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Association table for Quota and Category
quota_category = Table(
    "quota_category",
    Base.metadata,
    Column("quota_id", Integer, ForeignKey("quotas.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Integer, ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Quota(Base):
    __tablename__ = "quotas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True, default=None)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True, default="#10b981")

    # Relationships
    categories = relationship("Category", secondary=quota_category, backref="quotas")
    users = relationship("User", back_populates="quota")

    def __repr__(self) -> str:
        return f"<Quota(id={self.id}, name='{self.name}')>"
