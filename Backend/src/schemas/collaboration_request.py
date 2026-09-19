from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CollaborationRequestCreate(BaseModel):
    to_user_id: int
    request_type: str          # "project_invite" | "coauthor_invite"
    related_id: Optional[int] = None
    message: Optional[str] = None


class CollaborationRequestOut(BaseModel):
    id: int
    from_user_id: int
    to_user_id: int
    request_type: str
    related_id: Optional[int] = None
    message: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Enriched display fields (populated by the service layer, not DB columns)
    from_user_name: Optional[str] = None
    related_title: Optional[str] = None

    model_config = {"from_attributes": False}  # We return dicts from enriched queries
