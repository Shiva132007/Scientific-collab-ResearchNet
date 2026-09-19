import asyncio
from sqlalchemy.orm import Session
from models.notification import Notification
from websocket_manager import manager


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str = None,
    type: str = "info",
    related_id: int = None,
) -> Notification:
    """Create and persist a notification for a user, then push via WebSocket if connected."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        related_id=related_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    # Push to active WebSocket if event loop is running
    try:
        loop = asyncio.get_running_loop()
        payload = {
            "type": "notification",
            "data": {
                "id": notif.id,
                "title": notif.title,
                "message": notif.message,
                "type": notif.type,
                "related_id": notif.related_id,
                "created_at": notif.created_at.isoformat() if notif.created_at else None,
            }
        }
        loop.create_task(manager.send_personal_message(payload, user_id))
    except RuntimeError:
        pass  # No running event loop

    return notif


def get_notifications(db: Session, user_id: int) -> list[Notification]:
    """Return all notifications for a user, newest first."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .all()
    )


def get_unread_count(db: Session, user_id: int) -> int:
    """Return the count of unread notifications for a user."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, notification_id: int, user_id: int) -> Notification | None:
    """Mark a single notification as read. Returns None if not found or wrong user."""
    notif = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_read(db: Session, user_id: int) -> int:
    """Mark every unread notification as read. Returns count updated."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
    return updated
