from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from middleware.auth import get_current_user
from models.user import User
from schemas.collaboration_request import CollaborationRequestCreate, CollaborationRequestOut
from services import collaboration_request as req_service

router = APIRouter(prefix="/collaboration-requests", tags=["Collaboration Requests"])


@router.post("/", response_model=CollaborationRequestOut)
def send_request(
    data: CollaborationRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a collaboration invitation to another user."""
    return req_service.send_request(db, current_user.id, data)


@router.get("/sent", response_model=list[CollaborationRequestOut])
def get_sent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all collaboration requests sent by the authenticated user."""
    return req_service.get_sent_requests(db, current_user.id)


@router.get("/incoming", response_model=list[CollaborationRequestOut])
def get_incoming(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all collaboration requests received by the authenticated user, enriched with sender name."""
    return req_service.get_incoming_requests(db, current_user.id)


@router.put("/{request_id}/accept", response_model=CollaborationRequestOut)
def accept_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept an incoming collaboration request."""
    return req_service.respond_to_request(db, request_id, current_user.id, accept=True)


@router.put("/{request_id}/decline", response_model=CollaborationRequestOut)
def decline_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Decline an incoming collaboration request."""
    return req_service.respond_to_request(db, request_id, current_user.id, accept=False)
