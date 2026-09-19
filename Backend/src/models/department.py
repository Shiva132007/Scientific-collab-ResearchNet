from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text)

    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    institution = relationship("Institution", back_populates="departments")
    researchers = relationship("Researcher", back_populates="department")


