#!/usr/bin/env python3
"""从 public/icons/icon-source.jpg 生成 PWA 各尺寸 PNG。"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "public" / "icons"
SOURCE = ICONS / "icon-source.jpg"
BG = (251, 246, 240)  # #FBF6F0


def prepare_square(src: Image.Image, trim_watermark: bool = True) -> Image.Image:
    im = src.convert("RGB")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    im = im.crop((left, top, left + side, top + side))
    if trim_watermark:
        # 裁掉右下角 AI 水印区域，再补回正方形
        inset = int(side * 0.04)
        im = im.crop((inset, inset, side - inset * 3, side - inset * 2))
        im = im.resize((side, side), Image.Resampling.LANCZOS)
    return im


def save_any(im: Image.Image, size: int, path: Path) -> None:
    out = im.resize((size, size), Image.Resampling.LANCZOS)
    out.save(path, "PNG", optimize=True)


def save_maskable(im: Image.Image, size: int, path: Path, scale: float = 0.82) -> None:
    canvas = Image.new("RGB", (size, size), BG)
    inner = int(size * scale)
    scaled = im.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(scaled, (offset, offset))
    canvas.save(path, "PNG", optimize=True)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"缺少源图: {SOURCE}")
    base = prepare_square(Image.open(SOURCE))
    jobs = [
        ("icon-512.png", 512, "any"),
        ("icon-192.png", 192, "any"),
        ("apple-touch-icon.png", 180, "any"),
        ("icon-512-maskable.png", 512, "maskable"),
        ("icon-192-maskable.png", 192, "maskable"),
    ]
    for name, size, kind in jobs:
        path = ICONS / name
        if kind == "maskable":
            save_maskable(base, size, path)
        else:
            save_any(base, size, path)
        print(f"✓ {name} ({size}px)")


if __name__ == "__main__":
    main()
