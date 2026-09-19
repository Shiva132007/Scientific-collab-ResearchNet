from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.institution import Institution
from schemas.institution import InstituteCreate, InstitutionUpdate

def create_institution(db:Session, data:InstituteCreate)->Institution:
    new_institution = Institution(**data.dict())
    db.add(new_institution)
    db.commit()
    db.refresh(new_institution)
    return new_institution

def get_all_institutes(db:Session):
    return db.query(Institution).all()

def get_institution_by_id (db: Session, institution_id : int)-> Institution:
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    if not institution:
        raise HTTPException(status_code=404, detail="Institution is not found")
    return institution

def update_institution(db:Session, institution_id : int, updates: InstitutionUpdate)->Institution:
    institution = get_institution_by_id(db,institution_id)
    for key,value in updates.dict(exclude_unset=True).items():
        setattr(institution, key, value)
    db.commit()
    db.refresh(institution)
    return institution

def delete_institution(db:Session, institution_id : int):
    institution = get_institution_by_id(db,institution_id)
    db.delete(institution)
    db.commit()
    return {"detail" : "Institution deleted successfully"}
