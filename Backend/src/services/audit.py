from sqlalchemy.orm import Session
from models.audit import AuditLog

def log_action(db: Session, user_id: int | None, action: str, table_name: str | None = None, record_id: int | None = None, details: str | None = None) -> AuditLog:
    new_log = AuditLog(
        user_id=user_id,
        action=action,
        table_name=table_name,
        record_id=record_id,
        details=details
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log

def get_recent_logs(db: Session, limit: int = 50):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
