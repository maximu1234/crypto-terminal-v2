#!/usr/bin/env python3
"""
Compose Bybit PnL card on empty template by transplanting text layers
from the filled reference (exact Bybit typography). 960×1080.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "assets/bybit-pnl-template-negative.png"
REFERENCE = ROOT / "assets/Share (1).png"
OUT = ROOT / "assets/bybit-pnl-compose-blend.png"

LAYERS = [
    ("ticker", (60, 252, 432, 304)),
    ("badge", (456, 246, 610, 308)),
    ("roi", (58, 443, 440, 525)),
]
ENTRY_TEXT = "0.06217"
MARKET_TEXT = "0.06128"
PRICE_X = 61
ENTRY_Y = 670
MARKET_Y = 820
PRICE_FONT = 48


def rgba_nonblack(layer: Image.Image, lum_min: int = 28) -> Image.Image:
    rgba = layer.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            px[x, y] = (r, g, b, 0) if r + g + b <= lum_min else (r, g, b, 255)
    return rgba


def rgba_light_text(layer: Image.Image) -> Image.Image:
    rgba = layer.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            lum = r + g + b
            keep = lum > 260 and abs(r - g) < 40 and abs(g - b) < 40
            px[x, y] = (r, g, b, 255 if keep else 0)
    return rgba


def rgba_roi_text(layer: Image.Image) -> Image.Image:
    rgba = layer.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            keep = (r > 120 and g < 130 and b < 130) or (r > 180 and g > 80 and b > 80)
            px[x, y] = (r, g, b, 255 if keep else 0)
    return rgba


def rgba_badge(layer: Image.Image) -> Image.Image:
    rgba = layer.convert("RGBA")
    px = rgba.load()
    w, h = rgba.size
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            lum = r + g + b
            if lum <= 20:
                px[x, y] = (r, g, b, 0)
            elif g > r + 8 and g > b + 8:
                a = 255 if lum > 45 else int(lum * 4)
                px[x, y] = (r, g, b, min(255, a))
            elif lum > 40:
                px[x, y] = (r, g, b, 255)
            else:
                px[x, y] = (r, g, b, 0)
    return rgba


def main() -> None:
    base = Image.open(TEMPLATE).convert("RGBA")
    ref = Image.open(REFERENCE).convert("RGB")

    for name, box in LAYERS:
        crop = ref.crop(box)
        if name == "badge":
            layer = rgba_badge(crop)
        elif name == "roi":
            layer = rgba_roi_text(crop)
        else:
            layer = rgba_light_text(crop)
        base.paste(layer, (box[0], box[1]), layer)

    # Share (1).png already has clipped entry digits, so draw clean numbers.
    draw = ImageDraw.Draw(base)
    price_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", PRICE_FONT, index=1)
    draw.text((PRICE_X, ENTRY_Y), ENTRY_TEXT, font=price_font, fill=(255, 255, 255))
    draw.text((PRICE_X, MARKET_Y), MARKET_TEXT, font=price_font, fill=(255, 255, 255))

    base.convert("RGB").save(OUT, format="PNG", optimize=True)
    print(f"saved {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
