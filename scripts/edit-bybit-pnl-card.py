#!/usr/bin/env python3
"""Overlay new ticker / prices on Bybit PnL share card reference."""
from PIL import Image, ImageDraw, ImageFont

SRC = "assets/bybit-pnl-card-ref.png"
OUT = "assets/bybit-pnl-card-spcx.png"

TICKER = "SPCXUSDT"
ENTRY = "1.28450"
MARKET = "1.27120"

BG = (0, 0, 0)


def load_font(size):
    paths = [
        "/System/Library/Fonts/SFNSDisplay-Bold.otf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/Library/Fonts/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    im = Image.open(SRC).convert("RGB")
    draw = ImageDraw.Draw(im)

    ticker_font = load_font(46)
    price_font = load_font(34)

    # Mask old text (pixel scan on 743×1024 reference)
    draw.rectangle((28, 192, 395, 248), fill=BG)
    draw.rectangle((28, 516, 265, 558), fill=BG)
    draw.rectangle((28, 626, 265, 668), fill=BG)

    draw.text((32, 198), TICKER, fill=(255, 255, 255), font=ticker_font)
    draw.text((32, 520), ENTRY, fill=(255, 255, 255), font=price_font)
    draw.text((32, 630), MARKET, fill=(255, 255, 255), font=price_font)

    im.save(OUT, format="PNG", optimize=True)
    print(f"saved {OUT}")


if __name__ == "__main__":
    main()
