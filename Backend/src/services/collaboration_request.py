from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.collaboration_request import CollaborationRequest
from models.project import Project, ProjectMember
from models.publication import Publication, PublicationAuthor
from models.researcher import Researcher
from models.user import User
from schemas.collaboration_request import CollaborationRequestCreate
from services import notification as notif_service


def get_or_create_researcher(db: Session, user_id: int) -> Researcher:
    researcher = db.query(Researcher).filter(Researcher.user_id == user_id).first()
    if not researcher:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            name_part = user.email.split('@')[0]
            parts = name_part.replace('.', ' ').replace('_', ' ').replace('-', ' ').split()
            display_name = ' '.join(p.capitalize() for p in parts) if parts else user.email
            researcher = Researcher(
                user_id=user.id,
                full_name=display_name,
                bio=f"Registered profile for {display_name}.",
            )
            db.add(researcher)
            db.commit()
            db.refresh(researcher)
    return researcher


def send_request(
    db: Session,
    from_user_id: int,
    data: CollaborationRequestCreate,
) -> CollaborationRequest:
    """Create a new collaboration request and notify the recipient."""
    if from_user_id == data.to_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send a collaboration request to yourself.",
        )

    # Prevent duplicate pending requests of the same type to the same person
    existing = (
        db.query(CollaborationRequest)
        .filter(
            CollaborationRequest.from_user_id == from_user_id,
            CollaborationRequest.to_user_id == data.to_user_id,
            CollaborationRequest.request_type == data.request_type,
            CollaborationRequest.related_id == data.related_id,
            CollaborationRequest.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending request of this type already exists.",
        )

    req = CollaborationRequest(
        from_user_id=from_user_id,
        to_user_id=data.to_user_id,
        request_type=data.request_type,
        related_id=data.related_id,
        message=data.message,
        status="pending",
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Resolve sender display name for the notification
    sender_researcher = db.query(Researcher).filter(Researcher.user_id == from_user_id).first()
    sender_user = db.query(User).filter(User.id == from_user_id).first()
    if sender_researcher and sender_researcher.full_name:
        sender_name = sender_researcher.full_name
    elif sender_user:
        name_part = sender_user.email.split('@')[0]
        parts = name_part.replace('.', ' ').replace('_', ' ').replace('-', ' ').split()
        sender_name = ' '.join(p.capitalize() for p in parts) if parts else sender_user.email
    else:
        sender_name = "A researcher"

    # Resolve related item title
    related_title = ""
    if data.request_type == "project_invite" and data.related_id:
        proj = db.query(Project).filter(Project.id == data.related_id).first()
        if proj:
            related_title = f' for project "{proj.title}"'
    elif data.request_type == "coauthor_invite" and data.related_id:
        pub = db.query(Publication).filter(Publication.id == data.related_id).first()
        if pub:
            related_title = f' for publication "{pub.title}"'

    # Notify recipient with sender name included
    type_label = "project collaboration request" if data.request_type == "project_invite" else "co-authorship proposal"
    notif_service.create_notification(
        db=db,
        user_id=data.to_user_id,
        title=f"📩 New {type_label} from {sender_name}",
        message=data.message or f"{sender_name} sent you a {type_label}{related_title}. Go to Notifications to accept or decline.",
        type="request",
        related_id=req.id,
    )

    return req


def get_sent_requests(db: Session, user_id: int) -> list[CollaborationRequest]:
    return (
        db.query(CollaborationRequest)
        .filter(CollaborationRequest.from_user_id == user_id)
        .order_by(CollaborationRequest.created_at.desc())
        .all()
    )


def get_incoming_requests(db: Session, user_id: int) -> list[dict]:
    """Return enriched incoming requests with sender name and related item title."""
    reqs = (
        db.query(CollaborationRequest)
        .filter(CollaborationRequest.to_user_id == user_id)
        .order_by(CollaborationRequest.created_at.desc())
        .all()
    )
    results = []
    for req in reqs:
        # Resolve sender name
        sender_researcher = db.query(Researcher).filter(Researcher.user_id == req.from_user_id).first()
        sender_user = db.query(User).filter(User.id == req.from_user_id).first()
        if sender_researcher and sender_researcher.full_name:
            from_user_name = sender_researcher.full_name
        elif sender_user:
            name_part = sender_user.email.split('@')[0]
            parts = name_part.replace('.', ' ').replace('_', ' ').replace('-', ' ').split()
            from_user_name = ' '.join(p.capitalize() for p in parts) if parts else sender_user.email
        else:
            from_user_name = f"User #{req.from_user_id}"

        # Resolve related item title
        related_title = None
        if req.request_type == "project_invite" and req.related_id:
            proj = db.query(Project).filter(Project.id == req.related_id).first()
            if proj:
                related_title = proj.title
        elif req.request_type == "coauthor_invite" and req.related_id:
            pub = db.query(Publication).filter(Publication.id == req.related_id).first()
            if pub:
                related_title = pub.title

        results.append({
            "id": req.id,
            "from_user_id": req.from_user_id,
            "to_user_id": req.to_user_id,
            "request_type": req.request_type,
            "related_id": req.related_id,
            "message": req.message,
            "status": req.status,
            "created_at": req.created_at,
            "updated_at": req.updated_at,
            "from_user_name": from_user_name,
            "related_title": related_title,
        })
    return results


def respond_to_request(
    db: Session,
    request_id: int,
    user_id: int,
    accept: bool,
) -> CollaborationRequest:
    """Accept or decline an incoming collaboration request."""
    req = (
        db.query(CollaborationRequest)
        .filter(
            CollaborationRequest.id == request_id,
            CollaborationRequest.to_user_id == user_id,
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found.")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request has already been responded to.")

    req.status = "accepted" if accept else "declined"
    db.commit()
    db.refresh(req)

    # If accepted project invite/request → auto-assign non-creator researcher as project member
    if accept and req.request_type == "project_invite" and req.related_id:
        proj = db.query(Project).filter(Project.id == req.related_id).first()
        for candidate_uid in [req.from_user_id, req.to_user_id]:
            if proj and candidate_uid == proj.created_by:
                continue
            res = get_or_create_researcher(db, candidate_uid)
            if res:
                already_member = (
                    db.query(ProjectMember)
                    .filter(
                        ProjectMember.project_id == req.related_id,
                        ProjectMember.researcher_id == res.id,
                    )
                    .first()
                )
                if not already_member:
                    member = ProjectMember(
                        project_id=req.related_id,
                        researcher_id=res.id,
                        role="Contributor",
                    )
                    db.add(member)
                    db.commit()

    # If accepted coauthor invite/request → auto-add non-uploader as publication author
    if accept and req.request_type == "coauthor_invite" and req.related_id:
        pub = db.query(Publication).filter(Publication.id == req.related_id).first()
        for candidate_uid in [req.from_user_id, req.to_user_id]:
            if pub and candidate_uid == pub.uploaded_by:
                continue
            res = get_or_create_researcher(db, candidate_uid)
            if res:
                already_author = (
                    db.query(PublicationAuthor)
                    .filter(
                        PublicationAuthor.publication_id == req.related_id,
                        PublicationAuthor.researcher_id == res.id,
                    )
                    .first()
                )
                if not already_author:
                    author = PublicationAuthor(
                        publication_id=req.related_id,
                        researcher_id=res.id,
                        author_order=None,
                        is_corresponding_author=False,
                    )
                    db.add(author)
                    db.commit()

    # Notify the original sender of the outcome
    action_label = "accepted" if accept else "declined"
    notif_type = "accepted" if accept else "declined"
    type_label = "project invitation" if req.request_type == "project_invite" else "co-author invitation"
    notif_service.create_notification(
        db=db,
        user_id=req.from_user_id,
        title=f"Your {type_label} was {action_label}",
        message=(
            f"Your {type_label} was {action_label}."
            + (" You have been added to the team." if accept and req.request_type == "project_invite" else "")
            + (" You have been added as a co-author." if accept and req.request_type == "coauthor_invite" else "")
        ),
        type=notif_type,
        related_id=req.id,
    )

    return req
