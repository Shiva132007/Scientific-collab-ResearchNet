from sqlalchemy import Column, Integer, Text, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from database import Base

class Researcher(Base):
    __tablename__ = "researchers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    department_id = Column(Integer, ForeignKey("departments.id"))
    full_name = Column(String(150),nullable=False)
    bio = Column(Text)
    research_interests = Column(String(255))
    skills = Column(String(255))
    orcid_id = Column(String(50), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="researcher")
    institution = relationship("Institution", back_populates="researchers")
    department = relationship("Department", back_populates="researchers")
    publications = relationship("PublicationAuthor", back_populates="researcher")

