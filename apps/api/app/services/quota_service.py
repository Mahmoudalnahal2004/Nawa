from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from typing import List

from app.models.quota import Quota
from app.models.category import Category
from app.schemas.quota import QuotaCreate, QuotaUpdate


async def get_all_quotas(db: AsyncSession) -> List[Quota]:
    from sqlalchemy import func
    from app.models.user import User
    
    result = await db.execute(
        select(Quota, func.count(User.id).label("student_count"))
        .outerjoin(User, Quota.id == User.quota_id)
        .options(selectinload(Quota.categories))
        .group_by(Quota.id)
    )
    
    quotas = []
    for quota, count in result.all():
        quota.student_count = count
        quotas.append(quota)
        
    return quotas


async def get_quota_by_id(db: AsyncSession, quota_id: int) -> Quota | None:
    result = await db.execute(
        select(Quota).options(selectinload(Quota.categories)).where(Quota.id == quota_id)
    )
    return result.scalar_one_or_none()


async def create_quota(db: AsyncSession, data: QuotaCreate) -> Quota:
    quota = Quota(name=data.name, description=data.description, color=data.color)
    
    if data.category_ids:
        cat_result = await db.execute(select(Category).where(Category.id.in_(data.category_ids)))
        categories = list(cat_result.scalars().all())
        quota.categories = categories

    db.add(quota)
    await db.flush()
    
    # Refresh by re-fetching with options to avoid InvalidRequestError
    stmt = select(Quota).options(selectinload(Quota.categories)).where(Quota.id == quota.id)
    result = await db.execute(stmt)
    return result.scalar_one()


async def update_quota(db: AsyncSession, quota_id: int, data: QuotaUpdate) -> Quota | None:
    quota = await get_quota_by_id(db, quota_id)
    if not quota:
        return None

    if data.name is not None:
        quota.name = data.name
    if data.description is not None:
        quota.description = data.description
    if data.color is not None:
        quota.color = data.color

    if data.category_ids is not None:
        cat_result = await db.execute(select(Category).where(Category.id.in_(data.category_ids)))
        categories = list(cat_result.scalars().all())
        quota.categories = categories

    await db.flush()
    await db.refresh(quota, ["categories"])
    return quota


async def set_default_quota(db: AsyncSession, quota_id: int) -> Quota | None:
    from sqlalchemy import update
    # Ensure quota exists
    quota = await get_quota_by_id(db, quota_id)
    if not quota:
        return None
        
    if quota.is_default:
        quota.is_default = False
    else:
        # Unset all others
        await db.execute(update(Quota).values(is_default=False))
        # Set the target one
        quota.is_default = True
        
    await db.flush()
    await db.refresh(quota, ["categories"])
    return quota


async def delete_quota(db: AsyncSession, quota_id: int) -> bool:
    quota = await get_quota_by_id(db, quota_id)
    if not quota:
        return False
        
    await db.execute(delete(Quota).where(Quota.id == quota_id))
    await db.flush()
    return True
