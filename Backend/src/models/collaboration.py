from sqlalchemy import Column, Integer, String, Text, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Collaboration(Base):
    __tablename__ = "collaborations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(String(100), nullable=True)  # Institutional Partnership, Joint Venture, Research Initiative
    status = Column(String(50), default="Active")  # Active, Completed, Terminated
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    institution_1_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    institution_2_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)

    institution_1 = relationship("Institution", foreign_keys=[institution_1_id])
    institution_2 = relationship("Institution", foreign_keys=[institution_2_id])
