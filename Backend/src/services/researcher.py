from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.researcher import Researcher
from schemas.researcher import ResearcherCreate, ResearcherUpdate

def create_researcher(db: Session, data: ResearcherCreate, user_id : int)-> Researcher:
    new_researcher = Researcher(**data.dict(), user_id = user_id)
    db.add(new_researcher)
    db.commit()
    db.refresh(new_researcher)
    return new_researcher

def get_all_researcher(db: Session):
    return db.query(Researcher).all()


def get_researcher_by_id(db:Session, researcher_id : int)-> Researcher:
    researcher = db.query(Researcher).filter(Researcher.id == researcher_id).first()
    if not researcher:
        raise HTTPException(status_code=404, detail="Researcher not found")
        return researcher
    return researcher

def update_researcher(db:Session, researcher_id:int, updates: ResearcherUpdate)->Researcher:
    researcher = get_researcher_by_id(db,researcher_id)
    for key, value in updates.dict(exclude_unset=True).items():
        setattr(researcher, key, value)
    
    db.commit()
    db.refresh(researcher)
    return researcher

from models.user import User
from models.institution import Institution
from models.department import Department
from models.publication import PublicationAuthor
from models.project import ProjectMember
from models.collaboration import Collaboration

def get_my_profile(db: Session, user_id: int) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    researcher = db.query(Researcher).filter(Researcher.user_id == user_id).first()
    if not researcher:
        # Auto-create if missing
        name_part = user.email.split('@')[0]
        display_name = ' '.join(p.capitalize() for p in name_part.replace('.', ' ').replace('_', ' ').split())
        researcher = Researcher(user_id=user.id, full_name=display_name, bio=f"Profile for {display_name}")
        db.add(researcher)
        db.commit()
        db.refresh(researcher)

    inst_name = None
    if researcher.institution_id:
        inst = db.query(Institution).filter(Institution.id == researcher.institution_id).first()
        if inst:
            inst_name = inst.name

    dept_name = None
    if researcher.department_id:
        dept = db.query(Department).filter(Department.id == researcher.department_id).first()
        if dept:
            dept_name = dept.name

    pub_count = db.query(PublicationAuthor).filter(PublicationAuthor.researcher_id == researcher.id).count()
    proj_count = db.query(ProjectMember).filter(ProjectMember.researcher_id == researcher.id).count()
    collab_count = db.query(Collaboration).filter(
        (Collaboration.institution_1_id == researcher.institution_id) |
        (Collaboration.institution_2_id == researcher.institution_id)
    ).count() if researcher.institution_id else 0

    return {
        "id": researcher.id,
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": researcher.full_name,
        "bio": researcher.bio,
        "research_interests": researcher.research_interests,
        "skills": researcher.skills,
        "orcid_id": researcher.orcid_id,
        "institution_id": researcher.institution_id,
        "department_id": researcher.department_id,
        "institution_name": inst_name,
        "department_name": dept_name,
        "publication_count": pub_count,
        "project_count": proj_count,
        "collaboration_count": collab_count,
        "created_at": researcher.created_at,
    }

def update_my_profile(db: Session, user_id: int, updates: ResearcherUpdate) -> dict:
    researcher = db.query(Researcher).filter(Researcher.user_id == user_id).first()
    if not researcher:
        researcher = Researcher(user_id=user_id, full_name="Researcher")
        db.add(researcher)
        db.commit()
        db.refresh(researcher)

    for key, value in updates.dict(exclude_unset=True).items():
        if value is not None:
            setattr(researcher, key, value)

    db.commit()
    db.refresh(researcher)
    return get_my_profile(db, user_id)

def discover_researchers(
    db: Session,
    query: str = None,
    institution_id: int = None,
    department_id: int = None,
) -> list[dict]:
    q = db.query(Researcher)
    if institution_id:
        q = q.filter(Researcher.institution_id == institution_id)
    if department_id:
        q = q.filter(Researcher.department_id == department_id)
    if query:
        term = f"%{query.strip()}%"
        q = q.filter(
            (Researcher.full_name.ilike(term)) |
            (Researcher.bio.ilike(term)) |
            (Researcher.research_interests.ilike(term)) |
            (Researcher.skills.ilike(term))
        )
    researchers = q.all()
    results = []
    for r in researchers:
        inst_name = r.institution.name if r.institution else None
        dept_name = r.department.name if r.department else None
        pub_count = db.query(PublicationAuthor).filter(PublicationAuthor.researcher_id == r.id).count()
        proj_count = db.query(ProjectMember).filter(ProjectMember.researcher_id == r.id).count()
        results.append({
            "id": r.id,
            "user_id": r.user_id,
            "full_name": r.full_name,
            "bio": r.bio,
            "research_interests": r.research_interests,
            "skills": r.skills,
            "orcid_id": r.orcid_id,
            "institution_id": r.institution_id,
            "department_id": r.department_id,
            "institution_name": inst_name,
            "department_name": dept_name,
            "publication_count": pub_count,
            "project_count": proj_count,
            "created_at": r.created_at,
        })
    return results


def fetch_orcid_profile(orcid_id: str) -> dict:
    import json
    import re
    from urllib import request, error

    clean_orcid = orcid_id.strip()
    clean_orcid = re.sub(r"^https?://(www\.)?orcid\.org/", "", clean_orcid, flags=re.IGNORECASE)

    if not re.match(r"^\d{4}-\d{4}-\d{4}-[\dX]{4}$", clean_orcid):
        raise HTTPException(status_code=400, detail="Invalid ORCID format. Expected format: 0000-0000-0000-0000")

    url = f"https://pub.orcid.org/v3.0/{clean_orcid}/person"
    req = request.Request(url, headers={"Accept": "application/json", "User-Agent": "ScientificCollaborationNetworkAnalyzer/1.0"})

    try:
        with request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
            name_obj = data.get("name") or {}
            given = (name_obj.get("given-names") or {}).get("value", "")
            family = (name_obj.get("family-name") or {}).get("value", "")
            credit_name = (name_obj.get("credit-name") or {}).get("value", "")
            full_name = credit_name or f"{given} {family}".strip() or "ORCID Researcher"

            bio_obj = data.get("biography") or {}
            bio = bio_obj.get("content", "") or f"ORCID registered researcher ({clean_orcid})"

            keywords_obj = data.get("keywords") or {}
            keyword_list = [kw.get("content") for kw in (keywords_obj.get("keyword") or []) if kw.get("content")]
            skills_str = ", ".join(keyword_list) if keyword_list else ""

            return {
                "orcid_id": clean_orcid,
                "full_name": full_name,
                "bio": bio,
                "skills": skills_str,
                "research_interests": skills_str,
            }
    except error.HTTPError as exc:
        if exc.code == 404:
            raise HTTPException(status_code=404, detail=f"ORCID profile '{clean_orcid}' not found.")
        raise HTTPException(status_code=502, detail=f"ORCID service HTTP error {exc.code}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not connect to ORCID service: {str(exc)}")

