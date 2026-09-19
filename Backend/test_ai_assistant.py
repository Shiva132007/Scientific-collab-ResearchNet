import os
import sys
from types import SimpleNamespace

os.environ.pop("AI_API_KEY", None)
os.environ.pop("AI_PROVIDER", None)
os.environ.pop("AI_API_BASE_URL", None)
os.environ.pop("AI_MODEL", None)

sys.path.append("src")
os.environ.setdefault("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")

from services.ai_service import generate_assistant_reply, is_app_related


class DummyQuery:
    def __init__(self, result):
        self.result = result

    def count(self):
        return self.result

    def all(self):
        return self.result

    def first(self):
        return self.result


class DummyDB:
    def __init__(self, counts):
        self._counts = counts

    def query(self, model):
        if model.__name__ == "Researcher":
            return DummyQuery(self._counts.get("researchers", 0))
        if model.__name__ == "Publication":
            return DummyQuery(self._counts.get("publications", 0))
        if model.__name__ == "Project":
            return DummyQuery(self._counts.get("projects", 0))
        if model.__name__ == "Conference":
            return DummyQuery(self._counts.get("conferences", 0))
        if model.__name__ == "Institution":
            return DummyQuery(self._counts.get("institutions", 0))
        if model.__name__ == "Department":
            return DummyQuery(self._counts.get("departments", 0))
        if model.__name__ == "Collaboration":
            return DummyQuery(self._counts.get("collaborations", 0))
        return DummyQuery(0)


user = SimpleNamespace(email="alice@research.net", role="Researcher")
db = DummyDB({
    "researchers": 12,
    "publications": 48,
    "projects": 9,
    "conferences": 4,
    "institutions": 3,
    "departments": 7,
    "collaborations": 15,
})

assert is_app_related("How many publications are in the application?") is True
assert is_app_related("What is the capital of France?") is False

answer = generate_assistant_reply(db, user, "How many publications are in the application?")
assert "48" in answer, answer
assert "I can only answer questions related to this application." not in answer

rejected = generate_assistant_reply(db, user, "What is the capital of France?")
assert rejected == "I can only answer questions related to this application.", rejected

generic = generate_assistant_reply(db, user, "Can you tell me about the data in this application?")
assert "Current records include" in generic, generic
assert "researchers" in generic, generic

print("AI assistant behavior checks passed.")
