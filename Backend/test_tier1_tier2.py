import sys
import os
sys.path.append("src")
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app
from database import Base, engine, SessionLocal
from models.user import User, UserRole
from models.researcher import Researcher
from models.institution import Institution
from models.department import Department
from middleware.auth import hash_password, create_access_token

client = TestClient(app)

def run_tests():
    print("--- Starting Tier 1 & Tier 2 Integration Tests ---", flush=True)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Setup Test Users
    u1 = db.query(User).filter(User.email == "test_tier1_user1@scna.dev").first()
    if not u1:
        u1 = User(
            email="test_tier1_user1@scna.dev",
            password_hash=hash_password("password123"),
            role=UserRole.researcher,
        )
        db.add(u1)
        db.commit()
        db.refresh(u1)

    r1 = db.query(Researcher).filter(Researcher.user_id == u1.id).first()
    if not r1:
        r1 = Researcher(user_id=u1.id, full_name="Dr. Test Tier1", bio="AI Researcher", skills="Python, PyTorch")
        db.add(r1)
        db.commit()

    token = create_access_token(data={"sub": str(u1.id)})
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test GET /researchers/me
    res = client.get("/researchers/me", headers=headers)
    assert res.status_code == 200, f"GET /researchers/me failed: {res.text}"
    profile = res.json()
    print(f"[PASS] GET /researchers/me: Full Name='{profile['full_name']}', Email='{profile['email']}'", flush=True)

    # 3. Test PUT /researchers/me
    update_payload = {
        "full_name": "Dr. Updated Tier1 Name",
        "bio": "Updated Bio text for testing",
        "research_interests": "Artificial Intelligence, Quantum Computing",
        "skills": "Python, FastApi, React",
        "orcid_id": "0000-0001-9999-8888",
    }
    res = client.put("/researchers/me", json=update_payload, headers=headers)
    assert res.status_code == 200, f"PUT /researchers/me failed: {res.text}"
    updated_profile = res.json()
    assert updated_profile["full_name"] == "Dr. Updated Tier1 Name"
    print(f"[PASS] PUT /researchers/me: Updated Full Name='{updated_profile['full_name']}', ORCID='{updated_profile['orcid_id']}'", flush=True)

    # 4. Test GET /researchers/discover
    res = client.get("/researchers/discover?query=Quantum", headers=headers)
    assert res.status_code == 200, f"GET /researchers/discover failed: {res.text}"
    discovered = res.json()
    print(f"[PASS] GET /researchers/discover: Found {len(discovered)} matching researcher(s)", flush=True)

    # 5. Test GET /search
    res = client.get("/search?q=Updated", headers=headers)
    assert res.status_code == 200, f"GET /search failed: {res.text}"
    search_res = res.json()
    assert "researchers" in search_res and "publications" in search_res
    print(f"[PASS] GET /search: Global search returned {len(search_res['researchers'])} researcher(s), {len(search_res['publications'])} paper(s)", flush=True)

    # 6. Test GET /collaborations/network-graph
    res = client.get("/collaborations/network-graph", headers=headers)
    assert res.status_code == 200, f"GET /collaborations/network-graph failed: {res.text}"
    graph = res.json()
    assert "nodes" in graph and "links" in graph
    print(f"[PASS] GET /collaborations/network-graph: Nodes count={graph['total_nodes']}, Links count={graph['total_links']}", flush=True)

    # 7. Test PUT /users/change-password
    pw_payload = {
        "current_password": "password123",
        "new_password": "newsecretpassword123"
    }
    res = client.put("/users/change-password", json=pw_payload, headers=headers)
    assert res.status_code == 200, f"PUT /users/change-password failed: {res.text}"
    print("[PASS] PUT /users/change-password: Password changed successfully", flush=True)

    # Reset password back
    pw_reset_payload = {
        "current_password": "newsecretpassword123",
        "new_password": "password123"
    }
    client.put("/users/change-password", json=pw_reset_payload, headers=headers)

    db.close()
    print("\nALL TIER 1 & TIER 2 INTEGRATION TESTS PASSED 100% SUCCESS!", flush=True)

if __name__ == "__main__":
    run_tests()
