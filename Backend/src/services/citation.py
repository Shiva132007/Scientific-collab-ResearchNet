from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.citation import Citation
from models.publication import Publication
from schemas.citation import CitationCreate

def add_citation(db: Session, data: CitationCreate) -> Citation:
    if data.citing_publication_id == data.cited_publication_id:
        raise HTTPException(status_code=400, detail="A publication cannot cite itself")
    
    # Check that both publications exist
    citing_exists = db.query(Publication).filter(Publication.id == data.citing_publication_id).first()
    cited_exists = db.query(Publication).filter(Publication.id == data.cited_publication_id).first()
    
    if not citing_exists or not cited_exists:
        raise HTTPException(status_code=404, detail="Citing or cited publication not found")
        
    existing = db.query(Citation).filter(
        Citation.citing_publication_id == data.citing_publication_id,
        Citation.cited_publication_id == data.cited_publication_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Citation link already exists")
        
    new_cite = Citation(
        citing_publication_id=data.citing_publication_id,
        cited_publication_id=data.cited_publication_id
    )
    db.add(new_cite)
    db.commit()
    db.refresh(new_cite)
    return new_cite

def remove_citation(db: Session, citing_id: int, cited_id: int):
    cite = db.query(Citation).filter(
        Citation.citing_publication_id == citing_id,
        Citation.cited_publication_id == cited_id
    ).first()
    if not cite:
        raise HTTPException(status_code=404, detail="Citation not found")
    db.delete(cite)
    db.commit()
    return {"detail": "Citation removed successfully"}

def get_citations_by_citing_pub(db: Session, publication_id: int):
    return db.query(Citation).filter(Citation.citing_publication_id == publication_id).all()

def get_citations_by_cited_pub(db: Session, publication_id: int):
    return db.query(Citation).filter(Citation.cited_publication_id == publication_id).all()
