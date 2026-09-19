from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models.user import User
from models.researcher import Researcher
from models.publication import Publication, PublicationAuthor
from models.project import Project, ProjectMember
from models.conference import Conference, ConferenceParticipation
from models.collaboration import Collaboration
from models.department import Department
from models.institution import Institution
from models.audit import AuditLog

def get_dashboard_stats(db: Session, user: User) -> dict:
    role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
    response = {"role": role_str}
    
    # 1. Researcher Role
    if role_str == "Researcher":
        researcher = db.query(Researcher).filter(Researcher.user_id == user.id).first()

        pub_ids = []
        proj_ids = []
        conf_ids = []

        if researcher:
            pub_authors = db.query(PublicationAuthor).filter(PublicationAuthor.researcher_id == researcher.id).all()
            pub_ids = [pa.publication_id for pa in pub_authors]

            proj_members = db.query(ProjectMember).filter(ProjectMember.researcher_id == researcher.id).all()
            proj_ids = [pm.project_id for pm in proj_members]

            conf_parts = db.query(ConferenceParticipation).filter(ConferenceParticipation.researcher_id == researcher.id).all()
            conf_ids = [cp.conference_id for cp in conf_parts]

        publication_filters = [Publication.uploaded_by == user.id]
        if pub_ids:
            publication_filters.append(Publication.id.in_(pub_ids))
        publications = db.query(Publication).filter(or_(*publication_filters)).all()

        project_filters = [Project.created_by == user.id]
        if proj_ids:
            project_filters.append(Project.id.in_(proj_ids))
        projects = db.query(Project).filter(or_(*project_filters)).all()

        conferences = db.query(Conference).filter(Conference.id.in_(conf_ids)).all() if conf_ids else []
        
        # Collaborators (other researchers sharing publications or projects)
        collaborator_ids = set()
        if researcher and pub_ids:
            other_authors = db.query(PublicationAuthor.researcher_id).filter(
                PublicationAuthor.publication_id.in_(pub_ids),
                PublicationAuthor.researcher_id != researcher.id
            ).all()
            for r_id_row in other_authors:
                collaborator_ids.add(r_id_row[0])
                
        if researcher and proj_ids:
            other_members = db.query(ProjectMember.researcher_id).filter(
                ProjectMember.project_id.in_(proj_ids),
                ProjectMember.researcher_id != researcher.id
            ).all()
            for r_id_row in other_members:
                collaborator_ids.add(r_id_row[0])
                
        response["researcher_stats"] = {
            "publications_count": len(publications),
            "projects_count": len(projects),
            "conferences_count": len(conferences),
            "collaborators_count": len(collaborator_ids),
            "publications": [{"id": p.id, "title": p.title, "type": p.type, "status": p.status} for p in publications],
            "projects": [{"id": pr.id, "title": pr.title, "status": pr.status, "budget": pr.budget} for pr in projects],
            "conferences": [{"id": c.id, "name": c.name, "acronym": c.acronym, "location": c.location, "start_date": c.start_date.isoformat() if c.start_date else None} for c in conferences]
        }
        
    # 2. InstitutionAdmin Role
    elif role_str == "InstitutionAdmin":
        # Find the institution of the admin
        # We will check if the admin has a researcher profile or associate it by matching department/institution
        researcher = db.query(Researcher).filter(Researcher.user_id == user.id).first()
        inst_id = researcher.institution_id if researcher else None
        
        if not inst_id:
            # Fallback: get the first institution in the db
            first_inst = db.query(Institution).first()
            inst_id = first_inst.id if first_inst else None
            
        if not inst_id:
            response["institution_stats"] = {
                "departments_count": 0,
                "publications_count": 0,
                "active_projects_count": 0,
                "collaboration_statistics": {"total_collaborations": 0},
                "departments": [],
                "projects": []
            }
            return response
            
        deps = db.query(Department).filter(Department.institution_id == inst_id).all()
        dep_ids = [d.id for d in deps]
        
        # Researchers in this institution
        res_in_inst = db.query(Researcher).filter(Researcher.institution_id == inst_id).all()
        res_ids = [r.id for r in res_in_inst]
        
        # Publications by researchers of this institution
        pub_count = 0
        if res_ids:
            pub_count = db.query(PublicationAuthor.publication_id).filter(
                PublicationAuthor.researcher_id.in_(res_ids)
            ).distinct().count()
            
        # Active Projects in this institution
        active_proj = db.query(Project).filter(
            Project.institution_id == inst_id,
            Project.status == "Active"
        ).all()
        
        # Collaborations involving this institution
        collab_count = db.query(Collaboration).filter(
            (Collaboration.institution_1_id == inst_id) | (Collaboration.institution_2_id == inst_id)
        ).count()
        
        response["institution_stats"] = {
            "departments_count": len(deps),
            "publications_count": pub_count,
            "active_projects_count": len(active_proj),
            "collaboration_statistics": {
                "total_collaborations": collab_count
            },
            "departments": [{"id": d.id, "name": d.name, "description": d.description} for d in deps],
            "projects": [{"id": pr.id, "title": pr.title, "status": pr.status, "budget": pr.budget} for pr in active_proj]
        }
        
    # 3. SystemAdmin Role (or default fallback)
    else:
        total_users = db.query(User).count()
        total_pubs = db.query(Publication).count()
        total_projs = db.query(Project).count()
        total_insts = db.query(Institution).count()
        
        roles = db.query(User.role, func.count(User.id)).group_by(User.role).all()
        role_counts = {r.value if hasattr(r, "value") else str(r): count for r, count in roles}
        
        recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
        
        response["admin_stats"] = {
            "total_users": total_users,
            "total_publications": total_pubs,
            "total_projects": total_projs,
            "total_institutions": total_insts,
            "role_counts": role_counts,
            "recent_logs": [
                {
                    "id": log.id,
                    "action": log.action,
                    "table_name": log.table_name,
                    "record_id": log.record_id,
                    "details": log.details,
                    "created_at": log.created_at.isoformat()
                }
                for log in recent_logs
            ]
        }
        
    return response
