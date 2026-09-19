from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from schemas.audit import AuditLogOut
from services import audit
from middleware.auth import get_current_user
from models.user import User, UserRole

router = APIRouter(prefix="/audit", tags=["Audit & Compliance"])

@router.get("/", response_model=list[AuditLogOut])
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str not in ["SystemAdmin", "InstitutionAdmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Audit logs are restricted to Administrators"
        )
    return audit.get_recent_logs(db, limit)
