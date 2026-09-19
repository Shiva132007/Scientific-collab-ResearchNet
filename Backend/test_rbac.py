import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, "src"))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

TEST_DB_FILE = os.path.join(BASE_DIR, "test_rbac_temp.db")
if os.path.exists(TEST_DB_FILE):
    try:
        os.remove(TEST_DB_FILE)
    except Exception:
        pass

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from models.user import User, UserRole
from models.researcher import Researcher
from models.institution import Institution
from middleware.auth import create_access_token

SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

def setup_test_users():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        inst1 = Institution(name="RBAC Test Inst 1", type="University")
        inst2 = Institution(name="RBAC Test Inst 2", type="Lab")
        db.add(inst1)
        db.add(inst2)
        db.commit()

        # 1. Researcher User 1 (Inst 1)
        r1_user = User(email="researcher1_rbac@test.com", password_hash="dummy", role=UserRole.researcher, is_active=True)
        db.add(r1_user)
        db.commit()
        r1_res = Researcher(user_id=r1_user.id, full_name="Researcher One", institution_id=inst1.id)
        db.add(r1_res)
        db.commit()

        # 2. Researcher User 2 (Inst 2)
        r2_user = User(email="researcher2_rbac@test.com", password_hash="dummy", role=UserRole.researcher, is_active=True)
        db.add(r2_user)
        db.commit()
        r2_res = Researcher(user_id=r2_user.id, full_name="Researcher Two", institution_id=inst2.id)
        db.add(r2_res)
        db.commit()

        # 3. System Admin User
        admin_user = User(email="sysadmin_rbac@test.com", password_hash="dummy", role=UserRole.system_admin, is_active=True)
        db.add(admin_user)
        db.commit()

        # 4. Inst Admin User (Inst 1)
        inst_admin = User(email="instadmin1_rbac@test.com", password_hash="dummy", role=UserRole.institution_admin, is_active=True)
        db.add(inst_admin)
        db.commit()
        ia_res = Researcher(user_id=inst_admin.id, full_name="Inst Admin One", institution_id=inst1.id)
        db.add(ia_res)
        db.commit()

        # 5. Reviewer User
        reviewer_user = User(email="reviewer_rbac@test.com", password_hash="dummy", role=UserRole.reviewer, is_active=True)
        db.add(reviewer_user)
        db.commit()

        return {
            "r1_user_id": r1_user.id,
            "r1_res_id": r1_res.id,
            "r2_user_id": r2_user.id,
            "r2_res_id": r2_res.id,
            "admin_user_id": admin_user.id,
            "inst_admin_user_id": inst_admin.id,
            "reviewer_user_id": reviewer_user.id,
            "inst1_id": inst1.id,
        }
    finally:
        db.close()

