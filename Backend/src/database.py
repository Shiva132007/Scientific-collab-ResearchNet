import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def _ensure_supabase_ssl(database_url: str) -> str:
    parsed = urlparse(database_url)
    if not parsed.hostname or "supabase" not in parsed.hostname:
        return database_url

    query_params = parse_qsl(parsed.query)
    if any(key.lower() == "sslmode" for key, _ in query_params):
        return database_url

    query = urlencode([*query_params, ("sslmode", "require")])
    return urlunparse(parsed._replace(query=query))


def _normalize_database_url(database_url: str) -> str:
    normalized_url = database_url.strip()
    if normalized_url.startswith("postgres://"):
        normalized_url = normalized_url.replace("postgres://", "postgresql://", 1)
    if normalized_url.startswith("postgresql"):
        normalized_url = _ensure_supabase_ssl(normalized_url)
    return normalized_url


def _get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL") or os.getenv("Database_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is required in Backend/.env and must be a PostgreSQL URL.")

    normalized_url = _normalize_database_url(database_url)
    if not normalized_url.startswith("postgresql://"):
        raise RuntimeError("DATABASE_URL must start with postgresql:// or postgres://.")

    return normalized_url


DATABASE_URL = _get_database_url()
DATABASE_CONFIG = urlparse(DATABASE_URL)
DATABASE_HOST = DATABASE_CONFIG.hostname
DATABASE_USERNAME = DATABASE_CONFIG.username


def _create_engine(database_url: str):
    echo_sql = os.getenv("SQLALCHEMY_ECHO", "false").lower() == "true"
    return create_engine(
        database_url,
        echo=echo_sql,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=300,
    )



engine = _create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        original_error = str(getattr(exc, "orig", exc))
        if (
            DATABASE_HOST
            and DATABASE_HOST.startswith("db.")
            and DATABASE_HOST.endswith(".supabase.co")
            and "could not translate host name" in original_error
        ):
            raise RuntimeError(
                f"Could not resolve Supabase direct database host '{DATABASE_HOST}'. "
                "Use the Supabase Dashboard's IPv4-compatible Session pooler connection string "
                "for DATABASE_URL, or enable Supabase's IPv4 add-on for direct database connections."
            ) from exc

        if (
            DATABASE_HOST
            and DATABASE_HOST.endswith(".pooler.supabase.com")
            and "password authentication failed" in original_error
        ):
            username_hint = (
                "The username should look like 'postgres.PROJECT_REF'. "
                if DATABASE_USERNAME == "postgres"
                else ""
            )
            raise RuntimeError(
                f"Supabase rejected the database credentials for '{DATABASE_HOST}'. "
                f"{username_hint}"
                "Reset or copy the database password from Supabase Project Settings > Database, "
                "then paste the full Session pooler URI into Backend/.env as DATABASE_URL."
            ) from exc

        raise RuntimeError(
            "Database connection failed while creating tables. Check DATABASE_URL in Backend/.env. "
            "If you are using Supabase, confirm the project reference/host is correct and use "
            "the pooler connection string with sslmode=require."
        ) from exc


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
