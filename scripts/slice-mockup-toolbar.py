#!/usr/bin/env python3
"""Slice draw-toolbar icons from reference mockup screenshot (pixel source of truth)."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REF = Path(
    "/Users/maxdrukpa/.cursor/projects/Users-maxdrukpa-crypto-terminal-v2/assets/"
    "Screenshot_2026-06-25_at_00.51.00-02e6720e-e179-4e6a-a916-eaae9223f531.png"
)
OUT = ROOT / "assets" / "draw-toolbar-icons-mockup"
META = OUT / "slice-meta.json"

# Measured on reference screenshot (1024×665): toolbar x=1..26, separator x=27.
TOOLBAR_LEFT = 1
TOOLBAR_CONTENT_W = 26
CELL_H = 20

# Hand-mapped centers on reference screenshot (full-width 26×20 slices).
ICON_CENTER_Y: dict[str, int] = {
    "cursor": 108,
    "trendline": 128,
    "arrow": 163,
    "hray": 147,
    "channel": 167,
    "brush": 187,
    "fib": 206,
    "rectangle": 215,
    "long": 224,
    "short": 244,
    "trash": 271,
}

NAMES = [
    "cursor",
    "trendline",
    "arrow",
    "hray",
    "channel",
    "brush",
    "fib",
    "rectangle",
    "long",
    "short",
    "trash",
]


def slice_icon(im: Image.Image, cy: int) -> Image.Image:
    y0 = cy - CELL_H // 2
    y1 = y0 + CELL_H
    return im.crop((TOOLBAR_LEFT, y0, TOOLBAR_LEFT + TOOLBAR_CONTENT_W, y1)).convert("RGBA")


def main() -> None:
    if not REF.exists():
        raise SystemExit(f"missing reference: {REF}")

    im = Image.open(REF).convert("RGBA")
    OUT.mkdir(parents=True, exist_ok=True)

    centers = [ICON_CENTER_Y[name] for name in NAMES]
    strides = [centers[i + 1] - centers[i] for i in range(len(centers) - 1)]
    gaps = [max(0, strides[i] - CELL_H) for i in range(len(strides))]
    gap_px = round(sum(gaps) / len(gaps)) if gaps else 2

    for name in NAMES:
        slice_icon(im, ICON_CENTER_Y[name]).save(OUT / f"{name}.png")

    meta = {
        "source": str(REF),
        "toolbar_left": TOOLBAR_LEFT,
        "toolbar_content_w": TOOLBAR_CONTENT_W,
        "cell_h": CELL_H,
        "icon_center_y": ICON_CENTER_Y,
        "toolbar_order": NAMES,
        "strides_y": strides,
        "slice_size_px": [TOOLBAR_CONTENT_W, CELL_H],
        "gap_px": gap_px,
    }
    META.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(json.dumps(meta, indent=2))
    print(f"wrote {len(NAMES)} icons -> {OUT}")


if __name__ == "__main__":
    main()
