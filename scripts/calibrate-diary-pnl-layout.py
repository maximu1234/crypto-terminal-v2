#!/usr/bin/env python3
"""Measure text anchors from positive/negative example PNGs @ 1323x960."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POS = ROOT / "assets/positive example.png"
NEG = ROOT / "assets/negative example.png"


def clusters(path: Path, pred, y0=0, y1=9999, x0=0, x1=9999, min_size=40):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    seen: set[tuple[int, int]] = set()
    out: list[tuple[int, tuple[int, int, int, int]]] = []
    for y in range(max(0, y0), min(h, y1)):
        for x in range(max(0, x0), min(w, x1)):
            if (x, y) in seen or not pred(im.getpixel((x, y))):
                continue
            q = deque([(x, y)])
            comp: list[tuple[int, int]] = []
            while q:
                cx, cy = q.popleft()
                if (cx, cy) in seen:
                    continue
                seen.add((cx, cy))
                comp.append((cx, cy))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if (
                        y0 <= ny < y1
                        and x0 <= nx < x1
                        and (nx, ny) not in seen
                        and pred(im.getpixel((nx, ny)))
                    ):
                        q.append((nx, ny))
            if len(comp) >= min_size:
                xs = [p[0] for p in comp]
                ys = [p[1] for p in comp]
                out.append((len(comp), (min(xs), min(ys), max(xs), max(ys))))
    out.sort(reverse=True)
    return out


def is_white(px):
    r, g, b = px
    return r + g + b > 680 and abs(r - g) < 40 and abs(g - b) < 40


def is_green(px):
    r, g, b = px
    return g > 140 and r < 130 and b < 130 and r + g + b > 250


def is_red(px):
    r, g, b = px
    return r > 170 and g < 150 and b < 150 and r + g + b > 250


def is_badge(px):
    r, g, b = px
    return (r > 180 and g < 120 and b < 120 and r + g + b > 220) or (
        g > 150 and r < 120 and b < 120 and r + g + b > 220
    )


def row_groups(path: Path, y0, y1, x0=40, x1=700, thr=620):
    im = Image.open(path).convert("RGB")
    for y in range(y0, y1):
        groups: list[list[int]] = []
        cur: list[int] = []
        for x in range(x0, x1):
            if sum(im.getpixel((x, y))) > thr:
                if not cur or x - cur[-1] <= 8:
                    cur.append(x)
                else:
                    groups.append(cur)
                    cur = [x]
            elif cur:
                groups.append(cur)
                cur = []
        if cur:
            groups.append(cur)
        big = [g for g in groups if len(g) > 12]
        if big:
            print(f"  y={y}: {[(min(g), max(g)) for g in big[:6]]}")


def analyze(path: Path):
    print(f"\n### {path.name} {Image.open(path).size}")
    for label, pred, y0, y1, x0, x1, min_size in [
        ("ticker", is_white, 70, 220, 40, 420, 100),
        ("badge", is_badge, 70, 220, 180, 650, 40),
        ("roi green", is_green, 220, 520, 40, 650, 120),
        ("roi red", is_red, 220, 520, 40, 650, 120),
        ("prices", is_white, 430, 680, 40, 700, 100),
    ]:
        cs = clusters(path, pred, y0, y1, x0, x1, min_size)
        if cs:
            print(label)
            for n, bb in cs[:6]:
                print(f"  n={n} bl=({bb[0]},{bb[3]})")

    print("price rows:")
    row_groups(path, 480, 620)


def main():
    for path in (POS, NEG):
        if path.exists():
            analyze(path)
    refine()


def refine():
  path = POS
  im = Image.open(path).convert("RGBA")
  print("\n### refine", path.name)

  pts = [
    (x, y)
    for y in range(75, 130)
    for x in range(180, 420)
    if im.getpixel((x, y))[0] > 100
    and im.getpixel((x, y))[1] < 90
    and im.getpixel((x, y))[2] < 90
    and sum(im.getpixel((x, y))[:3]) > 150
  ]
  if pts:
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    print("pill", (min(xs), min(ys), max(xs), max(ys)))

  pts2 = [
    (x, y)
    for y in range(80, 125)
    for x in range(200, 400)
    if im.getpixel((x, y))[0] > 200
    and im.getpixel((x, y))[1] < 130
    and im.getpixel((x, y))[2] < 130
  ]
  if pts2:
    xs = [p[0] for p in pts2]
    ys = [p[1] for p in pts2]
    print("badge text bl", (min(xs), max(ys)))

  pts3 = [
    (x, y)
    for y in range(85, 115)
    for x in range(50, 280)
    if sum(im.getpixel((x, y))[:3]) > 620
  ]
  xs = [p[0] for p in pts3]
  ys = [p[1] for p in pts3]
  print("ticker span", (min(xs), max(xs)), "bl", (min(xs), max(ys)))

  for name, x0, x1 in [("entry", 50, 250), ("filled", 300, 450)]:
    pts4 = [
      (x, y)
      for y in range(580, 600)
      for x in range(x0, x1)
      if sum(im.getpixel((x, y))[:3]) > 620
    ]
    xs = [p[0] for p in pts4]
    ys = [p[1] for p in pts4]
    print(name, "bl", (min(xs), max(ys)))

  pts6 = [
    (x, y)
    for y in range(360, 450)
    for x in range(50, 500)
    if im.getpixel((x, y))[1] > 140 and im.getpixel((x, y))[0] < 130
  ]
  xs = [p[0] for p in pts6]
  ys = [p[1] for p in pts6]
  print("roi bl", (min(xs), max(ys)))

  em = Image.open(ROOT / "assets/bybit-pnl-diary-template-positive.png").convert("RGB")
  for label, x0, x1 in [("entry label", 50, 220), ("filled label", 250, 500)]:
    pts = [
      (x, y)
      for y in range(280, 360)
      for x in range(x0, x1)
      if 100 < em.getpixel((x, y))[0] < 200 and sum(em.getpixel((x, y))) > 300
    ]
    if pts:
      xs = [p[0] for p in pts]
      ys = [p[1] for p in pts]
      print(label, "bl", (min(xs), max(ys)))



if __name__ == "__main__":
    main()
