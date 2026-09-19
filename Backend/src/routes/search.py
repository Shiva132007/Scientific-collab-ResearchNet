from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from middleware.auth import get_current_user
from models.user import User
from models.researcher import Researcher
from models.publication import Publication
from models.project import Project
from models.conference import Conference

router = APIRouter(prefix="/search", tags=["Global Search"])


@router.get("/")
def global_search(
    q: str = Query(..., min_length=1, description="Search term"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    term = f"%{q.strip()}%"

    # Search Researchers
    researchers = (
        db.query(Researcher)
        .filter(
            (Researcher.full_name.ilike(term))
            | (Researcher.bio.ilike(term))
            | (Researcher.research_interests.ilike(term))
            | (Researcher.skills.ilike(term))
        )
        .limit(10)
        .all()
    )

    # Search Publications
    publications = (
        db.query(Publication)
        .filter(
            (Publication.title.ilike(term))
            | (Publication.abstract.ilike(term))
            | (Publication.doi.ilike(term))
            | (Publication.type.ilike(term))
        )
        .limit(10)
        .all()
    )

    # Search Projects
    projects = (
        db.query(Project)
        .filter(
            (Project.title.ilike(term))
            | (Project.description.ilike(term))
            | (Project.funding_agency.ilike(term))
        )
        .limit(10)
        .all()
    )

    # Search Conferences
    conferences = (
        db.query(Conference)
        .filter(
            (Conference.name.ilike(term))
            | (Conference.acronym.ilike(term))
            | (Conference.location.ilike(term))
        )
        .limit(10)
        .all()
    )

    return {
        "query": q,
        "researchers": [
            {
                "id": r.id,
                "title": r.full_name,
                "subtitle": r.institution.name if r.institution else (r.skills or "Researcher"),
                "interests": r.research_interests,
                "target_id": r.id,
            }
            for r in researchers
        ],
        "publications": [
            {
                "id": p.id,
                "title": p.title,
                "subtitle": f"{p.type or 'Publication'} • {p.status}",
                "doi": p.doi,
            }
            for p in publications
        ],
        "projects": [
            {
                "id": pr.id,
                "title": pr.title,
                "subtitle": f"{pr.status} • {pr.funding_agency or 'No Agency'}",
            }
            for pr in projects
        ],
        "conferences": [
            {
                "id": c.id,
                "title": c.name,
                "subtitle": f"{c.acronym or ''} {c.year or ''} • {c.location or 'Virtual'}".strip(),
            }
            for c in conferences
        ],
    }
