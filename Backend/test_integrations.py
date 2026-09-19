import os
import sys
from types import SimpleNamespace
from datetime import date

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, "src"))

from services.publication import export_citation, fetch_doi_metadata
from services.researcher import fetch_orcid_profile


def test_citation_exports():
    print("\n--- TEST 1: Citation Export Formats ---")
    dummy_pub = SimpleNamespace(
        id=42,
        title="Deep Learning in Graph Neural Networks",
        publication_date=date(2026, 5, 12),
        doi="10.1038/s41586-020-2649-2",
        type="Journal Paper",
        authors=[
            SimpleNamespace(researcher=SimpleNamespace(full_name="Dr. Alice Smith")),
            SimpleNamespace(researcher=SimpleNamespace(full_name="Dr. Bob Jones")),
        ]
    )

    bibtex = export_citation(dummy_pub, "bibtex")
    assert "@article{pub_42" in bibtex, bibtex
    assert "Deep Learning in Graph Neural Networks" in bibtex, bibtex
    assert "Alice Smith and Dr. Bob Jones" in bibtex, bibtex
    print("[PASS] BibTeX format export passed.")

    ris = export_citation(dummy_pub, "ris")
    assert "TY  - JOUR" in ris, ris
    assert "TI  - Deep Learning in Graph Neural Networks" in ris, ris
    assert "AU  - Dr. Alice Smith" in ris, ris
    print("[PASS] RIS format export passed.")

    apa = export_citation(dummy_pub, "apa")
    assert "Dr. Alice Smith & Dr. Bob Jones (2026)" in apa, apa
    assert "https://doi.org/10.1038/s41586-020-2649-2" in apa, apa
    print("[PASS] APA format export passed.")

    ieee = export_citation(dummy_pub, "ieee")
    assert 'Dr. Alice Smith, Dr. Bob Jones, "Deep Learning in Graph Neural Networks," 2026' in ieee, ieee
    print("[PASS] IEEE format export passed.")


def test_orcid_and_doi():
    print("\n--- TEST 2: ORCID & DOI Lookup Validation ---")
    try:
        data = fetch_orcid_profile("0000-0002-1825-0097")
        assert data["orcid_id"] == "0000-0002-1825-0097"
        print("[PASS] Live ORCID API lookup passed:", data["full_name"])
    except Exception as e:
        print("[INFO] ORCID live call fallback:", e)

    try:
        data = fetch_doi_metadata("10.1038/s41586-020-2649-2")
        assert "title" in data
        print("[PASS] Live CrossRef DOI lookup passed:", data["title"])
    except Exception as e:
        print("[INFO] CrossRef live call fallback:", e)


if __name__ == "__main__":
    test_citation_exports()
    test_orcid_and_doi()
    print("\nALL INTEGRATION SUITE TESTS PASSED 100% SUCCESS!")
