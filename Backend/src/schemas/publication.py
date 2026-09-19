from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from .researcher import ResearcherOut

class PublicationCreate(BaseModel):
    title: str
    type: Optional[str] = None
    status: Optional[str] = "Draft"
    abstract: Optional[str] = None
    publication_date: Optional[date] = None
    doi: Optional[str] = None
    file_url: Optional[str] = None
    visible_to_others: Optional[bool] = False

class PublicationUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    abstract: Optional[str] = None
    publication_date: Optional[date] = None
    doi: Optional[str] = None
    file_url: Optional[str] = None
    visible_to_others: Optional[bool] = None

class PublicationStatusUpdate(BaseModel):
    status: str  # Draft, Submitted, Published, Archived

class PublicationAuthorCreate(BaseModel):
    researcher_id: int
    author_order: Optional[int] = None
    is_corresponding_author: Optional[bool] = False

class PublicationAuthorOut(BaseModel):
    id: int
    publication_id: int
    researcher_id: int
    author_order: Optional[int] = None
    is_corresponding_author: Optional[bool] = None
    researcher: Optional[ResearcherOut] = None

    model_config = {"from_attributes": True}

class PublicationOut(BaseModel):
    id: int
    title: str
    type: Optional[str] = None
    status: Optional[str] = None
    abstract: Optional[str] = None
    publication_date: Optional[date] = None
    doi: Optional[str] = None
    file_url: Optional[str] = None
    uploaded_by: Optional[int] = None
    visible_to_others: Optional[bool] = False
    created_at: datetime
    authors: List[PublicationAuthorOut] = []

    model_config = {"from_attributes": True}