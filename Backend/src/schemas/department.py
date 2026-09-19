from pydantic import BaseModel
from typing import Optional

class DepartmentCreate(BaseModel):
    institution_id : int
    name : str
    description : Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description : Optional[str] = None

class DepartmentOut(BaseModel):
    id:int
    institution_id : int
    name : str
    description :Optional[str] = None

    model_config = {"from_attributes" : True}
