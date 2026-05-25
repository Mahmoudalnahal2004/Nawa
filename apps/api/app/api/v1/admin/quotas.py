from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.deps import get_db, RoleChecker
from app.schemas.quota import QuotaCreate, QuotaUpdate, QuotaResponse
from app.services import quota_service

router = APIRouter(prefix="/quotas", tags=["Admin - Quotas"])
admin_only = RoleChecker(["admin"])


@router.get("", response_model=List[QuotaResponse], dependencies=[Depends(admin_only)])
async def list_quotas(db: AsyncSession = Depends(get_db)):
    quotas = await quota_service.get_all_quotas(db)
    return quotas


@router.get("/{quota_id}", response_model=QuotaResponse, dependencies=[Depends(admin_only)])
async def get_quota(quota_id: int, db: AsyncSession = Depends(get_db)):
    quota = await quota_service.get_quota_by_id(db, quota_id)
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    return quota


@router.post("", response_model=QuotaResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(admin_only)])
async def create_quota(data: QuotaCreate, db: AsyncSession = Depends(get_db)):
    quota = await quota_service.create_quota(db, data)
    return quota


@router.put("/{quota_id}", response_model=QuotaResponse, dependencies=[Depends(admin_only)])
async def update_quota(quota_id: int, data: QuotaUpdate, db: AsyncSession = Depends(get_db)):
    quota = await quota_service.update_quota(db, quota_id, data)
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    return quota


@router.put("/{quota_id}/default", response_model=QuotaResponse, dependencies=[Depends(admin_only)])
async def set_default_quota(quota_id: int, db: AsyncSession = Depends(get_db)):
    quota = await quota_service.set_default_quota(db, quota_id)
    if not quota:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    return quota


@router.delete("/{quota_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(admin_only)])
async def delete_quota(quota_id: int, db: AsyncSession = Depends(get_db)):
    success = await quota_service.delete_quota(db, quota_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quota not found")
    return
