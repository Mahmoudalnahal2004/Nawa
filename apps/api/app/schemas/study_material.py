from pydantic import BaseModel
from datetime import datetime

class StudyMaterialBase(BaseModel):
    category_id: int
    title: str

class StudyMaterialCreate(StudyMaterialBase):
    pass

class StudyMaterialResponse(StudyMaterialBase):
    id: int
    file_url: str
    created_at: datetime

    class Config:
        from_attributes = True

class CategoryWithMaterialsResponse(BaseModel):
    id: int
    name: str
    icon: str | None
    
    class Config:
        from_attributes = True
