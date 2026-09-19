"""
test_reports.py — Automated test suite for role-scoped reports endpoints
========================================================================
Run with:
    python test_reports.py
or
    pytest test_reports.py
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def get_token(email: str, password: str = "Password123!") -> str:
    response = client.post(
        "/users/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    return response.json()["access_token"]

def test_system_admin_reports():
    print("\n[TEST] 1. SystemAdmin Reports (Global Scope)")
    token = get_token("sysadmin@scna.dev")
    headers = {"Authorization": f"Bearer {token}"}

    # Publications
    res = client.get("/reports/publications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_publications" in data
    assert "type_counts" in data
    assert "status_counts" in data
    print(f"  ✓ /reports/publications: {data['total_publications']} total publications")

    # Researchers
    res = client.get("/reports/researchers", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_researchers" in data
    assert "department_counts" in data
    assert "skills_summary" in data
    print(f"  ✓ /reports/researchers: {data['total_researchers']} total researchers")

    # Collaborations
    res = client.get("/reports/collaborations", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_collaborations" in data
    print(f"  ✓ /reports/collaborations: {data['total_collaborations']} total collaborations")

    # Institutions
    res = client.get("/reports/institutions", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_institutions" in data
    print(f"  ✓ /reports/institutions: {data['total_institutions']} total institutions")

    # CSV Export
    res = client.get("/reports/export/csv?report_type=publications", headers=headers)
    assert res.status_code == 200
    assert "Content-Disposition" in res.headers
    print("  ✓ /reports/export/csv: CSV downloaded successfully")

    # PDF Export
    res = client.get("/reports/export/pdf?report_type=publications", headers=headers)
    assert res.status_code == 200
    assert "REPORT OUTLINE" in res.text
    print("  ✓ /reports/export/pdf: PDF summary generated successfully")


def test_institution_admin_reports():
    print("\n[TEST] 2. InstitutionAdmin Reports (Institution Scope)")
    token = get_token("admin.mit@scna.dev")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/reports/publications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    print(f"  ✓ MIT Admin Publications: {data['total_publications']} scoped publications")

    res = client.get("/reports/researchers", headers=headers)
    assert res.status_code == 200
    data = res.json()
    print(f"  ✓ MIT Admin Researchers: {data['total_researchers']} scoped researchers")


def test_researcher_reports():
    print("\n[TEST] 3. Researcher Reports (Personal Scope)")
    token = get_token("alice.chen@mit.edu")
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/reports/publications", headers=headers)
    assert res.status_code == 200
    data = res.json()
    print(f"  ✓ Alice Chen Publications: {data['total_publications']} personal publications")

    res = client.get("/reports/researchers", headers=headers)
    assert res.status_code == 200
    data = res.json()
    print(f"  ✓ Alice Chen Collaborators: {data['total_researchers']} collaborators")


def test_saved_reports():
    print("\n[TEST] 4. Saved Reports Configuration")
    token = get_token("alice.chen@mit.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Save a report
    payload = {"title": "Alice's Custom View", "type": "publications"}
    res = client.post("/reports/saved", json=payload, headers=headers)
    assert res.status_code == 200
    saved = res.json()
    assert saved["title"] == "Alice's Custom View"
    print(f"  ✓ Saved report created: ID={saved['id']}, Title='{saved['title']}'")

    # Fetch saved reports
    res = client.get("/reports/saved", headers=headers)
    assert res.status_code == 200
    list_saved = res.json()
    assert len(list_saved) > 0
    print(f"  ✓ Retrieved {len(list_saved)} saved report config(s)")


if __name__ == "__main__":
    print("==============================================")
    print("   Running Role-Scoped Reports Test Suite")
    print("==============================================")
    test_system_admin_reports()
    test_institution_admin_reports()
    test_researcher_reports()
    test_saved_reports()
    print("\n==============================================")
    print("   ALL REPORT TESTS PASSED SUCCESSFULLY! (4/4)")
    print("==============================================\n")
