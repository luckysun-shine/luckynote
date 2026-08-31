from __future__ import annotations

import json
import logging
import shutil
import sqlite3
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

from .database import DATA_DIR, DB_PATH

logger = logging.getLogger("luckynote.backup")

BACKUP_DIR = DATA_DIR / "backups"
CONFIG_PATH = DATA_DIR / "backup-config.json"

DEFAULT_CONFIG: dict[str, Any] = {
    "enabled": False,
    "frequency": "daily",
    "hour": 3,
    "minute": 0,
    "weekday": 0,
    "keep_count": 7,
}


def _ensure_dirs() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def load_config() -> dict[str, Any]:
    _ensure_dirs()
    if not CONFIG_PATH.exists():
        return DEFAULT_CONFIG.copy()
    try:
        data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        merged = DEFAULT_CONFIG.copy()
        merged.update(data)
        return merged
    except (json.JSONDecodeError, OSError):
        return DEFAULT_CONFIG.copy()


def save_config(config: dict[str, Any]) -> dict[str, Any]:
    _ensure_dirs()
    merged = DEFAULT_CONFIG.copy()
    merged.update(config)
    CONFIG_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    return merged


def _checkpoint_db() -> None:
    if not DB_PATH.exists():
        return
    try:
        conn = sqlite3.connect(str(DB_PATH))
        try:
            conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            conn.commit()
        finally:
            conn.close()
    except sqlite3.DatabaseError:
        pass


def _safe_name(name: str) -> Path:
    base = Path(name).name
    if ".." in base or "/" in base or "\\" in base:
        raise ValueError("非法文件名")
    path = BACKUP_DIR / base
    if not path.resolve().is_relative_to(BACKUP_DIR.resolve()):
        raise ValueError("非法路径")
    return path


def create_backup(note: str = "manual") -> dict[str, Any]:
    _ensure_dirs()
    if not DB_PATH.exists():
        raise FileNotFoundError("数据库文件不存在")
    _checkpoint_db()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    zip_name = f"luckynote_{ts}.zip"
    zip_path = BACKUP_DIR / zip_name
    manifest = {
        "created_at": datetime.now().isoformat(),
        "source": str(DB_PATH),
        "note": note,
        "app": "LuckyNote",
    }
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(DB_PATH, arcname="luckynote.db")
        zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=2))
    size = zip_path.stat().st_size
    logger.info("backup created: %s (%s bytes)", zip_name, size)
    prune_backups(load_config().get("keep_count", 7))
    return backup_info(zip_path)


def backup_info(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "filename": path.name,
        "size": stat.st_size,
        "size_human": _human_size(stat.st_size),
        "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
    }


def _human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}" if unit != "B" else f"{n} B"
        n /= 1024
    return f"{n:.1f} TB"


def list_backups() -> list[dict[str, Any]]:
    _ensure_dirs()
    files = sorted(BACKUP_DIR.glob("luckynote_*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    return [backup_info(p) for p in files]


def delete_backup(filename: str) -> None:
    path = _safe_name(filename)
    if not path.exists():
        raise FileNotFoundError("备份不存在")
    path.unlink()


def backup_path(filename: str) -> Path:
    path = _safe_name(filename)
    if not path.exists():
        raise FileNotFoundError("备份不存在")
    return path


def prune_backups(keep_count: int) -> int:
    keep_count = max(1, int(keep_count))
    files = sorted(BACKUP_DIR.glob("luckynote_*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    removed = 0
    for old in files[keep_count:]:
        old.unlink()
        removed += 1
    return removed


def restore_backup(filename: str) -> None:
    path = backup_path(filename)
    _checkpoint_db()
    with zipfile.ZipFile(path, "r") as zf:
        names = zf.namelist()
        if "luckynote.db" not in names:
            raise ValueError("备份包内缺少 luckynote.db")
        tmp = DATA_DIR / "luckynote.db.restore.tmp"
        with zf.open("luckynote.db") as src, open(tmp, "wb") as dst:
            shutil.copyfileobj(src, dst)
    for suffix in ("-wal", "-shm"):
        side = DATA_DIR / f"luckynote.db{suffix}"
        if side.exists():
            side.unlink()
    tmp.replace(DB_PATH)
    logger.info("database restored from %s", filename)


def config_to_cron_kwargs(config: dict[str, Any]) -> dict[str, Any]:
    freq = config.get("frequency", "daily")
    hour = int(config.get("hour", 3))
    minute = int(config.get("minute", 0))
    if freq == "weekly":
        return {"trigger": "cron", "day_of_week": int(config.get("weekday", 0)), "hour": hour, "minute": minute}
    return {"trigger": "cron", "hour": hour, "minute": minute}
