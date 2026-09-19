from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from database import Base

class Citation(Base):
    __tablename__ = "citations"

    id = Column(Integer, primary_key=True, index=True)
    citing_publication_id = Column(Integer, ForeignKey("publications.id"), nullable=False)
    cited_publication_id = Column(Integer, ForeignKey("publications.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    citing_publication = relationship("Publication", foreign_keys=[citing_publication_id], back_populates="citations_made")
    cited_publication = relationship("Publication", foreign_keys=[cited_publication_id], back_populates="citations_received")
