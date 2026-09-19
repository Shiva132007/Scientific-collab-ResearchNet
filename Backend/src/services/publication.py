from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from models.publication import Publication, PublicationAuthor
from schemas.publication import PublicationCreate, PublicationUpdate, PublicationAuthorCreate

VALID_STATUSES = {"Draft", "Submitted", "Published", "Archived"}


def create_publication(db: Session, data: PublicationCreate, uploaded_by: int) -> Publication:
    payload = data.dict()
    if payload.get("doi") == "":
        payload["doi"] = None
    new_publication = Publication(**payload, uploaded_by=uploaded_by)
    db.add(new_publication)
    db.commit()
    db.refresh(new_publication)
    return new_publication


def get_all_publications(db: Session, status: str | None = None):
    # Eager-load authors and their researcher to include nested researcher info
    query = db.query(Publication).options(joinedload(Publication.authors).joinedload(PublicationAuthor.researcher))
    if status:
        query = query.filter(Publication.status == status)
    return query.all()


def get_publication_by_id(db: Session, publication_id: int) -> Publication:
    publication = db.query(Publication).options(joinedload(Publication.authors).joinedload(PublicationAuthor.researcher)).filter(Publication.id == publication_id).first()
    if not publication:
        raise HTTPException(status_code=404, detail="Publication not found")
    return publication


def update_publication(db: Session, publication_id: int, updates: PublicationUpdate) -> Publication:
    publication = get_publication_by_id(db, publication_id)
    update_data = updates.dict(exclude_unset=True)
    if update_data.get("doi") == "":
        update_data["doi"] = None
    for key, value in update_data.items():
        setattr(publication, key, value)
    db.commit()
    db.refresh(publication)
    return publication


def update_status(db: Session, publication_id: int, new_status: str) -> Publication:
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {VALID_STATUSES}")
    publication = get_publication_by_id(db, publication_id)
    publication.status = new_status
    db.commit()
    db.refresh(publication)
    return publication


def delete_publication(db: Session, publication_id: int):
    publication = get_publication_by_id(db, publication_id)
    db.delete(publication)
    db.commit()
    return {"detail": "Publication deleted successfully"}


def add_author(db: Session, publication_id: int, data: PublicationAuthorCreate) -> PublicationAuthor:
    get_publication_by_id(db, publication_id)
    new_author = PublicationAuthor(
        publication_id=publication_id,
        researcher_id=data.researcher_id,
        author_order=data.author_order,
        is_corresponding_author=data.is_corresponding_author,
    )
    db.add(new_author)
    db.commit()
    db.refresh(new_author)
    return new_author


def get_authors_for_publication(db: Session, publication_id: int):
    return db.query(PublicationAuthor).options(joinedload(PublicationAuthor.researcher)).filter(PublicationAuthor.publication_id == publication_id).all()


