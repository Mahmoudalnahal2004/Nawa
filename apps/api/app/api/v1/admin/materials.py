from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import os
from datetime import datetime

from app.core.deps import get_db, get_current_active_user, RoleChecker
from app.models.user import User
from app.models.study_material import StudyMaterial
from app.models.category import Category
from app.schemas.study_material import StudyMaterialResponse
from app.core.config import settings

from typing import List

router = APIRouter(prefix="/admin/materials", tags=["Admin Study Materials"])
admin_only = RoleChecker(["admin"])

@router.get("", response_model=List[StudyMaterialResponse], dependencies=[Depends(admin_only)])
async def get_all_materials(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    query = select(StudyMaterial).order_by(StudyMaterial.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=StudyMaterialResponse, dependencies=[Depends(admin_only)])
async def upload_material(
    category_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
    
    materials_dir = os.path.join(settings.UPLOAD_DIR, "materials")
    os.makedirs(materials_dir, exist_ok=True)
    
    file_path = os.path.join(materials_dir, safe_filename)
    
    content = await file.read()
    with open(file_path, 'wb') as out_file:
        out_file.write(content)
        
    file_url = f"/uploads/materials/{safe_filename}"
    material = StudyMaterial(
        category_id=category_id,
        title=title,
        file_url=file_url
    )
    db.add(material)
    await db.commit()
    await db.refresh(material)
    
    return material

@router.delete("/{material_id}", dependencies=[Depends(admin_only)])
async def delete_material(
    material_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(StudyMaterial).where(StudyMaterial.id == material_id))
    material = result.scalar_one_or_none()
    
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    try:
        local_path = material.file_url.lstrip("/")
        if os.path.exists(local_path):
            os.remove(local_path)
    except Exception as e:
        print(f"Error deleting file {material.file_url}: {e}")
        
    await db.delete(material)
    await db.commit()
    
    return {"message": "Material deleted successfully"}
