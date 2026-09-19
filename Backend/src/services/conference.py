from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.conference import Conference, ConferenceParticipation
from schemas.conference import ConferenceCreate, ConferenceUpdate, ConferenceParticipationCreate

def create_conference(db: Session, data: ConferenceCreate) -> Conference:
    new_conf = Conference(**data.model_dump())
    db.add(new_conf)
    db.commit()
    db.refresh(new_conf)
    return new_conf

def get_all_conferences(db: Session):
    return db.query(Conference).all()

def get_conference_by_id(db: Session, conference_id: int) -> Conference:
    conf = db.query(Conference).filter(Conference.id == conference_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Conference not found")
    return conf

def update_conference(db: Session, conference_id: int, updates: ConferenceUpdate) -> Conference:
    conf = get_conference_by_id(db, conference_id)
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(conf, key, value)
    db.commit()
    db.refresh(conf)
    return conf

def delete_conference(db: Session, conference_id: int):
    conf = get_conference_by_id(db, conference_id)
    db.delete(conf)
    db.commit()
    return {"detail": "Conference deleted successfully"}

def register_participation(db: Session, conference_id: int, data: ConferenceParticipationCreate) -> ConferenceParticipation:
    get_conference_by_id(db, conference_id)
    existing = db.query(ConferenceParticipation).filter(
        ConferenceParticipation.conference_id == conference_id,
        ConferenceParticipation.researcher_id == data.researcher_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Researcher already registered for this conference")
    
    new_part = ConferenceParticipation(
        conference_id=conference_id,
        researcher_id=data.researcher_id,
        role=data.role,
        paper_title=data.paper_title,
        presentation_time=data.presentation_time
    )
    db.add(new_part)
    db.commit()
    db.refresh(new_part)
    return new_part

def remove_participation(db: Session, conference_id: int, researcher_id: int):
    part = db.query(ConferenceParticipation).filter(
        ConferenceParticipation.conference_id == conference_id,
        ConferenceParticipation.researcher_id == researcher_id
    ).first()
    if not part:
        raise HTTPException(status_code=404, detail="Participation not found")
    db.delete(part)
    db.commit()
    return {"detail": "Participation removed from conference"}
