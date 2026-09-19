from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.conference import ConferenceCreate, ConferenceUpdate, ConferenceOut, ConferenceParticipationCreate, ConferenceParticipationOut
from services import conference, audit
from middleware.auth import get_current_user, require_roles, get_user_role_str
from models.user import User
from models.researcher import Researcher

router = APIRouter(prefix="/conferences", tags=["Conferences"])

def check_participation_permission(db: Session, researcher_id: int, current_user: User):
    role_str = get_user_role_str(current_user)
    if role_str in ["SystemAdmin", "InstitutionAdmin"]:
        return True

    user_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
    if user_res and user_res.id == researcher_id:
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permission denied: You can only manage your own conference participation."
    )

@router.post("/", response_model=ConferenceOut)
def create_conference(
    data: ConferenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    conf = conference.create_conference(db, data)
    audit.log_action(db, current_user.id, "CREATE_CONFERENCE", "conferences", conf.id, f"Created conference: {conf.name}")
    return conf

@router.get("/", response_model=list[ConferenceOut])
def list_conferences(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return conference.get_all_conferences(db)

@router.get("/{conference_id}", response_model=ConferenceOut)
def get_conference(conference_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return conference.get_conference_by_id(db, conference_id)

@router.put("/{conference_id}", response_model=ConferenceOut)
def update_conference(
    conference_id: int,
    data: ConferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    conf = conference.update_conference(db, conference_id, data)
    audit.log_action(db, current_user.id, "UPDATE_CONFERENCE", "conferences", conf.id, f"Updated conference details: {conf.name}")
    return conf

@router.delete("/{conference_id}")
def delete_conference(
    conference_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    res = conference.delete_conference(db, conference_id)
    audit.log_action(db, current_user.id, "DELETE_CONFERENCE", "conferences", conference_id, f"Deleted conference id: {conference_id}")
    return res

@router.post("/{conference_id}/participations", response_model=ConferenceParticipationOut)
def register_participation(
    conference_id: int,
    data: ConferenceParticipationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_participation_permission(db, data.researcher_id, current_user)
    part = conference.register_participation(db, conference_id, data)
    audit.log_action(db, current_user.id, "REGISTER_CONFERENCE_PARTICIPATION", "conference_participations", part.id, f"Registered researcher {data.researcher_id} for conference {conference_id}")
    return part

@router.delete("/{conference_id}/participations/{researcher_id}")
def remove_participation(
    conference_id: int,
    researcher_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_participation_permission(db, researcher_id, current_user)
    res = conference.remove_participation(db, conference_id, researcher_id)
    audit.log_action(db, current_user.id, "REMOVE_CONFERENCE_PARTICIPATION", "conference_participations", None, f"Removed researcher {researcher_id} from conference {conference_id}")
    return res

