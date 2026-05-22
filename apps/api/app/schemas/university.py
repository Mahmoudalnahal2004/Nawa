from pydantic import BaseModel

class UniversityBase(BaseModel):
    name: str

class UniversityCreate(UniversityBase):
    pass

class UniversityResponse(UniversityBase):
    id: int

    class Config:
        from_attributes = True
