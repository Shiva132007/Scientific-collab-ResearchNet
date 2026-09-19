from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ResearcherDashboardOut(BaseModel):
    publications_count: int
    projects_count: int
    conferences_count: int
    collaborators_count: int
    publications: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []
    conferences: List[Dict[str, Any]] = []

class InstitutionDashboardOut(BaseModel):
    departments_count: int
    publications_count: int
    active_projects_count: int
    collaboration_statistics: Dict[str, Any]
    departments: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []

class AdminDashboardOut(BaseModel):
    total_users: int
    total_publications: int
    total_projects: int
    total_institutions: int
    role_counts: Dict[str, int]
    recent_logs: List[Dict[str, Any]] = []

class DashboardStatsOut(BaseModel):
    role: str
    researcher_stats: Optional[ResearcherDashboardOut] = None
    institution_stats: Optional[InstitutionDashboardOut] = None
    admin_stats: Optional[AdminDashboardOut] = None
