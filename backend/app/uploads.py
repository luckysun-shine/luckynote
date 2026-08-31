from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile

from .migrate import AVATAR_DIR, LEDGER_COVER_DIR, ensure_upload_dirs

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 2 * 1024 * 1024
EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


async def save_image(file: UploadFile, dest_dir: Path, prefix: str) -> str:
    ensure_upload_dirs()
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "仅支持 JPG / PNG / WebP / GIF 图片")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "图片不能超过 2MB")
    ext = EXT_MAP.get(file.content_type, ".jpg")
    name = f"{prefix}_{secrets.token_hex(8)}{ext}"
    path = dest_dir / name
    path.write_bytes(data)
    from .migrate import UPLOAD_ROOT

    return str(path.relative_to(UPLOAD_ROOT)).replace("\\", "/")


def media_file_path(relative: str) -> Path:
    from .migrate import UPLOAD_ROOT

    safe = Path(relative)
    if ".." in safe.parts or safe.is_absolute():
        raise ValueError("非法路径")
    full = (UPLOAD_ROOT / safe).resolve()
    root = UPLOAD_ROOT.resolve()
    if not str(full).startswith(str(root)):
        raise ValueError("非法路径")
    return full


def delete_media(relative: str | None) -> None:
    if not relative:
        return
    try:
        path = media_file_path(relative)
    except ValueError:
        return
    if path.exists():
        path.unlink()


async def save_user_avatar(file: UploadFile, user_id: int) -> str:
    return await save_image(file, AVATAR_DIR, f"u{user_id}")


async def save_ledger_cover(file: UploadFile, ledger_id: int) -> str:
    return await save_image(file, LEDGER_COVER_DIR, f"l{ledger_id}")
