#!/usr/bin/env python3
"""Measure left draw toolbar geometry from reference mockup screenshot."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

REF = Path(
    "/Users/maxdrukpa/.cursor/projects/Users-maxdrukpa-crypto-terminal-v2/assets/"
    "Screenshot_2026-06-25_at_00.51.00-8d0677ea-7d2d-451e-af54-d23d9f739135.png"
)


def main() -> None:
    im = Image.open(REF).convert("RGB")
    w, h = im.size
    print("image", w, h)

    # scan columns in chart band for toolbar edge + separator
    y0, y1 = 120, 500
    col_lum = []
    for x in range(0, 80):
        lums = [sum(im.getpixel((x, y))) / 3 for y in range(y0, y1)]
        col_lum.append((x, sum(lums) / len(lums), im.getpixel((x, 200))))

    # left edge: jump from header to black toolbar
    for x in range(0, 40):
        p = im.getpixel((x, 200))
        print(f"x{x:02d} lum={col_lum[x][1]:5.1f} px={p}")

    # find separator: column where color differs from toolbar and chart
    print("\nseparator scan y=200:")
    for x in range(20, 55):
        print(x, im.getpixel((x, 200)), im.getpixel((x, 350)))

    # icon rows via center column
    cx = 14
    rows = [sum(im.getpixel((cx, y))) / 3 for y in range(30, 520)]
    bands = []
    on = False
    s = 0
    for i, lum in enumerate(rows):
        y = i + 30
        if lum > 28 and not on:
            s = y
            on = True
        elif lum <= 18 and on:
            bands.append((s, y - 1))
            on = False
    if on:
        bands.append((s, 30 + len(rows) - 1))

    print("\nicon bands (y0,y1,h):")
    for i, (a, b) in enumerate(bands):
        if b - a + 1 >= 6:
            print(i + 1, a, b, b - a + 1)

    if len(bands) >= 2:
        big = [(a, b) for a, b in bands if b - a + 1 >= 6]
        gaps = [big[i + 1][0] - big[i][1] - 1 for i in range(len(big) - 1)]
        print("gaps", gaps[:15])
        print("avg gap", sum(gaps) / len(gaps) if gaps else 0)


if __name__ == "__main__":
    main()
