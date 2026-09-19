from pydantic import BaseModel
from typing import Optional

class InstituteCreate(BaseModel):
    name:str
    type:Optional[str] = None
    address: Optional[str] = None
    website : Optional[str] = None

class InstitutionUpdate(BaseModel):
    name:Optional[str] = None
    type:Optional[str] = None
    address:Optional[str] = None
    website:Optional[str] = None

class InstituteOut(BaseModel):
    id:int
    name:str
    type:Optional[str]=None
    address:Optional[str] = None
    website:Optional[str] = None

    model_config = {"from_attributes": True}