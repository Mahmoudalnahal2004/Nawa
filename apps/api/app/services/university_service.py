from typing import List

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.university import University
from app.schemas.university import UniversityCreate

async def create_university(db: AsyncSession, data: UniversityCreate) -> University:
    uni = University(name=data.name)
    db.add(uni)
    await db.flush()
    await db.refresh(uni)
    return uni

async def list_universities(db: AsyncSession) -> List[University]:
    result = await db.execute(select(University).order_by(University.name))
    return list(result.scalars().all())

async def delete_university(db: AsyncSession, uni_id: int) -> bool:
    result = await db.execute(delete(University).where(University.id == uni_id))
    await db.flush()
    return result.rowcount > 0
