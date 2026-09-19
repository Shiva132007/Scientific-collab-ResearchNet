from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime
from models.user import UserRole

class UserCreate(BaseModel):
    #Exact shape of Json the client must send to /users/register

    email:EmailStr
    #EmailStr triggers automatic format validation - 'not-an-email' gets rejected
    
    password: str
    #it gets hashed immediately in server layer

    role: UserRole
    #Must be one of the 4 valid enum values

    full_name: Optional[str] = None
    #Optional full name of the researcher or admin

class UserLogin(BaseModel):
    email:EmailStr
    password: str

class UserUpdate(BaseModel):
    email:Optional[EmailStr]=None
    is_active:Optional[bool]=None
    #Optional fields with default None → client can send just ONE field to update, not all of them

class UserOut(BaseModel):
    # ↑ This is the EXACT shape of JSON the server sends BACK to the client
    # Notice: NO password field, NO password_hash field — impossible to leak by accident
    id:int
    email:EmailStr
    role:UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
    #Allows Pydantic to read data directly off a SQLAlchemy object (user.email, user.role, etc.)
    # instead of requiring a plain dict — without this, response_model=UserOut would fail

class Token(BaseModel):
    access_token : str
    token_type : str = "bearer"

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class OTPRequest(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class AuthMessage(BaseModel):
    message: str
    otp_required: bool = True
