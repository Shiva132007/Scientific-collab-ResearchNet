from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import shutil
import os
import uuid

from database import get_db
from schemas.publication import (
    PublicationCreate, PublicationUpdate, PublicationOut,
    PublicationStatusUpdate, PublicationAuthorCreate, PublicationAuthorOut,
)
from services import publication, audit
from middleware.auth import get_current_user
from models.user import User
from models.researcher import Researcher
from models.publication import Publication, PublicationAuthor
from models.institution import Institution

router = APIRouter(prefix="/publications", tags=["Publications"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def check_publication_write_permission(db: Session, pub, current_user: User):
    role_str = get_user_role_str(current_user)
    if role_str == "SystemAdmin":
        return True
        
    if pub.uploaded_by == current_user.id:
        return True
        
    if role_str == "InstitutionAdmin":
        admin_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        admin_inst_id = admin_res.institution_id if admin_res else None
        if not admin_inst_id:
            first_inst = db.query(Institution).first()
            admin_inst_id = first_inst.id if first_inst else None
            
        uploader_res = db.query(Researcher).filter(Researcher.user_id == pub.uploaded_by).first()
        if uploader_res and uploader_res.institution_id == admin_inst_id:
            return True
            
    raise HTTPException(
        status_code=403,
        detail="Permission denied: Regular users can only view publications or propose co-authorship. Only the uploader or SystemAdmin may modify this publication."
    )

from fastapi.responses import PlainTextResponse

@router.get("/doi-lookup/{doi:path}")
def lookup_doi(doi: str, current_user: User = Depends(get_current_user)):
    return publication.fetch_doi_metadata(doi)


@router.post("/", response_model=PublicationOut)
def create_publication(data: PublicationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.create_publication(db, data, current_user.id)
    
    # Auto-assign creator as corresponding author if they have a researcher profile
    user_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
    if user_res:
        try:
            publication.add_author(db, pub.id, PublicationAuthorCreate(
                researcher_id=user_res.id,
                author_order=1,
                is_corresponding_author=True
            ))
        except Exception:
            pass
            
    audit.log_action(db, current_user.id, "CREATE_PUBLICATION", "publications", pub.id, f"Created publication: {pub.title}")
    return pub

@router.get("/", response_model=list[PublicationOut])
def list_publications(status: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role_str = get_user_role_str(current_user)
    # 1. SystemAdmin sees all
    if role_str == "SystemAdmin":
        return publication.get_all_publications(db, status)
        
    # 2. InstitutionAdmin sees publications from their institution plus public ones
    if role_str == "InstitutionAdmin":
        admin_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        admin_inst_id = admin_res.institution_id if admin_res else None
        if not admin_inst_id:
            first_inst = db.query(Institution).first()
            admin_inst_id = first_inst.id if first_inst else None
            
        res_user_ids = [r.user_id for r in db.query(Researcher).filter(Researcher.institution_id == admin_inst_id).all()]
        
        query = db.query(Publication).filter(
            (Publication.uploaded_by == current_user.id) |
            (Publication.uploaded_by.in_(res_user_ids)) |
            (Publication.visible_to_others == True)
        )
        if status:
            query = query.filter(Publication.status == status)
        return query.all()
        
    # 3. Researcher sees public ones, uploaded ones, and authored ones
    user_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
    user_res_id = user_res.id if user_res else None
    
    query = db.query(Publication)
    if user_res_id:
        query = query.filter(
            (Publication.visible_to_others == True) |
            (Publication.uploaded_by == current_user.id) |
            Publication.id.in_(db.query(PublicationAuthor.publication_id).filter(PublicationAuthor.researcher_id == user_res_id))
        )
    else:
        query = query.filter(
            (Publication.visible_to_others == True) |
            (Publication.uploaded_by == current_user.id)
        )
        
    if status:
        query = query.filter(Publication.status == status)
    return query.all()

@router.get("/{publication_id}", response_model=PublicationOut)
def get_publication(publication_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    role_str = get_user_role_str(current_user)
    
    # Check view permissions
    if role_str == "SystemAdmin":
        return pub
        
    if pub.visible_to_others or pub.uploaded_by == current_user.id:
        return pub
        
    if role_str == "InstitutionAdmin":
        admin_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        admin_inst_id = admin_res.institution_id if admin_res else None
        if not admin_inst_id:
            first_inst = db.query(Institution).first()
            admin_inst_id = first_inst.id if first_inst else None
            
        uploader_res = db.query(Researcher).filter(Researcher.user_id == pub.uploaded_by).first()
        if uploader_res and uploader_res.institution_id == admin_inst_id:
            return pub
            
    user_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
    if user_res:
        is_author = db.query(PublicationAuthor).filter(
            PublicationAuthor.publication_id == pub.id,
            PublicationAuthor.researcher_id == user_res.id
        ).first()
        if is_author:
            return pub
            
    raise HTTPException(status_code=403, detail="You do not have permission to view this publication.")


@router.put("/{publication_id}", response_model=PublicationOut)
def update_publication(publication_id: int, data: PublicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    check_publication_write_permission(db, pub, current_user)
    
    res_pub = publication.update_publication(db, publication_id, data)
    audit.log_action(db, current_user.id, "UPDATE_PUBLICATION", "publications", res_pub.id, f"Updated publication details: {res_pub.title}")
    return res_pub

from middleware.auth import get_user_role_str

@router.put("/{publication_id}/status", response_model=PublicationOut)
def update_status(publication_id: int, data: PublicationStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    role_str = get_user_role_str(current_user)
    if role_str != "Reviewer":
        check_publication_write_permission(db, pub, current_user)
    
    res_pub = publication.update_status(db, publication_id, data.status)
    audit.log_action(db, current_user.id, "UPDATE_PUBLICATION_STATUS", "publications", res_pub.id, f"Updated status of publication: {res_pub.title} to {data.status}")
    return res_pub


@router.delete("/{publication_id}")
def delete_publication(publication_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    check_publication_write_permission(db, pub, current_user)
    
    res = publication.delete_publication(db, publication_id)
    audit.log_action(db, current_user.id, "DELETE_PUBLICATION", "publications", publication_id, f"Deleted publication id: {publication_id}")
    return res

@router.post("/{publication_id}/authors", response_model=PublicationAuthorOut)
def add_author(publication_id: int, data: PublicationAuthorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    check_publication_write_permission(db, pub, current_user)
    
    author = publication.add_author(db, publication_id, data)
    audit.log_action(db, current_user.id, "ADD_PUBLICATION_AUTHOR", "publication_authors", author.id, f"Added researcher {data.researcher_id} as author to publication {publication_id}")
    return author

@router.get("/{publication_id}/authors", response_model=list[PublicationAuthorOut])
def list_authors(publication_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Viewable if viewable
    pub = publication.get_publication_by_id(db, publication_id)
    # Check permissions (reuse logic from get_publication)
    # SystemAdmin
    if current_user.role != "SystemAdmin" and not pub.visible_to_others and pub.uploaded_by != current_user.id:
        authorized = False
        if current_user.role == "InstitutionAdmin":
            admin_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            admin_inst_id = admin_res.institution_id if admin_res else None
            if not admin_inst_id:
                first_inst = db.query(Institution).first()
                admin_inst_id = first_inst.id if first_inst else None
            uploader_res = db.query(Researcher).filter(Researcher.user_id == pub.uploaded_by).first()
            if uploader_res and uploader_res.institution_id == admin_inst_id:
                authorized = True
        else:
            user_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
            if user_res:
                is_author = db.query(PublicationAuthor).filter(
                    PublicationAuthor.publication_id == pub.id,
                    PublicationAuthor.researcher_id == user_res.id
                ).first()
                if is_author:
                    authorized = True
        if not authorized:
            raise HTTPException(status_code=403, detail="You do not have permission to view authors of this publication.")
            
    return publication.get_authors_for_publication(db, publication_id)

@router.delete("/{publication_id}/authors/{researcher_id}")
def remove_author(publication_id: int, researcher_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    check_publication_write_permission(db, pub, current_user)
    
    res = publication.remove_author(db, publication_id, researcher_id)
    audit.log_action(db, current_user.id, "REMOVE_PUBLICATION_AUTHOR", "publication_authors", None, f"Removed researcher {researcher_id} from publication {publication_id}")
    return res

@router.post("/{publication_id}/upload", response_model=PublicationOut)
def upload_publication_file(
    publication_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    pub = publication.get_publication_by_id(db, publication_id)
    check_publication_write_permission(db, pub, current_user)
    
    allowed_types = {"application/pdf", "application/msword",
                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                     "text/plain"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, DOC, DOCX and TXT files are allowed.")

    ext = os.path.splitext(file.filename)[1] if file.filename else ".bin"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/uploads/{unique_name}"
    pub.file_url = file_url
    db.commit()
    db.refresh(pub)
    
    audit.log_action(db, current_user.id, "UPLOAD_PUBLICATION_FILE", "publications", pub.id, f"Uploaded document for publication: {pub.title}")
    return pub


@router.get("/{publication_id}/export-citation", response_class=PlainTextResponse)
def export_publication_citation(publication_id: int, format: str = "bibtex", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pub = publication.get_publication_by_id(db, publication_id)
    return publication.export_citation(pub, format)