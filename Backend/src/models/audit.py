from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., LOGIN, LOGOUT, CREATE_PUB, etc.
    table_name = Column(String(100), nullable=True)
    record_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
