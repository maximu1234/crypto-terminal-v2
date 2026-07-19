#!/usr/bin/env python3
"""
Generate BingX-style PnL share cards (positions + diary).

Canvas: 1800×1478
Templates:
  position → assets/bingx-pnl-template-{positive|negative}.png
  diary    → assets/bingx-pnl-diary-template-{positive|negative}.png

Typography (Photoshop pt ≈ px @ 72ppi):
  ticker   Arial Bold 80, tracking -12, white, CAPS
  side     Arial Bold 80, tracking 0, Long #04fc9b / Short #fc026c
  leverage Arial Bold 80, tracking 0, white, "{n}X"
  ROI%     Arial Regular 218, tracking 0, + green / − pink
  prices   Arial Bold 68, tracking 0, vertical scale 93%, white

Draft layout calibrated from assets/bingx example.png; meta row is a
first guess (example has no ticker line) — adjust after review.
"""
from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]

REF_W, REF_H = 1800, 1478

# Draft anchors @ 1800×1478 (bottom-left of visual text bbox where noted)
LAYOUT = {
    # Meta row: ticker | Long/Short | 10X — between title and ROI
    "meta_font": 80,
    "ticker_tracking": -12,  # Photoshop /1000 em
    "meta_bl_x": 98,
    "meta_bl_y": 672,
    "side_bl_y_offset": 15,  # Long only (descender g); Short stays on meta baseline
    "sep_gap": 59,  # space around "|"
    "sep_color": (128, 128, 128),
    "sep_thickness": 3,
    # Big ROI%
    "roi_font": 218,
    "roi_bl_x": 98,
    "roi_bl_y": 958,
    # Prices (right of baked labels)
    "price_font": 68,
    "price_vscale": 0.93,
    "price_bl_x": 478,
    "price_top_bl_y": 1115,  # Last / Close
    "price_bot_bl_y": 1226,  # Entry
}

COLOR_WHITE = (255, 255, 255)
COLOR_ROI_POS = (0x04, 0xFC, 0x9B)
COLOR_ROI_NEG = (0xFC, 0x02, 0x6C)
COLOR_LONG = (0x04, 0xFC, 0x9B)
COLOR_SHORT = (0xFC, 0x02, 0x6C)

FONT_BOLD_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

FONT_REG_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arial.ttf",
]


@dataclass
class TradeCard:
    ticker: str
    side: str  # "long" | "short"
    leverage: int
    roi_pct: float
    entry_price: float
    market_price: float
    price_decimals: int | None = None
    variant: str = "position"  # position | diary


def load_font(size: float, *, bold: bool) -> ImageFont.FreeTypeFont:
    candidates = FONT_BOLD_CANDIDATES if bold else FONT_REG_CANDIDATES
    last_err: Exception | None = None
    for path in candidates:
        if not os.path.exists(path):
            continue
        try:
            return ImageFont.truetype(path, size)
        except OSError as err:
            last_err = err
    raise RuntimeError(f"No usable Arial font found ({last_err})")


def template_path(root: Path, variant: str, roi_pct: float) -> Path:
    tone = "positive" if roi_pct >= 0 else "negative"
    if variant == "diary":
        name = f"bingx-pnl-diary-template-{tone}.png"
    else:
        name = f"bingx-pnl-template-{tone}.png"
    path = root / "assets" / name
    if not path.is_file():
        raise FileNotFoundError(f"Missing template: {path}")
    return path


def format_roi(roi_pct: float) -> str:
    sign = "+" if roi_pct > 0 else ""
    # negative already has "-"
    return f"{sign}{roi_pct:.2f}%"


def format_price(value: float, decimals: int | None) -> str:
    if decimals is None:
        text = f"{value:.8f}".rstrip("0").rstrip(".")
        return text or "0"
    return f"{value:.{decimals}f}"


