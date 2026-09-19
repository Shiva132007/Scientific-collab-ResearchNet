import json
import os
import time
from urllib import error, request

from sqlalchemy.orm import Session

from models.collaboration import Collaboration
from models.conference import Conference
from models.department import Department
from models.institution import Institution
from models.project import Project
from models.publication import Publication
from models.researcher import Researcher

UNRELATED_RESPONSE = "I can only answer questions related to this application."

APP_TERMS = [
    "research", "publication", "project", "conference", "collaboration",
    "institution", "department", "researcher", "dashboard", "network",
    "citation", "notification", "report", "audit", "scientific", "app",
    "researchnet", "scientific collaboration network analyzer", "application",
    "platform", "dataset", "data"
]


def is_app_related(message: str) -> bool:
    text = (message or "").strip().lower()
    if not text:
        return False

    if "i can only answer questions related to this application" in text:
        return False
    return any(term in text for term in APP_TERMS)


def _safe_count(query):
    try:
        return int(query.count())
    except Exception:
        try:
            return len(query.all())
        except Exception:
            return 0


def _build_context_summary(db: Session, user) -> str:
    counts = {
        "researchers": _safe_count(db.query(Researcher)),
        "publications": _safe_count(db.query(Publication)),
        "projects": _safe_count(db.query(Project)),
        "conferences": _safe_count(db.query(Conference)),
        "institutions": _safe_count(db.query(Institution)),
        "departments": _safe_count(db.query(Department)),
        "collaborations": _safe_count(db.query(Collaboration)),
    }

    role = getattr(user, "role", None)
    role_label = getattr(role, "value", role) if role else "Unknown"

    summary = (
        "This application is the Scientific Collaboration Network Analyzer. "
        f"It currently contains {counts['researchers']} researchers, {counts['publications']} publications, "
        f"{counts['projects']} projects, {counts['conferences']} conferences, {counts['institutions']} institutions, "
        f"{counts['departments']} departments, and {counts['collaborations']} collaborations. "
        f"The current user role is {role_label}."
    )

    return summary


def _build_fallback_answer(db: Session, user, question: str) -> str:
    text = (question or "").lower()
    counts = {
        "researchers": _safe_count(db.query(Researcher)),
        "publications": _safe_count(db.query(Publication)),
        "projects": _safe_count(db.query(Project)),
        "conferences": _safe_count(db.query(Conference)),
        "institutions": _safe_count(db.query(Institution)),
        "departments": _safe_count(db.query(Department)),
        "collaborations": _safe_count(db.query(Collaboration)),
    }

    if "researcher" in text:
        return f"There are {counts['researchers']} researchers in this application."
    if "publication" in text:
        return f"There are {counts['publications']} publications currently recorded in the application."
    if "project" in text:
        return f"There are {counts['projects']} projects in the application."
    if "conference" in text:
        return f"There are {counts['conferences']} conferences in the application."
    if "institution" in text:
        return f"There are {counts['institutions']} institutions in the application."
    if "department" in text:
        return f"There are {counts['departments']} departments in the application."
    if "collaboration" in text:
        return f"There are {counts['collaborations']} collaborations in the application."
    if "dashboard" in text or "overview" in text or "summary" in text:
        return (
            "This application provides a dashboard with researcher, publication, project, conference, and collaboration metrics. "
            "Use the dashboard and list pages to review the latest data."
        )

    return (
        "I can help with this application's data. "
        f"Current records include {counts['researchers']} researchers, {counts['publications']} publications, "
        f"{counts['projects']} projects, {counts['conferences']} conferences, {counts['institutions']} institutions, "
        f"{counts['departments']} departments, and {counts['collaborations']} collaborations. "
        "Ask about any of these modules for a focused answer."
    )


def _call_ai_api(context_summary: str, question: str) -> str | None:
    api_key = os.getenv("AI_API_KEY")
    if not api_key:
        return None

    provider = (os.getenv("AI_PROVIDER") or "openai").lower()
    base_url = (os.getenv("AI_API_BASE_URL") or (
        "https://generativelanguage.googleapis.com/v1beta" if provider == "gemini" else "https://api.openai.com/v1"
    )).rstrip("/")
    model = os.getenv("AI_MODEL") or ("gemini-flash-latest" if provider == "gemini" else "gpt-4o-mini")
    timeout = int(os.getenv("AI_REQUEST_TIMEOUT") or "20")

    system_instruction = (
        "You are an AI assistant for the Scientific Collaboration Network Analyzer application only. "
        "Answer only questions related to this application and its data. "
        "Do not answer unrelated general questions. If the answer cannot be determined from the application's data, say it is not available. "
        "Never invent information or provide facts outside this project. "
        "Use the provided application context exactly."
    )

    if provider in {"gemini", "google"}:
        payload = {
            "contents": [{
                "role": "user",
                "parts": [{"text": f"System instruction: {system_instruction}\n\nApplication context:\n{context_summary}\n\nQuestion:\n{question}"}],
            }],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 300,
            },
        }
        endpoint = f"{base_url}/models/{model}:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}

        for attempt in range(3):
            try:
                req = request.Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
                with request.urlopen(req, timeout=timeout) as response:
                    body = response.read().decode("utf-8")
                    data = json.loads(body)
                    candidates = data.get("candidates") or []
                    if not candidates:
                        return None
                    content = candidates[0].get("content", {})
                    parts = content.get("parts") or []
                    text_parts = [part.get("text", "") for part in parts if isinstance(part, dict)]
                    answer = "".join(text_parts).strip()
                    return answer or None
            except error.HTTPError as exc:
                if exc.code in {429, 500, 502, 503, 504} and attempt < 2:
                    time.sleep(0.35 * (attempt + 1))
                    continue
                return None
            except (error.URLError, TimeoutError, ValueError):
                if attempt < 2:
                    time.sleep(0.35 * (attempt + 1))
                    continue
                return None
        return None

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": f"Application context:\n{context_summary}\n\nQuestion:\n{question}"},
        ],
        "temperature": 0.2,
        "max_tokens": 300,
    }

    endpoint = f"{base_url}/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    try:
        req = request.Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        with request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            data = json.loads(body)
            choices = data.get("choices") or []
            if not choices:
                return None
            answer = choices[0].get("message", {}).get("content")
            return (answer or "").strip() if answer else None
    except (error.HTTPError, error.URLError, TimeoutError, ValueError):
        return None


def generate_assistant_reply(db: Session, user, question: str) -> str:
    if not question or not question.strip():
        return "Please enter a question about this application."

    if not is_app_related(question):
        return UNRELATED_RESPONSE

    context_summary = _build_context_summary(db, user)
    answer = _call_ai_api(context_summary, question)
    if answer:
        return answer.strip()

    fallback = _build_fallback_answer(db, user, question)
    if fallback:
        return fallback

    return "I don’t have that information available in this application’s data."
