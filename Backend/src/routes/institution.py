from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.institution import InstituteCreate, InstitutionUpdate, InstituteOut
from services import institution
from middleware.auth import get_current_user, require_roles
from models.user import User

router = APIRouter(prefix="/institutions", tags=['Institutions'])

@router.post("/", response_model=InstituteOut)
def create_institution(
    data: InstituteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return institution.create_institution(db, data)

@router.get('/', response_model=list[InstituteOut])
def list_institutions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return institution.get_all_institutes(db)

@router.get("/{institution_id}", response_model=InstituteOut)
def get_institution(institution_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return institution.get_institution_by_id(db, institution_id)

@router.put('/', response_model=InstituteOut)
def update_institution(
    institution_id: int,
    data: InstitutionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return institution.update_institution(db, institution_id, data)

@router.delete("/{institution_id}")
def delete_institution(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return institution.delete_institution(db, institution_id)