def draw_text_with_tracking(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: float = 0,
) -> float:
    """Draw text; tracking is Photoshop units (1/1000 em). Returns advance end x."""
    cx = float(x)
    gap = tracking * font.size / 1000.0
    for i, ch in enumerate(text):
        draw.text((cx, y), ch, font=font, fill=fill)
        if i < len(text) - 1:
            cx += font.getlength(ch) + gap
        else:
            cx += font.getlength(ch)
    return cx


def measure_tracked_width(
    font: ImageFont.FreeTypeFont,
    text: str,
    tracking: float = 0,
) -> float:
    if not text:
        return 0.0
    gap = tracking * font.size / 1000.0
    width = 0.0
    for i, ch in enumerate(text):
        width += font.getlength(ch)
        if i < len(text) - 1:
            width += gap
    return width


def text_bbox_offset(
    font: ImageFont.FreeTypeFont,
    text: str,
    fill: tuple[int, int, int],
    tracking: float = 0,
) -> tuple[int, int, int, int]:
    """Ink bbox relative to draw origin (0,0)."""
    probe = Image.new("RGBA", (max(64, int(measure_tracked_width(font, text, tracking)) + 80), int(font.size * 2) + 40), (0, 0, 0, 0))
    draw = ImageDraw.Draw(probe)
    draw_text_with_tracking(draw, 0, 0, text, font, fill, tracking)
    bbox = probe.getbbox()
    if bbox is None:
        return (0, 0, 0, 0)
    return bbox


def draw_text_baseline(
    draw: ImageDraw.ImageDraw,
    bl_x: float,
    bl_y: float,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: float = 0,
) -> float:
    """Place text so visual bottom of ink sits on bl_y; left ink at bl_x.
    Returns right edge of ink on canvas."""
    left, _top, right, bottom = text_bbox_offset(font, text, fill, tracking)
    tx = bl_x - left
    ty = bl_y - bottom
    draw_text_with_tracking(draw, tx, ty, text, font, fill, tracking)
    return bl_x + float(right - left)


def draw_vscaled_price(
    base: Image.Image,
    bl_x: float,
    bl_y: float,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    vscale: float,
) -> None:
    """Arial Bold price with Photoshop-style vertical scale."""
    left, top, right, bottom = text_bbox_offset(font, text, fill, 0)
    pad = 4
    tw = max(1, right - left + pad * 2)
    th = max(1, bottom - top + pad * 2)
    layer = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.text((pad - left, pad - top), text, font=font, fill=fill)

    new_h = max(1, int(round(th * vscale)))
    scaled = layer.resize((tw, new_h), Image.Resampling.LANCZOS)

    paste_x = int(round(bl_x - pad))
    paste_y = int(round(bl_y - new_h + pad))
    base.alpha_composite(scaled, (paste_x, paste_y))


def draw_separator(
    draw: ImageDraw.ImageDraw,
    x: float,
    baseline_y: float,
    font: ImageFont.FreeTypeFont,
    sample_text: str,
    tracking: float,
    color: tuple[int, int, int],
    thickness: int,
) -> None:
    """Vertical bar matching sample_text ink height, bottom-aligned to baseline."""
    _left, top, _right, bottom = text_bbox_offset(
        font, sample_text or "A", COLOR_WHITE, tracking
    )
    height = max(1, bottom - top)
    y0 = int(round(baseline_y - height))
    x0 = int(round(x))
    draw.rectangle(
        [x0, y0, x0 + thickness - 1, y0 + height - 1],
        fill=color,
    )