def remove_author(db: Session, publication_id: int, researcher_id: int):
    link = db.query(PublicationAuthor).filter(
        PublicationAuthor.publication_id == publication_id,
        PublicationAuthor.researcher_id == researcher_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Author link not found")
    db.delete(link)
    db.commit()
    return {"detail": "Author removed from publication"}


def fetch_doi_metadata(doi: str) -> dict:
    import json
    import re
    from urllib import request, error

    clean_doi = doi.strip()
    clean_doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", clean_doi, flags=re.IGNORECASE)
    clean_doi = re.sub(r"^doi:\s*", "", clean_doi, flags=re.IGNORECASE)

    if not clean_doi:
        raise HTTPException(status_code=400, detail="Invalid DOI string provided")

    url = f"https://api.crossref.org/works/{clean_doi}"
    req = request.Request(url, headers={"User-Agent": "ScientificCollaborationNetworkAnalyzer/1.0 (mailto:admin@scna.dev)"})

    try:
        with request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            item = data.get("message", {})

            title_list = item.get("title", [])
            title = title_list[0] if title_list else "Untitled Publication"

            container = item.get("container-title", [])
            journal = container[0] if container else ""

            # Abstract extraction
            raw_abstract = item.get("abstract", "")
            abstract = re.sub(r"<[^>]+>", "", raw_abstract).strip() if raw_abstract else ""

            # Date extraction
            pub_date = None
            date_parts = item.get("published-print", {}).get("date-parts") or item.get("published-online", {}).get("date-parts")
            if date_parts and date_parts[0]:
                parts = date_parts[0]
                year = parts[0]
                month = parts[1] if len(parts) > 1 else 1
                day = parts[2] if len(parts) > 2 else 1
                pub_date = f"{year:04d}-{month:02d}-{day:02d}"

            # Type mapping
            crossref_type = item.get("type", "").lower()
            pub_type = "Journal Paper"
            if "conference" in crossref_type or "proceedings" in crossref_type:
                pub_type = "Conference Paper"
            elif "book" in crossref_type:
                pub_type = "Book"
            elif "report" in crossref_type:
                pub_type = "Technical Report"
            elif "patent" in crossref_type:
                pub_type = "Patent"

            # Authors
            authors = []
            for a in item.get("author", []):
                given = a.get("given", "")
                family = a.get("family", "")
                name = f"{given} {family}".strip() or family or "Unknown Author"
                authors.append(name)

            return {
                "doi": clean_doi,
                "title": title,
                "journal": journal,
                "abstract": abstract,
                "publication_date": pub_date,
                "type": pub_type,
                "authors": authors,
            }
    except error.HTTPError as exc:
        if exc.code == 404:
            raise HTTPException(status_code=404, detail=f"DOI '{clean_doi}' not found in CrossRef database.")
        raise HTTPException(status_code=502, detail=f"CrossRef service HTTP error {exc.code}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not connect to CrossRef service: {str(exc)}")


def export_citation(publication: Publication, format_type: str) -> str:
    fmt = (format_type or "bibtex").lower()
    title = publication.title or "Untitled"
    year = publication.publication_date.year if publication.publication_date else "n.d."
    doi = publication.doi or ""
    pub_id = publication.id
    pub_type = publication.type or "Journal Paper"

    author_names = [a.researcher.full_name for a in publication.authors if a.researcher and a.researcher.full_name]
    if not author_names:
        author_names = ["Anonymous"]

    if fmt == "bibtex":
        entry_type = "article"
        if pub_type == "Conference Paper":
            entry_type = "inproceedings"
        elif pub_type == "Book":
            entry_type = "book"
        elif pub_type == "Technical Report":
            entry_type = "techreport"

        authors_str = " and ".join(author_names)
        bib = f"@{entry_type}{{pub_{pub_id},\n"
        bib += f"  title = {{{title}}},\n"
        bib += f"  author = {{{authors_str}}},\n"
        bib += f"  year = {{{year}}},\n"
        if doi:
            bib += f"  doi = {{{doi}}},\n"
        bib += "}\n"
        return bib

    if fmt == "ris":
        ris_type = "JOUR"
        if pub_type == "Conference Paper":
            ris_type = "CONF"
        elif pub_type == "Book":
            ris_type = "BOOK"
        elif pub_type == "Technical Report":
            ris_type = "RPRT"
        elif pub_type == "Patent":
            ris_type = "PAT"

        ris = f"TY  - {ris_type}\n"
        ris += f"TI  - {title}\n"
        for name in author_names:
            ris += f"AU  - {name}\n"
        ris += f"PY  - {year}\n"
        if doi:
            ris += f"DO  - {doi}\n"
        ris += "ER  -\n"
        return ris

    if fmt == "apa":
        if len(author_names) == 1:
            auth_str = author_names[0]
        elif len(author_names) == 2:
            auth_str = f"{author_names[0]} & {author_names[1]}"
        else:
            auth_str = f"{', '.join(author_names[:-1])}, & {author_names[-1]}"

        doi_str = f" https://doi.org/{doi}" if doi else ""
        return f"{auth_str} ({year}). {title}.{doi_str}"

    if fmt == "ieee":
        auth_str = ", ".join(author_names)
        doi_str = f", doi: {doi}." if doi else "."
        return f'{auth_str}, "{title}," {year}{doi_str}'

    raise HTTPException(status_code=400, detail="Unsupported format. Choose from: bibtex, ris, apa, ieee")

