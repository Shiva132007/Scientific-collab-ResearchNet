from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, DateTime, Boolean, func
from sqlalchemy.orm import relationship
from database import Base


class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    type = Column(String(100))
    status = Column(String(50), default="Draft")
    abstract = Column(Text)
    publication_date = Column(Date)
    doi = Column(String(100), unique=True)
    file_url = Column(String(500))
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    visible_to_others = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    authors = relationship("PublicationAuthor", back_populates="publication")
    citations_made = relationship("Citation", foreign_keys="Citation.citing_publication_id", back_populates="citing_publication", cascade="all, delete-orphan")
    citations_received = relationship("Citation", foreign_keys="Citation.cited_publication_id", back_populates="cited_publication", cascade="all, delete-orphan")



class PublicationAuthor(Base):
    __tablename__ = "publication_authors"

    id = Column(Integer, primary_key=True, index=True)
    publication_id = Column(Integer, ForeignKey("publications.id"), nullable=False)
    researcher_id = Column(Integer, ForeignKey("researchers.id"), nullable=False)
    author_order = Column(Integer)
    is_corresponding_author = Column(Boolean, default=False)

    publication = relationship("Publication", back_populates="authors")
    researcher = relationship("Researcher", back_populates="publications")