from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.collaboration import CollaborationCreate, CollaborationUpdate, CollaborationOut
from services import collaboration, audit
from middleware.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/collaborations", tags=["Collaborations"])

@router.post("/", response_model=CollaborationOut)
def create_collaboration(data: CollaborationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    collab = collaboration.create_collaboration(db, data)
    audit.log_action(db, current_user.id, "CREATE_COLLABORATION", "collaborations", collab.id, f"Created collaboration: {collab.title}")
    return collab

@router.get("/", response_model=list[CollaborationOut])
def list_collaborations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return collaboration.get_all_collaborations(db)

@router.get("/network-graph")
def get_network_graph(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return collaboration.get_network_graph(db)

@router.get("/{collaboration_id}", response_model=CollaborationOut)
def get_collaboration(collaboration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return collaboration.get_collaboration_by_id(db, collaboration_id)

@router.put("/{collaboration_id}", response_model=CollaborationOut)
def update_collaboration(collaboration_id: int, data: CollaborationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    collab = collaboration.update_collaboration(db, collaboration_id, data)
    audit.log_action(db, current_user.id, "UPDATE_COLLABORATION", "collaborations", collab.id, f"Updated collaboration details: {collab.title}")
    return collab

@router.delete("/{collaboration_id}")
def delete_collaboration(collaboration_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = collaboration.delete_collaboration(db, collaboration_id)
    audit.log_action(db, current_user.id, "DELETE_COLLABORATION", "collaborations", collaboration_id, f"Deleted collaboration id: {collaboration_id}")
    return res