def compose(card: TradeCard, root: Path) -> Image.Image:
    tmpl = template_path(root, card.variant, card.roi_pct)
    base = Image.open(tmpl).convert("RGBA")
    if base.size != (REF_W, REF_H):
        base = base.resize((REF_W, REF_H), Image.Resampling.LANCZOS)

    draw = ImageDraw.Draw(base)
    layout = LAYOUT

    font_meta = load_font(layout["meta_font"], bold=True)
    font_roi = load_font(layout["roi_font"], bold=False)
    font_price = load_font(layout["price_font"], bold=True)

    ticker = str(card.ticker or "").strip().upper()
    side_label = "Long" if card.side == "long" else "Short"
    side_color = COLOR_LONG if card.side == "long" else COLOR_SHORT
    lev_label = f"{max(1, int(card.leverage))}X"
    roi_label = format_roi(card.roi_pct)
    roi_color = COLOR_ROI_POS if card.roi_pct >= 0 else COLOR_ROI_NEG

    # --- meta row ---
    x = float(layout["meta_bl_x"])
    y = float(layout["meta_bl_y"])
    gap = float(layout["sep_gap"])

    x = draw_text_baseline(
        draw, x, y, ticker, font_meta, COLOR_WHITE, layout["ticker_tracking"]
    )
    x += gap
    draw_separator(
        draw,
        x,
        y,
        font_meta,
        ticker,
        layout["ticker_tracking"],
        layout["sep_color"],
        int(layout["sep_thickness"]),
    )
    x += layout["sep_thickness"] + gap

    x = draw_text_baseline(
        draw,
        x,
        y
        + (
            float(
                layout["side_bl_y_offset"]
            )
            if card.side
            == "long"
            else 0
        ),
        side_label,
        font_meta,
        side_color,
        0,
    )
    x += gap
    draw_separator(
        draw,
        x,
        y,
        font_meta,
        ticker,
        layout["ticker_tracking"],
        layout["sep_color"],
        int(layout["sep_thickness"]),
    )
    x += layout["sep_thickness"] + gap

    draw_text_baseline(draw, x, y, lev_label, font_meta, COLOR_WHITE, 0)

    # --- ROI ---
    draw_text_baseline(
        draw,
        float(layout["roi_bl_x"]),
        float(layout["roi_bl_y"]),
        roi_label,
        font_roi,
        roi_color,
        0,
    )

    # --- prices ---
    top_price = format_price(card.market_price, card.price_decimals)
    bot_price = format_price(card.entry_price, card.price_decimals)
    vscale = float(layout["price_vscale"])
    draw_vscaled_price(
        base,
        float(layout["price_bl_x"]),
        float(layout["price_top_bl_y"]),
        top_price,
        font_price,
        COLOR_WHITE,
        vscale,
    )
    draw_vscaled_price(
        base,
        float(layout["price_bl_x"]),
        float(layout["price_bot_bl_y"]),
        bot_price,
        font_price,
        COLOR_WHITE,
        vscale,
    )

    return base


def main() -> None:
    p = argparse.ArgumentParser(description="Generate BingX PnL share card PNG")
    p.add_argument("--app-root", type=Path, default=ROOT)
    p.add_argument("--ticker", required=True)
    p.add_argument("--side", choices=("long", "short"), required=True)
    p.add_argument("--leverage", type=int, required=True)
    p.add_argument("--roi", type=float, required=True)
    p.add_argument("--entry", type=float, required=True)
    p.add_argument("--market", type=float, default=None)
    p.add_argument("--filled", type=float, default=None, help="Diary close price")
    p.add_argument("--decimals", type=int, default=None)
    p.add_argument(
        "--variant",
        choices=("position", "diary"),
        default=None,
        help="Defaults: diary if --filled given else position",
    )
    p.add_argument("-o", "--output", type=Path, required=True)
    args = p.parse_args()

    market = args.filled if args.filled is not None else args.market
    if market is None:
        raise SystemExit("Provide --market (position) or --filled (diary)")

    variant = args.variant
    if variant is None:
        variant = "diary" if args.filled is not None else "position"

    card = TradeCard(
        ticker=args.ticker,
        side=args.side,
        leverage=args.leverage,
        roi_pct=args.roi,
        entry_price=args.entry,
        market_price=market,
        price_decimals=args.decimals,
        variant=variant,
    )

    root = args.app_root.resolve()
    img = compose(card, root)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    img.save(args.output)


if __name__ == "__main__":
    main()
