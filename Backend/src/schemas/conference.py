from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class ConferenceParticipationBase(BaseModel):
    researcher_id: int
    role: Optional[str] = "Attendee"
    paper_title: Optional[str] = None
    presentation_time: Optional[datetime] = None

class ConferenceParticipationCreate(ConferenceParticipationBase):
    pass

class ConferenceParticipationOut(ConferenceParticipationBase):
    id: int
    conference_id: int

    model_config = {"from_attributes": True}

class ConferenceBase(BaseModel):
    name: str
    acronym: Optional[str] = None
    year: Optional[int] = None
    location: Optional[str] = None
    website: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ConferenceCreate(ConferenceBase):
    pass

class ConferenceUpdate(BaseModel):
    name: Optional[str] = None
    acronym: Optional[str] = None
    year: Optional[int] = None
    location: Optional[str] = None
    website: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class ConferenceOut(ConferenceBase):
    id: int
    participations: List[ConferenceParticipationOut] = []

    model_config = {"from_attributes": True}
