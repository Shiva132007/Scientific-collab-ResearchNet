from sqlalchemy.orm import Session
from fastapi import HTTPException
from models.department import Department
from schemas.department import DepartmentCreate, DepartmentUpdate

def create_departement(db:Session, data: DepartmentCreate)->Department:
    new_departement = Department(**data.dict())
    db.add(new_departement)
    db.commit()
    db.refresh(new_departement)
    return new_departement

def get_all_departments(db:Session):
    return db.query(Department).all()

def get_department_by_id(db:Session, department_id:int)->Department:
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")
    return department

def update_department(db:Session, department_id : int, updates: DepartmentUpdate)->Department:
    department = get_department_by_id(db,department_id)
    for key,value in updates.dict(exclude_unset=True).items():
        setattr(department, key, value)
    db.commit()
    db.refresh(department)
    return department

def delete_department(db:Session, department_id: int):
    department = get_department_by_id(db,department_id)
    db.delete(department)
    db.commit()
    return {"detail" : "Department deleted successfully"}