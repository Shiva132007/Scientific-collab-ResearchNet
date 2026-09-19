from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.dashboard import DashboardStatsOut
from services import dashboard
from middleware.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStatsOut)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return dashboard.get_dashboard_stats(db, current_user)