def run_rbac_tests():
    data = setup_test_users()
    client = TestClient(app)

    token_r1 = create_access_token({"sub": str(data["r1_user_id"])})
    headers_r1 = {"Authorization": f"Bearer {token_r1}"}

    token_r2 = create_access_token({"sub": str(data["r2_user_id"])})
    headers_r2 = {"Authorization": f"Bearer {token_r2}"}

    token_admin = create_access_token({"sub": str(data["admin_user_id"])})
    headers_admin = {"Authorization": f"Bearer {token_admin}"}

    token_inst_admin = create_access_token({"sub": str(data["inst_admin_user_id"])})
    headers_inst_admin = {"Authorization": f"Bearer {token_inst_admin}"}

    token_reviewer = create_access_token({"sub": str(data["reviewer_user_id"])})
    headers_reviewer = {"Authorization": f"Bearer {token_reviewer}"}

    print("--- STARTING RBAC VERIFICATION TESTS ---", flush=True)

    r1_res_id = data["r1_res_id"]
    r2_res_id = data["r2_res_id"]
    inst1_id = data["inst1_id"]

    # TEST 1: Researcher 1 updating their own profile -> 200 OK
    res = client.put(f"/researchers/{r1_res_id}", json={"full_name": "Researcher One Updated"}, headers=headers_r1)
    assert res.status_code == 200, f"Test 1 failed: {res.status_code} {res.text}"
    print("✅ TEST 1 PASSED: Researcher can update their own profile.", flush=True)

    # TEST 2: Researcher 1 attempting to update Researcher 2 profile -> 403 Forbidden
    res = client.put(f"/researchers/{r2_res_id}", json={"full_name": "Hacked Name"}, headers=headers_r1)
    assert res.status_code == 403, f"Test 2 failed: Expected 403, got {res.status_code}"
    print("✅ TEST 2 PASSED: Researcher CANNOT update another researcher's profile (403 Forbidden).", flush=True)

    # TEST 3: Researcher 1 attempting to delete Researcher 2 profile -> 403 Forbidden
    res = client.delete(f"/researchers/{r2_res_id}", headers=headers_r1)
    assert res.status_code == 403, f"Test 3 failed: Expected 403, got {res.status_code}"
    print("✅ TEST 3 PASSED: Researcher CANNOT delete another researcher's profile (403 Forbidden).", flush=True)

    # TEST 4: Researcher 1 attempting to create department -> 403 Forbidden
    res = client.post("/departments/", json={"institution_id": inst1_id, "name": "Forbidden Dept"}, headers=headers_r1)
    assert res.status_code == 403, f"Test 4 failed: Expected 403, got {res.status_code}"
    print("✅ TEST 4 PASSED: Researcher CANNOT create departments (403 Forbidden).", flush=True)

    # TEST 5: System Admin updating Researcher 2 profile -> 200 OK
    res = client.put(f"/researchers/{r2_res_id}", json={"full_name": "Admin Updated Name"}, headers=headers_admin)
    assert res.status_code == 200, f"Test 5 failed: {res.status_code} {res.text}"
    print("✅ TEST 5 PASSED: SystemAdmin CAN update any researcher profile.", flush=True)

    # TEST 6: Institution Admin 1 updating Researcher 1 (same inst) -> 200 OK
    res = client.put(f"/researchers/{r1_res_id}", json={"full_name": "InstAdmin Updated Name"}, headers=headers_inst_admin)
    assert res.status_code == 200, f"Test 6 failed: {res.status_code} {res.text}"
    print("✅ TEST 6 PASSED: InstitutionAdmin CAN update researchers within their institution.", flush=True)

    # TEST 7: Institution Admin 1 updating Researcher 2 (different inst) -> 403 Forbidden
    res = client.put(f"/researchers/{r2_res_id}", json={"full_name": "Cross Inst Hack"}, headers=headers_inst_admin)
    assert res.status_code == 403, f"Test 7 failed: Expected 403, got {res.status_code}"
    print("✅ TEST 7 PASSED: InstitutionAdmin CANNOT update researchers in other institutions (403 Forbidden).", flush=True)

    # TEST 8: Reviewer attempting to create institution -> 403 Forbidden
    res = client.post("/institutions/", json={"name": "Forbidden Inst"}, headers=headers_reviewer)
    assert res.status_code == 403, f"Test 8 failed: Expected 403, got {res.status_code}"
    print("✅ TEST 8 PASSED: Reviewer CANNOT create institutions (403 Forbidden).", flush=True)

    # TEST 9: System Admin creating department -> 200 OK
    res = client.post("/departments/", json={"institution_id": inst1_id, "name": "CS Dept", "description": "Computer Science"}, headers=headers_admin)
    assert res.status_code == 200, f"Test 9 failed: {res.status_code} {res.text}"
    print("✅ TEST 9 PASSED: SystemAdmin CAN create departments.", flush=True)

    # TEST 10: Researcher 1 creates project; Researcher 2 attempts to edit it -> 403 Forbidden
    p1 = client.post("/projects/", json={"title": "R1 AI Project", "description": "Test AI", "status": "Proposed"}, headers=headers_r1)
    assert p1.status_code == 200, f"Project creation failed: {p1.text}"
    p1_id = p1.json()["id"]

    p_edit_r2 = client.put(f"/projects/{p1_id}", json={"title": "Hacked Title"}, headers=headers_r2)
    assert p_edit_r2.status_code == 403, f"Test 10 failed: Expected 403, got {p_edit_r2.status_code}"
    print("✅ TEST 10 PASSED: Regular user CANNOT modify another user's project (403 Forbidden).", flush=True)

    # TEST 11: System Admin updating Researcher 1's project -> 200 OK
    p_edit_admin = client.put(f"/projects/{p1_id}", json={"title": "Admin Approved Title"}, headers=headers_admin)
    assert p_edit_admin.status_code == 200, f"Test 11 failed: {p_edit_admin.status_code} {p_edit_admin.text}"
    print("✅ TEST 11 PASSED: SystemAdmin HAS full access to update any project.", flush=True)

    # TEST 12: Researcher 1 creates publication; Researcher 2 attempts to edit it -> 403 Forbidden
    pub1 = client.post("/publications/", json={"title": "R1 AI Paper", "type": "Journal", "status": "Draft"}, headers=headers_r1)
    assert pub1.status_code == 200, f"Publication creation failed: {pub1.text}"
    pub1_id = pub1.json()["id"]

    pub_edit_r2 = client.put(f"/publications/{pub1_id}", json={"title": "Hacked Paper Title"}, headers=headers_r2)
    assert pub_edit_r2.status_code == 403, f"Test 12 failed: Expected 403, got {pub_edit_r2.status_code}"
    print("✅ TEST 12 PASSED: Regular user CANNOT modify another user's publication (403 Forbidden).", flush=True)

    print("\n🎉 ALL 12 RBAC TESTS PASSED 100% SUCCESSFULLY!", flush=True)

    # Cleanup temp file
    engine.dispose()
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

if __name__ == "__main__":
    run_rbac_tests()
