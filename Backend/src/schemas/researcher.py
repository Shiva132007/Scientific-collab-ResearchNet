from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ResearcherCreate(BaseModel):
    institution_id : Optional[int] = None
    department_id : Optional[int] = None
    full_name : str
    bio : Optional[str] = None
    research_interests : Optional[str] = None
    skills : Optional[str] = None
    orcid_id :Optional[str] = None

class ResearcherUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    research_interests: Optional[str] = None
    skills: Optional[str] = None
    orcid_id: Optional[str] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None

class ResearcherOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    full_name: str
    bio: Optional[str] = None
    research_interests: Optional[str] = None
    skills: Optional[str] = None
    orcid_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class ResearcherMeOut(BaseModel):
    id: int
    user_id: int
    email: str
    role: str
    full_name: str
    bio: Optional[str] = None
    research_interests: Optional[str] = None
    skills: Optional[str] = None
    orcid_id: Optional[str] = None
    institution_id: Optional[int] = None
    department_id: Optional[int] = None
    institution_name: Optional[str] = None
    department_name: Optional[str] = None
    publication_count: int = 0
    project_count: int = 0
    collaboration_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": False}
