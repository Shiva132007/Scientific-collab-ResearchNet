import argparse
import os
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR / "src"))

import models  # noqa: F401 - registers every model with SQLAlchemy metadata
from database import Base, DATABASE_HOST, engine
from seed_all import seed


def reset_database():
    print(f"Resetting PostgreSQL database on {DATABASE_HOST}...")
    try:
        Base.metadata.drop_all(bind=engine)
        with engine.begin() as connection:
            connection.execute(text("DROP TYPE IF EXISTS userrole CASCADE"))
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        original_error = str(getattr(exc, "orig", exc))
        print("reset=failed")
        print(original_error.splitlines()[0])
        raise SystemExit(1) from exc

    print("reset=ok")
    seed()


def main():
    parser = argparse.ArgumentParser(
        description="Drop all app tables, recreate the schema, and load dummy seed data."
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Required confirmation. This deletes existing app data in the configured PostgreSQL database.",
    )
    args = parser.parse_args()

    if not args.yes:
        print("Refusing to reset without --yes because this deletes database data.")
        raise SystemExit(2)

    os.chdir(BASE_DIR)
    reset_database()


if __name__ == "__main__":
    main()
