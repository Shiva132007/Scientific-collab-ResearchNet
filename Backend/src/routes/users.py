from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from schemas.user import AuthMessage, OTPRequest, OTPVerify, UserCreate, UserOut, Token
from services import user_service
from middleware.auth import get_current_user
from models.user import User

router = APIRouter(prefix="/users", tags=["Users"])
# Every route below automatically gets prefixed with /users
# tags=["Users"] groups these endpoints together in the Swagger docs UI

@router.post("/register",response_model = UserOut)
def register(user:UserCreate, db:Session = Depends(get_db)):
    return user_service.create_user(db,user)

@router.post("/verify-email", response_model=AuthMessage)
def verify_email(data: OTPVerify, db: Session = Depends(get_db)):
    return user_service.verify_email_otp(db, data.email, data.otp)

@router.post("/resend-verification", response_model=AuthMessage)
def resend_verification(data: OTPRequest, db: Session = Depends(get_db)):
    return user_service.send_email_verification_otp(db, data.email)

@router.post("/login",response_model=AuthMessage)
def login(form_data : OAuth2PasswordRequestForm = Depends(), db:Session = Depends(get_db)):
    return user_service.request_login_otp(db,form_data.username, form_data.password)

@router.post("/login/verify", response_model=Token)
def verify_login(data: OTPVerify, db: Session = Depends(get_db)):
    token=user_service.verify_login_otp(db,data.email, data.otp)
    return {"access_token":token, "token_type":"bearer"}

from schemas.user import PasswordChange

@router.put("/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return user_service.change_password(db, current_user.id, data.current_password, data.new_password)

@router.get("/me",response_model=UserOut)
def get_me(db:Session = Depends(get_db), current_user : User = Depends(get_current_user)):
    return current_user


from middleware.auth import get_current_user, get_user_role_str
from fastapi import HTTPException, status

@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role_str = get_user_role_str(current_user)
    if current_user.id != user_id and role_str not in ["SystemAdmin", "InstitutionAdmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only view your own account information."
        )
    return user_service.get_user_by_id(db, user_id)

