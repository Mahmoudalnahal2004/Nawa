from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.core.deps import get_db, RoleChecker, get_current_active_user
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["Categories"])
admin_only = RoleChecker(["admin"])


@router.get("", response_model=List[dict])
async def list_categories(
    target_year: int | None = None,
    university: str | None = None,
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_active_user)
):
    categories = await category_service.get_categories_tree(db, target_year=target_year, university=university)
    return categories


@router.get("/tree")
async def get_category_tree(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_active_user)):
    categories = await category_service.get_categories_tree(db)
    tree = await category_service.build_category_tree(categories)
    return tree


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_only)])
async def create_category(data: CategoryCreate, db: AsyncSession = Depends(get_db)):
    cat = await category_service.create_category(db, data)
    return {"id": cat.id, "name": cat.name, "description": cat.description, "icon": cat.icon, "parent_id": cat.parent_id, "created_at": cat.created_at}


@router.put("/{category_id}", response_model=dict, dependencies=[Depends(admin_only)])
async def update_category(category_id: int, data: CategoryUpdate, db: AsyncSession = Depends(get_db)):
    cat = await category_service.update_category(db, category_id, data)
    if cat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return {"id": cat.id, "name": cat.name, "description": cat.description, "icon": cat.icon, "parent_id": cat.parent_id, "created_at": cat.created_at}


@router.delete("/{category_id}", dependencies=[Depends(admin_only)])
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    success = await category_service.delete_category(db, category_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete category with existing questions")
    return {"detail": "Category deleted"}
