from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, distinct
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.models.study_material import StudyMaterial
from app.models.category import Category
from app.schemas.study_material import StudyMaterialResponse, CategoryWithMaterialsResponse

router = APIRouter(prefix="/materials", tags=["Student Study Materials"])
student_only = RoleChecker(["student", "admin"])

@router.get("/categories", response_model=List[CategoryWithMaterialsResponse], dependencies=[Depends(student_only)])
async def get_categories_with_materials(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    query = (
        select(Category)
        .join(StudyMaterial, Category.id == StudyMaterial.category_id)
        .group_by(Category.id)
        .order_by(Category.name)
    )
    result = await db.execute(query)
    categories = result.scalars().all()
    
    return categories

@router.get("/category/{category_id}", response_model=List[StudyMaterialResponse], dependencies=[Depends(student_only)])
async def get_materials_by_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    query = (
        select(StudyMaterial)
        .where(StudyMaterial.category_id == category_id)
        .order_by(StudyMaterial.created_at.desc())
    )
    result = await db.execute(query)
    materials = result.scalars().all()
    
    return materials
