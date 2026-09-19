from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

from database import get_db
from models.user import User

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM","HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE",60))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
#Configures passlib to use bcrypt specifically

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")
# Tells FastAPI/Swagger "to get a token, POST to /users/login"
# This is what makes the "Authorize" button in Swagger UI work automatically

def hash_password(plain_password: str)-> bool:
    return pwd_context.hash(plain_password)
    # Calling this twice on the SAME password gives DIFFERENT output each time (random salt baked in)

def verify_password(plain_password:str, hashed_password: str)-> bool:
    return pwd_context.verify(plain_password, hashed_password)
    #Re-hashes plain_password using the same salt extracted from hashed_password,then compares strigns

def create_access_token(data: dict, expires_delta: timedelta | None=None):
    to_encode = data.copy()
    # ↑ e.g. data = {"sub": "5"}  (sub = "subject", standard JWT claim for "who is this token about")

    expire = datetime.utcnow()+(expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp":expire})
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db))->User:
    #Depends(oauth2_scheme) automatically extracts the token from:
    #  Authorization: Bearer eyJhbGc...
    # header on the incoming request — you never manually parse headers

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate":"Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        #Verifies the signature is valid AND checks "exp" hasn't passed
        # Raises JWTError automatically if token is tampered with or expired

        user_id : str = payload.get("sub")
        #Pulls out user ID we embedded during login

        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    # Actually fetches the real user row from Postgres using the ID from the token

    if user is None:
        raise credentials_exception
        # ↑ Edge case: token is technically valid, but that user was deleted since — reject anyway
    return user
    # ↑ This returned User object becomes `current_user` in any route using Depends(get_current_user)

def get_user_role_str(user: User) -> str:
    if hasattr(user.role, "value"):
        return user.role.value
    return str(user.role)

def require_roles(*allowed_roles: str):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        user_role = get_user_role_str(current_user)
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Action requires one of {list(allowed_roles)} roles."
            )
        return current_user
    return role_checker

def check_researcher_write_permission(db: Session, target_researcher_id: int, current_user: User):
    from models.researcher import Researcher
    from models.institution import Institution

    role_str = get_user_role_str(current_user)
    if role_str == "SystemAdmin":
        return True

    target_res = db.query(Researcher).filter(Researcher.id == target_researcher_id).first()
    if not target_res:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Researcher profile not found")

    if target_res.user_id == current_user.id:
        return True

    if role_str == "InstitutionAdmin":
        admin_res = db.query(Researcher).filter(Researcher.user_id == current_user.id).first()
        admin_inst_id = admin_res.institution_id if admin_res else None
        if not admin_inst_id:
            first_inst = db.query(Institution).first()
            admin_inst_id = first_inst.id if first_inst else None

        if target_res.institution_id and target_res.institution_id == admin_inst_id:
            return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permission denied: You cannot alter or delete another user's registration profile."
    )