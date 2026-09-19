from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.collaboration import Collaboration
from schemas.collaboration import CollaborationCreate, CollaborationUpdate

def create_collaboration(db: Session, data: CollaborationCreate) -> Collaboration:
    # Verify institution IDs are different
    if data.institution_1_id == data.institution_2_id:
        raise HTTPException(status_code=400, detail="Collaboration must be between two different institutions")
    new_collab = Collaboration(**data.model_dump())
    db.add(new_collab)
    db.commit()
    db.refresh(new_collab)
    return new_collab

def get_all_collaborations(db: Session):
    return db.query(Collaboration).all()

def get_collaboration_by_id(db: Session, collaboration_id: int) -> Collaboration:
    collab = db.query(Collaboration).filter(Collaboration.id == collaboration_id).first()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaboration not found")
    return collab

def update_collaboration(db: Session, collaboration_id: int, updates: CollaborationUpdate) -> Collaboration:
    collab = get_collaboration_by_id(db, collaboration_id)
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(collab, key, value)
    db.commit()
    db.refresh(collab)
    return collab

from models.researcher import Researcher
from models.publication import PublicationAuthor
from models.project import ProjectMember
from collections import defaultdict


def delete_collaboration(db: Session, collaboration_id: int):
    collab = get_collaboration_by_id(db, collaboration_id)
    db.delete(collab)
    db.commit()
    return {"detail": "Collaboration deleted successfully"}


def get_network_graph(db: Session) -> dict:
    """Build a graph of Researchers (nodes) and their co-authorship & project connections (links)."""
    researchers = db.query(Researcher).all()

    nodes = []
    r_map = {}
    for r in researchers:
        inst_name = r.institution.name if r.institution else "Independent"
        dept_name = r.department.name if r.department else ""
        pub_count = db.query(PublicationAuthor).filter(PublicationAuthor.researcher_id == r.id).count()
        proj_count = db.query(ProjectMember).filter(ProjectMember.researcher_id == r.id).count()

        node_id = f"r-{r.id}"
        nodes.append({
            "id": node_id,
            "researcher_id": r.id,
            "user_id": r.user_id,
            "label": r.full_name,
            "institution": inst_name,
            "department": dept_name,
            "skills": r.skills or "",
            "interests": r.research_interests or "",
            "pub_count": pub_count,
            "proj_count": proj_count,
        })
        r_map[r.id] = node_id

    # Compute co-authorship edges
    # Group researcher_ids by publication_id
    pub_authors = db.query(PublicationAuthor).all()
    pub_groups = defaultdict(list)
    for pa in pub_authors:
        pub_groups[pa.publication_id].append(pa.researcher_id)

    edge_weights = defaultdict(int)
    edge_types = defaultdict(set)

    for pub_id, r_ids in pub_groups.items():
        distinct_r = sorted(list(set(r_ids)))
        for i in range(len(distinct_r)):
            for j in range(i + 1, len(distinct_r)):
                r1, r2 = distinct_r[i], distinct_r[j]
                if r1 in r_map and r2 in r_map:
                    pair = (r_map[r1], r_map[r2])
                    edge_weights[pair] += 1
                    edge_types[pair].add("co_author")

    # Compute project collaboration edges
    proj_members = db.query(ProjectMember).all()
    proj_groups = defaultdict(list)
    for pm in proj_members:
        proj_groups[pm.project_id].append(pm.researcher_id)

    for proj_id, r_ids in proj_groups.items():
        distinct_r = sorted(list(set(r_ids)))
        for i in range(len(distinct_r)):
            for j in range(i + 1, len(distinct_r)):
                r1, r2 = distinct_r[i], distinct_r[j]
                if r1 in r_map and r2 in r_map:
                    pair = (r_map[r1], r_map[r2])
                    edge_weights[pair] += 1
                    edge_types[pair].add("project_team")

    links = []
    for idx, ((source, target), weight) in enumerate(edge_weights.items()):
        links.append({
            "id": f"e-{idx}",
            "source": source,
            "target": target,
            "weight": weight,
            "types": list(edge_types[(source, target)]),
        })

    return {
        "nodes": nodes,
        "links": links,
        "total_nodes": len(nodes),
        "total_links": len(links),
    }
