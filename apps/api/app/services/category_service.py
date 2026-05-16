from typing import List, Optional

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.models.question import Question
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryTreeResponse


async def create_category(db: AsyncSession, data: CategoryCreate) -> Category:
    """Create a new category."""
    category = Category(
        name=data.name,
        description=data.description or "",
        icon=data.icon or "📚",
        parent_id=data.parent_id,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


async def get_categories_tree(db: AsyncSession) -> List[dict]:
    """Get all categories as a flat list with question counts."""
    # Subquery for question counts
    question_count_subq = (
        select(
            Question.category_id,
            func.count(Question.id).label("question_count"),
        )
        .group_by(Question.category_id)
        .subquery()
    )

    result = await db.execute(
        select(Category, func.coalesce(question_count_subq.c.question_count, 0).label("question_count"))
        .outerjoin(question_count_subq, Category.id == question_count_subq.c.category_id)
        .order_by(Category.name)
    )

    categories = []
    for row in result.all():
        cat = row[0]
        count = row[1]
        categories.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "parent_id": cat.parent_id,
            "created_at": cat.created_at,
            "question_count": count,
        })

    return categories


async def build_category_tree(categories: List[dict]) -> List[dict]:
    """Build a hierarchical tree from a flat list of categories."""
    by_id = {c["id"]: {**c, "children": []} for c in categories}
    tree = []
    for c in by_id.values():
        if c["parent_id"] and c["parent_id"] in by_id:
            by_id[c["parent_id"]]["children"].append(c)
        else:
            tree.append(c)
    return tree


async def update_category(db: AsyncSession, category_id: int, data: CategoryUpdate) -> Category | None:
    """Update an existing category."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if category is None:
        return None

    if data.name is not None:
        category.name = data.name
    if data.description is not None:
        category.description = data.description
    if data.icon is not None:
        category.icon = data.icon
    if data.parent_id is not None:
        category.parent_id = data.parent_id

    await db.flush()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category_id: int) -> bool:
    """Delete a category if it has no questions."""
    # Check for questions
    q_count = await db.execute(
        select(func.count(Question.id)).where(Question.category_id == category_id)
    )
    if q_count.scalar_one() > 0:
        return False

    await db.execute(delete(Category).where(Category.id == category_id))
    await db.flush()
    return True


async def get_category_by_id(db: AsyncSession, category_id: int) -> Category | None:
    """Fetch a single category by ID."""
    result = await db.execute(select(Category).where(Category.id == category_id))
    return result.scalar_one_or_none()
