from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models.user import User, UserRole
from models.researcher import Researcher
from schemas.user import UserCreate
from middleware.auth import hash_password, verify_password, create_access_token
from services import notification as notif_service
from services import otp_service

def derive_name_from_email(email: str) -> str:
    name_part = email.split('@')[0]
    parts = name_part.replace('.', ' ').replace('_', ' ').replace('-', ' ').split()
    if parts:
        return ' '.join(p.capitalize() for p in parts)
    return email

def create_user(db:Session, user_data: UserCreate)->User:
    existing = db.query(User).filter(User.email == user_data.email).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email = user_data.email,
        password_hash = hash_password(user_data.password),
        role= user_data.role,
        is_active=False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Automatically provision a Researcher profile so the user immediately appears in co-author / team dropdowns
    display_name = user_data.full_name.strip() if getattr(user_data, 'full_name', None) and user_data.full_name.strip() else derive_name_from_email(new_user.email)
    existing_researcher = db.query(Researcher).filter(Researcher.user_id == new_user.id).first()
    if not existing_researcher:
        new_researcher = Researcher(
            user_id=new_user.id,
            full_name=display_name,
            bio=f"Registered profile for {display_name}.",
        )
        db.add(new_researcher)
        db.commit()

    otp_service.create_and_send_otp(db, new_user, otp_service.EMAIL_VERIFICATION)
    return new_user


def send_email_verification_otp(db: Session, email: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        return {"message": "Email is already verified.", "otp_required": False}
    return otp_service.create_and_send_otp(db, user, otp_service.EMAIL_VERIFICATION)


def verify_email_otp(db: Session, email: str, otp: str) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_active:
        return {"message": "Email is already verified.", "otp_required": False}

    otp_service.verify_otp(db, user, otp_service.EMAIL_VERIFICATION, otp)
    user.is_active = True
    db.commit()

    sys_admins = db.query(User).filter(User.role == UserRole.system_admin).all()
    for admin in sys_admins:
        notif_service.create_notification(
            db=db,
            user_id=admin.id,
            title="New User Verified",
            message=f"User '{user.email}' verified their email with role '{user.role.value}'.",
            type="info",
        )

    return {"message": "Email verified successfully.", "otp_required": False}

def authenticate_user(db:Session, email:str, password: str)-> User:
    user =  db.query(User).filter(User.email == email).first()

    if not user or not verify_password(password,user.password_hash):
        raise HTTPException(
            status_code= status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    return user

def login_user(db:Session,email: str , password: str)-> str:
    user=authenticate_user(db,email,password)
    #If credentials are wrong, this line raises an exception and login_user() stops here entirely

    token = create_access_token(data={"sub":str(user.id)})
    #Only reached if credentials were valid — mint a JWT containing this user's ID

    return token


def request_login_otp(db: Session, email: str, password: str) -> dict:
    user = authenticate_user(db, email, password)
    return otp_service.create_and_send_otp(db, user, otp_service.LOGIN)


def verify_login_otp(db: Session, email: str, otp: str) -> str:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid login verification.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Verify your email before logging in.")

    otp_service.verify_otp(db, user, otp_service.LOGIN, otp)
    return create_access_token(data={"sub": str(user.id)})

def get_all_users(db:Session):
    return db.query(User).all()
    # SELECT * FROM users;  returns a Python list of User objects

def get_user_by_id(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def change_password(db: Session, user_id: int, current_pw: str, new_pw: str) -> dict:
    user = get_user_by_id(db, user_id)
    if not verify_password(current_pw, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    user.password_hash = hash_password(new_pw)
    db.commit()
    return {"detail": "Password updated successfully"}
