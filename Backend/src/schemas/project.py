from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from .researcher import ResearcherOut

class ProjectMemberBase(BaseModel):
    researcher_id: int
    role: Optional[str] = "Contributor"

class ProjectMemberCreate(ProjectMemberBase):
    pass

class ProjectMemberOut(ProjectMemberBase):
    id: int
    project_id: int
    researcher: Optional[ResearcherOut] = None

    model_config = {"from_attributes": True}

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    funding_agency: Optional[str] = None
    budget: Optional[float] = 0.0
    status: Optional[str] = "Proposed"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    institution_id: Optional[int] = None
    visible_to_others: Optional[bool] = True

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    funding_agency: Optional[str] = None
    budget: Optional[float] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    institution_id: Optional[int] = None
    visible_to_others: Optional[bool] = None

class ProjectOut(ProjectBase):
    id: int
    created_by: Optional[int] = None
    creator: Optional[ResearcherOut] = None
    members: List[ProjectMemberOut] = []

    model_config = {"from_attributes": True}
