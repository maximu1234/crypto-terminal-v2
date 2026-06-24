#!/usr/bin/env python3
"""Archive Photoshop exports, build transparent work copies (full size, no resize)."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(
    "/Users/maxdrukpa/.cursor/projects/Users-maxdrukpa-crypto-terminal-v2/assets"
)
ORIGINAL_DIR = ROOT / "assets" / "draw-toolbar-icons-original"
WORK_DIR = ROOT / "assets" / "draw-toolbar-icons-work"
CANVAS = (50, 70)
BG = (15, 15, 15)  # #0f0f0f

SOURCE_FILES: dict[str, str] = {
    "cross-ed2193bd-4226-43cc-bf6b-431a9a325cc2.png": "cursor.png",
    "trendline-ec8895d0-2c45-4faf-be0b-9b7c258ce8b9.png": "trendline.png",
    "arrow-466e16a7-a0b9-41bf-809a-47dfe1e231f3.png": "arrow.png",
    "ray-19f9058e-07a6-4888-b3f2-f9396e4de57e.png": "hray.png",
    "channel-14b2dfc0-6295-43f2-90ca-a938e989cd9c.png": "channel.png",
    "brush-c3e2eb1c-f9a2-4c1c-a9ea-c1db4fb6997a.png": "brush.png",
    "fib-9a7d7ba0-461d-439d-a58a-8c394c404c1d.png": "fib.png",
    "rectangle-7251ee7f-7b09-442d-8879-aafa37a91b1e.png": "rectangle.png",
    "long-98e457b3-6f5e-4971-8446-af8c539d3951.png": "long.png",
    "short-165070e5-973e-4cdf-bb8c-33125c7f2a72.png": "short.png",
    "basket-86352165-a7d1-409d-bbf8-5b436b3320b9.png": "trash.png",
}


def pad_on_bg(im: Image.Image, size: tuple[int, int], bg: tuple[int, int, int]) -> Image.Image:
    if im.size == size:
        return im.convert("RGBA")
    canvas = Image.new("RGBA", size, (*bg, 255))
    ox = (size[0] - im.size[0]) // 2
    oy = (size[1] - im.size[1]) // 2
    canvas.paste(im.convert("RGBA"), (ox, oy), im.convert("RGBA") if im.mode == "RGBA" else None)
    return canvas


def strip_black_bg(im: Image.Image, cutoff: int = 22, feather_end: int = 52) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, _a = px[x, y]
            lum = max(r, g, b)
            if lum <= cutoff:
                px[x, y] = (0, 0, 0, 0)
            elif lum < feather_end:
                t = (lum - cutoff) / (feather_end - cutoff)
                alpha = int(255 * t)
                px[x, y] = (r, g, b, alpha)
            else:
                px[x, y] = (r, g, b, 255)
    return im


def main() -> None:
    ORIGINAL_DIR.mkdir(parents=True, exist_ok=True)
    WORK_DIR.mkdir(parents=True, exist_ok=True)

    for src_name, dst_name in SOURCE_FILES.items():
        src = ASSETS / src_name
        if not src.exists():
            raise SystemExit(f"missing source: {src}")

        original_out = ORIGINAL_DIR / dst_name
        shutil.copy2(src, original_out)

        im = Image.open(src)
        padded = pad_on_bg(im, CANVAS, BG)
        work = strip_black_bg(padded)
        work.save(WORK_DIR / dst_name)
        print(f"{dst_name}: original={Image.open(original_out).size} work={work.size}")

    print(f"originals -> {ORIGINAL_DIR}")
    print(f"work (transparent) -> {WORK_DIR}")


if __name__ == "__main__":
    main()
