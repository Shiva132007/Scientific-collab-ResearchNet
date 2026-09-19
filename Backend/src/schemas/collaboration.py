from pydantic import BaseModel
from typing import Optional
from datetime import date

class CollaborationBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = "Active"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    institution_1_id: int
    institution_2_id: int

class CollaborationCreate(CollaborationBase):
    pass

class CollaborationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    institution_1_id: Optional[int] = None
    institution_2_id: Optional[int] = None

class CollaborationOut(CollaborationBase):
    id: int

    model_config = {"from_attributes": True}
