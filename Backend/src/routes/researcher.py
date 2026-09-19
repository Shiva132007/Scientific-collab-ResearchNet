from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db
from schemas.researcher import ResearcherCreate, ResearcherOut, ResearcherUpdate, ResearcherMeOut
from services import researcher
from middleware.auth import get_current_user, check_researcher_write_permission, require_roles
from models.user import User

router = APIRouter(prefix="/researchers", tags=["Researchers"])

@router.get("/me", response_model=ResearcherMeOut)
def get_my_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return researcher.get_my_profile(db, current_user.id)

@router.put("/me", response_model=ResearcherMeOut)
def update_my_profile(data: ResearcherUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return researcher.update_my_profile(db, current_user.id, data)

@router.get("/discover", response_model=list[dict])
def discover_researchers(
    query: Optional[str] = None,
    institution_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return researcher.discover_researchers(db, query=query, institution_id=institution_id, department_id=department_id)

@router.get("/orcid-lookup/{orcid_id:path}")
def lookup_orcid(orcid_id: str, current_user: User = Depends(get_current_user)):
    return researcher.fetch_orcid_profile(orcid_id)

@router.post("/", response_model=ResearcherOut)
def create_researcher(
    data: ResearcherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return researcher.create_researcher(db, data, current_user.id)

@router.get("/", response_model=list[ResearcherOut])
def list_researchers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return researcher.get_all_researcher(db)

@router.get("/{researcher_id}", response_model=ResearcherOut)
def get_researcher(researcher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return researcher.get_researcher_by_id(db, researcher_id)

@router.put("/{researcher_id}", response_model=ResearcherOut)
def update_researcher(researcher_id: int, data: ResearcherUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_researcher_write_permission(db, researcher_id, current_user)
    return researcher.update_researcher(db, researcher_id, data)

@router.delete("/{researcher_id}")
def delete_researcher(researcher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_researcher_write_permission(db, researcher_id, current_user)
    return researcher.delete_researcher(db, researcher_id)

