from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from models.project import Project, ProjectMember
from models.researcher import Researcher
from schemas.project import ProjectCreate, ProjectUpdate, ProjectMemberCreate

def create_project(db: Session, data: ProjectCreate, created_by: int) -> Project:
    new_project = Project(**data.model_dump(), created_by=created_by)
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

def get_all_projects(db: Session):
    # Eager-load members and their researcher to ensure relationships are available
    projects = db.query(Project).options(joinedload(Project.members).joinedload(ProjectMember.researcher)).all()
    # Attach creator researcher object (if any) for each project so Pydantic can include nested creator
    for proj in projects:
        if proj.created_by:
            creator = db.query(Researcher).filter(Researcher.user_id == proj.created_by).first()
            setattr(proj, "creator", creator)
    return projects

def get_project_by_id(db: Session, project_id: int) -> Project:
    project = db.query(Project).options(joinedload(Project.members).joinedload(ProjectMember.researcher)).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.created_by:
        creator = db.query(Researcher).filter(Researcher.user_id == project.created_by).first()
        setattr(project, "creator", creator)
    return project

def update_project(db: Session, project_id: int, updates: ProjectUpdate) -> Project:
    project = get_project_by_id(db, project_id)
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project

def delete_project(db: Session, project_id: int):
    project = get_project_by_id(db, project_id)
    db.delete(project)
    db.commit()
    return {"detail": "Project deleted successfully"}

def assign_member(db: Session, project_id: int, member_data: ProjectMemberCreate) -> ProjectMember:
    get_project_by_id(db, project_id)
    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.researcher_id == member_data.researcher_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Researcher already assigned to this project")
    
    new_member = ProjectMember(
        project_id=project_id,
        researcher_id=member_data.researcher_id,
        role=member_data.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

def remove_member(db: Session, project_id: int, researcher_id: int):
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.researcher_id == researcher_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member assignment not found")
    db.delete(member)
    db.commit()
    return {"detail": "Member removed from project"}
