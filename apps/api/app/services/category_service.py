from typing import List, Optional

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import Category
from app.models.question import Question
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryTreeResponse


async def create_category(db: AsyncSession, data: CategoryCreate) -> Category:
    """Create a new category."""
    if data.parent_id:
        parent = await get_category_by_id(db, data.parent_id)
        if parent:
            data.target_year = parent.target_year
            data.university = parent.university

    category = Category(
        name=data.name,
        description=data.description or "",
        icon=data.icon or "📚",
        parent_id=data.parent_id,
        target_year=data.target_year,
        university=data.university,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


async def get_categories_tree(db: AsyncSession, target_year: int | None = None, university: str | None = None) -> List[dict]:
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

    query = (
        select(Category, func.coalesce(question_count_subq.c.question_count, 0).label("question_count"))
        .outerjoin(question_count_subq, Category.id == question_count_subq.c.category_id)
    )

    from sqlalchemy import or_
    
    if target_year is not None:
        query = query.where(Category.target_year == target_year)
        
    if university is not None:
        query = query.where(or_(Category.university == None, Category.university == university))

    result = await db.execute(query.order_by(Category.name))

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
            "target_year": cat.target_year,
            "university": cat.university,
            "is_active": cat.is_active,
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

    update_data = data.model_dump(exclude_unset=True)
    
    # Inherit from parent if parent_id is being updated
    if "parent_id" in update_data and update_data["parent_id"]:
        new_parent = await get_category_by_id(db, update_data["parent_id"])
        if new_parent:
            update_data["target_year"] = new_parent.target_year
            update_data["university"] = new_parent.university
    elif category.parent_id and ("target_year" in update_data or "university" in update_data):
        # Prevent overriding parent's target_year/university on a subcategory directly
        parent = await get_category_by_id(db, category.parent_id)
        if parent:
            update_data["target_year"] = parent.target_year
            update_data["university"] = parent.university

    for field, value in update_data.items():
        setattr(category, field, value)

    # Cascade changes to children if target_year or university changes
    if "target_year" in update_data or "university" in update_data:
        children_result = await db.execute(select(Category).where(Category.parent_id == category.id))
        for child in children_result.scalars():
            if "target_year" in update_data:
                child.target_year = update_data["target_year"]
            if "university" in update_data:
                child.university = update_data["university"]

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
