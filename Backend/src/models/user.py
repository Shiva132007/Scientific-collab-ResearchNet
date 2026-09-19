from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import relationship
from database import Base
import enum

class UserRole(str,enum.Enum):
    #Inheriting from both `str` and `enum.Enum` means this behaves like a string
    #AND is restricted to only these 4 exact values
    researcher="Researcher"
    institution_admin="InstitutionAdmin"
    reviewer="Reviewer"
    system_admin="SystemAdmin"
    #if anyone tries User(other_role), Python itself raises the ValueError
class User(Base):
    __tablename__="users"
    #table name in the postgre databse

    id= Column(Integer, primary_key=True, index=True)
    # Integer column auto-Increment, the row's unique identifier

    email= Column(String(150), unique=True, nullable=False, index=True)
    #Varchar(150),email should be unique, column should not empty

    password_hash = Column(String(255), nullable=False)
    #Stores the hashed_password

    role=Column(Enum(UserRole), nullable=False)
    #Creating role of enum and specified type(User,Researcher,reviewer,system_admin)

    is_active=Column(Boolean,default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # This works even if someone inserts a row using raw SQL, bypassing your Python code entirely

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    # ↑ onupdate=func.now() → SQLAlchemy sets this automatically whenever you .commit() a change

    researcher = relationship("Researcher", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    sent_requests = relationship("CollaborationRequest", foreign_keys="CollaborationRequest.from_user_id", back_populates="from_user", cascade="all, delete-orphan")
    received_requests = relationship("CollaborationRequest", foreign_keys="CollaborationRequest.to_user_id", back_populates="to_user", cascade="all, delete-orphan")