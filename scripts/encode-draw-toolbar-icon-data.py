#!/usr/bin/env python3
"""Rebuild js/draw-toolbar-icon-data.js from assets/draw-toolbar-icons/*.png"""
from __future__ import annotations

import base64
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "draw-toolbar-icons"
OUT = ROOT / "js" / "draw-toolbar-icon-data.js"

NAMES = [
    "cursor",
    "trendline",
    "arrow",
    "hray",
    "fib",
    "channel",
    "rectangle",
    "long",
    "short",
    "trash",
]

lines = ["export const DRAW_TOOL_ICON_DATA = {"]

for name in NAMES:
    png = ICON_DIR / f"{name}.png"
    if not png.exists():
        raise SystemExit(f"missing icon: {png}")
    b64 = base64.b64encode(png.read_bytes()).decode("ascii")
    lines.append(f'  {name}: "data:image/png;base64,{b64}",')

lines.extend(
    [
        "}",
        "",
        "export function getDrawToolIconSrc(name){",
        'return DRAW_TOOL_ICON_DATA[name] || "";',
        "}",
        "",
    ]
)

OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"wrote {OUT}")
