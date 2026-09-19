from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas.citation import CitationCreate, CitationOut
from services import citation, audit
from middleware.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/citations", tags=["Citations"])

@router.post("/", response_model=CitationOut)
def add_citation(data: CitationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cite = citation.add_citation(db, data)
    audit.log_action(db, current_user.id, "ADD_CITATION", "citations", cite.id, f"Added citation link: publication {data.citing_publication_id} citing {data.cited_publication_id}")
    return cite

@router.delete("/{citing_id}/{cited_id}")
def remove_citation(citing_id: int, cited_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    res = citation.remove_citation(db, citing_id, cited_id)
    audit.log_action(db, current_user.id, "REMOVE_CITATION", "citations", None, f"Removed citation link: publication {citing_id} citing {cited_id}")
    return res

@router.get("/citing/{publication_id}", response_model=list[CitationOut])
def get_citations_by_citing_pub(publication_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return citation.get_citations_by_citing_pub(db, publication_id)

@router.get("/cited/{publication_id}", response_model=list[CitationOut])
def get_citations_by_cited_pub(publication_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return citation.get_citations_by_cited_pub(db, publication_id)
