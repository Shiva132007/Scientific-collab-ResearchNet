from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base

class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(200))
    address = Column(Text)
    website = Column(String(255))

    departments = relationship("Department", back_populates="institution")
    researchers = relationship("Researcher", back_populates="institution")
    projects = relationship("Project", back_populates="institution")


