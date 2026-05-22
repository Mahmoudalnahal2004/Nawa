from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.deps import get_db, RoleChecker
from app.schemas.university import UniversityCreate, UniversityResponse
from app.services import university_service

router = APIRouter(prefix="/universities", tags=["Universities"])
admin_only = RoleChecker(["admin"])

@router.get("", response_model=List[UniversityResponse])
async def list_universities(db: AsyncSession = Depends(get_db)):
    """List all universities (publicly accessible)."""
    return await university_service.list_universities(db)

@router.post("", response_model=UniversityResponse, dependencies=[Depends(admin_only)], status_code=status.HTTP_201_CREATED)
async def create_university(data: UniversityCreate, db: AsyncSession = Depends(get_db)):
    """Create a new university (Admin only)."""
    try:
        return await university_service.create_university(db, data)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="University with this name already exists")

@router.delete("/{uni_id}", dependencies=[Depends(admin_only)], status_code=status.HTTP_204_NO_CONTENT)
async def delete_university(uni_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a university (Admin only)."""
    success = await university_service.delete_university(db, uni_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")
