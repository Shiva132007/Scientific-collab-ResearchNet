import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR / "src"))

from database import DATABASE_URL, engine


def main():
    parsed = urlparse(DATABASE_URL)
    query = parse_qs(parsed.query)
    print(f"scheme={parsed.scheme}")
    print(f"username={parsed.username}")
    print(f"host={parsed.hostname}")
    print(f"port={parsed.port}")
    print(f"database={parsed.path.lstrip('/')}")
    print(f"sslmode={query.get('sslmode', [None])[0]}")

    try:
        with engine.connect() as connection:
            version = connection.execute(text("select version()")).scalar_one()
    except OperationalError as exc:
        original_error = str(getattr(exc, "orig", exc))
        if "password authentication failed" in original_error:
            print("connection=failed")
            print("reason=Supabase rejected the database password. Copy or reset the database password in Supabase, then update DATABASE_URL.")
            raise SystemExit(1) from exc

        print("connection=failed")
        print(original_error.splitlines()[0])
        raise SystemExit(1) from exc

    print("connection=ok")
    print(version.split(",", 1)[0])


if __name__ == "__main__":
    os.chdir(BASE_DIR)
    main()
