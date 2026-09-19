from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate
from services import department
from middleware.auth import get_current_user, require_roles
from models.user import User

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.post("/", response_model=DepartmentOut)
def create_department(
    data: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return department.create_departement(db, data)

@router.get("/", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return department.get_all_departments(db)

@router.get("/{department_id}", response_model=DepartmentOut)
def get_department(department_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return department.get_department_by_id(db, department_id)

@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int,
    data: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return department.update_department(db, department_id, data)

@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("SystemAdmin", "InstitutionAdmin"))
):
    return department.delete_department(db, department_id)

