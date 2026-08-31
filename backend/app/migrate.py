from pathlib import Path

from sqlalchemy import inspect, text

from .database import DATA_DIR, engine

UPLOAD_ROOT = DATA_DIR / "uploads"
AVATAR_DIR = UPLOAD_ROOT / "avatars"
LEDGER_COVER_DIR = UPLOAD_ROOT / "ledger-covers"


def ensure_upload_dirs() -> None:
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    LEDGER_COVER_DIR.mkdir(parents=True, exist_ok=True)


def media_url(relative: str | None) -> str | None:
    if not relative:
        return None
    return f"/api/v1/media/{relative}"


def ensure_schema() -> None:
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    user_cols = {c["name"] for c in insp.get_columns("users")}
    ledger_cols = {c["name"] for c in insp.get_columns("ledgers")}
    with engine.begin() as conn:
        if "avatar_path" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255) DEFAULT ''"))
        if "cover_path" not in ledger_cols:
            conn.execute(text("ALTER TABLE ledgers ADD COLUMN cover_path VARCHAR(255) DEFAULT ''"))
        if "description" not in ledger_cols:
            conn.execute(text("ALTER TABLE ledgers ADD COLUMN description VARCHAR(200) DEFAULT ''"))

