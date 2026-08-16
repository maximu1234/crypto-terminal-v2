#!/usr/bin/env python3
"""
Generate Bybit-style PnL share cards for closed trades (Дневник).

Landscape templates @ design ref 1323×720 (footer cropped; Y from top unchanged).
"""
from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE_POS = ROOT / "assets/bybit-pnl-diary-template-positive.png"
TEMPLATE_NEG = ROOT / "assets/bybit-pnl-diary-template-negative.png"

REF_W, REF_H = 1323, 720

# Calibrated from assets/positive example.png (Y from top; footer cropped).
LAYOUT = {
    "ticker_font": 60.5,
    "ticker_tracking": -4,
    "ticker_bl_x": 61,
    "ticker_bl_y": 249,
    "badge_gap": 45,
    "badge_pill_y_offset": -54,
    "badge_pill_h": 60,
    "badge_pill_radius": 12,
    "badge_pill_pad_x": 26,
    "badge_text_pad_left": 14,
    "badge_text_y_offset": -34,
    "badge_font": 30,
    "roi_font": 102,
    "roi_bl_x": 64,
    "roi_bl_y": 443,
    "entry_bl_x": 62,
    "entry_bl_y": 593,
    "filled_bl_x": 310,
    "filled_bl_y": 593,
    "price_font": 48.5,
    "price_tracking": -2,
}

COLOR_WHITE = (255, 255, 255)
COLOR_ROI_POS = (0, 192, 135)
COLOR_ROI_NEG = (246, 66, 75)
COLOR_LONG_TEXT = (32, 178, 108)
COLOR_SHORT_TEXT = (255, 94, 102)
COLOR_LONG_PILL = (0, 200, 120, 37)
COLOR_SHORT_PILL = (200, 60, 80, 37)

FONT_CANDIDATES = [
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeuib.ttf",
]


@dataclass
class TradeCard:
    ticker: str
    side: str
    leverage: int
    roi_pct: float
    entry_price: float
    filled_price: float
    price_decimals: int | None = None


def load_font(size: float, *, bold: bool = True) -> ImageFont.FreeTypeFont:
    last_err: Exception | None = None
    for path in FONT_CANDIDATES:
        if not os.path.exists(path):
            continue
        try:
            if path.endswith(".ttc"):
                return ImageFont.truetype(path, size, index=1 if bold else 0)
            return ImageFont.truetype(path, size)
        except OSError as err:
            last_err = err
    raise RuntimeError(f"No usable font found ({last_err})")


def scaled_layout(template: Image.Image) -> dict[str, int | float]:
    sx = template.width / REF_W
    sy = template.height / REF_H
    out: dict[str, int | float] = {}
    for key, val in LAYOUT.items():
        if key.endswith("_font"):
            out[key] = max(8.0, float(val) * sx)
        elif key.endswith("_tracking"):
            out[key] = val
        elif key in (
            "badge_gap",
            "badge_pill_pad_x",
            "badge_pill_h",
            "badge_pill_radius",
            "badge_text_pad_left",
        ):
            out[key] = max(1, round(val * sx))
        elif key.endswith("_x") or key.endswith("_bl_x"):
            out[key] = round(val * sx)
        else:
            out[key] = round(val * sy)
    return out


def draw_text_with_tracking(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    tracking: float = 0,
) -> None:
    cx = float(x)
    gap = tracking * font.size / 1000.0
    for i, ch in enumerate(text):
        draw.text((cx, y), ch, font=font, fill=fill)
        if i < len(text) - 1:
            cx += font.getlength(ch) + gap


def _visual_origin_offset(
    font: ImageFont.FreeTypeFont,
    text: str,
    fill: tuple[int, int, int],
    pred,
    tracking: float = 0,
) -> tuple[tuple[int, int], tuple[int, int]]:
    probe = Image.new("RGB", (900, 200), (0, 0, 0))
    probe_draw = ImageDraw.Draw(probe)
    if tracking == 0:
        probe_draw.text((0, 0), text, font=font, fill=fill)
    else:
        draw_text_with_tracking(probe_draw, 0, 0, text, font, fill, tracking)
    bb = None
    for y in range(probe.height):
        for x in range(probe.width):
            if pred(probe.getpixel((x, y))[:3]):
                bb = (
                    [x, y, x, y]
                    if bb is None
                    else [min(bb[0], x), min(bb[1], y), max(bb[2], x), max(bb[3], y)]
                )
    if bb is None:
        raise RuntimeError(f"Could not measure visual bbox for {text!r}")
    bl = (bb[0], bb[3] - 1)
    br = (bb[2] - 1, bb[3] - 1)
    return bl, br


def draw_text_visual_bl(
    draw: ImageDraw.ImageDraw,
    bl_x: int,
    bl_y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    pred,
    tracking: float = 0,
) -> tuple[int, int]:
    bl_off, _ = _visual_origin_offset(font, text, fill, pred, tracking)
    tx = bl_x - bl_off[0]
    ty = bl_y - bl_off[1]
    if tracking == 0:
        draw.text((tx, ty), text, font=font, fill=fill)
    else:
        draw_text_with_tracking(draw, tx, ty, text, font, fill, tracking)
    return bl_x, bl_y


def _is_white(px: tuple[int, int, int]) -> bool:
    return sum(px) > 500


def _visual_tl_offset(
    font: ImageFont.FreeTypeFont,
    text: str,
    fill: tuple[int, int, int],
    pred,
) -> tuple[int, int]:
    probe = Image.new("RGB", (400, 80), (0, 0, 0))
    ImageDraw.Draw(probe).text((0, 0), text, font=font, fill=fill[:3])
    for y in range(probe.height):
        for x in range(probe.width):
            if pred(probe.getpixel((x, y))[:3]):
                return x, y
    raise RuntimeError(f"Could not measure visual top-left for {text!r}")


def _is_green(px: tuple[int, int, int]) -> bool:
    return px[1] > 100 and px[0] < 100 and sum(px) > 100


def _is_red(px: tuple[int, int, int]) -> bool:
    return px[0] > 120 and px[1] < 130 and px[2] < 130


def _is_roi(px: tuple[int, int, int]) -> bool:
    return _is_red(px) or (px[1] > 140 and px[0] < 80)


def _visual_bbox(
    img: Image.Image,
    box: tuple[int, int, int, int],
    pred,
) -> tuple[tuple[int, int], tuple[int, int]] | None:
    crop = img.crop(box)
    bb = None
    for y in range(crop.height):
        for x in range(crop.width):
            if pred(crop.getpixel((x, y))[:3]):
                bb = (
                    [x, y, x, y]
                    if bb is None
                    else [min(bb[0], x), min(bb[1], y), max(bb[2], x), max(bb[3], y)]
                )
    if bb is None:
        return None
    ox, oy = box[0], box[1]
    bl = (ox + bb[0], oy + bb[3] - 1)
    br = (ox + bb[2] - 1, oy + bb[3] - 1)
    return bl, br


def format_price(value: float, decimals: int | None) -> str:
    if decimals is None:
        return f"{value:.8f}".rstrip("0").rstrip(".")
    return f"{value:.{decimals}f}"


def format_roi(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.2f}%"


def pick_template(roi_pct: float) -> Path:
    return TEMPLATE_POS if roi_pct >= 0 else TEMPLATE_NEG


def draw_badge(
    base: Image.Image,
    text_left: int,
    ticker_bl_y: int,
    side: str,
    leverage: int,
    font: ImageFont.FreeTypeFont,
    lay: dict[str, int | float],
) -> None:
    label = f"{'Long' if side.lower() == 'long' else 'Short'} {leverage}x"
    is_long = side.lower() == "long"
    text_color = COLOR_LONG_TEXT if is_long else COLOR_SHORT_TEXT
    text_pred = _is_green if is_long else _is_red
    bl_off, br_off = _visual_origin_offset(font, label, text_color, text_pred)
    text_w = br_off[0] - bl_off[0] + 1
    pill_left = text_left - lay["badge_text_pad_left"]
    pill_top = int(ticker_bl_y) + int(lay["badge_pill_y_offset"])
    badge_text_y = int(ticker_bl_y) + int(lay["badge_text_y_offset"])
    pill_w = text_w + lay["badge_pill_pad_x"]
    pill_h = lay["badge_pill_h"]
    pill_box = (
        pill_left,
        pill_top,
        pill_left + pill_w - 1,
        pill_top + pill_h - 1,
    )
    radius = min(
        int(lay["badge_pill_radius"]),
        pill_w // 2,
        pill_h // 2,
    )
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle(
        pill_box,
        radius=radius,
        fill=COLOR_LONG_PILL if is_long else COLOR_SHORT_PILL,
    )
    tl_off = _visual_tl_offset(font, label, text_color, text_pred)
    draw.text(
        (text_left - tl_off[0], badge_text_y - tl_off[1]),
        label,
        font=font,
        fill=text_color + (255,),
    )
    base.alpha_composite(overlay)


def render_card(trade: TradeCard) -> Image.Image:
    template = pick_template(trade.roi_pct)
    base = Image.open(template).convert("RGBA")
    draw = ImageDraw.Draw(base)
    lay = scaled_layout(base)

    ticker_font = load_font(lay["ticker_font"], bold=True)
    badge_font = load_font(lay["badge_font"], bold=False)
    roi_font = load_font(lay["roi_font"], bold=True)
    price_font = load_font(lay["price_font"], bold=True)
    price_tracking = float(lay["price_tracking"])
    ticker_tracking = float(lay["ticker_tracking"])

    ticker = trade.ticker.upper()
    draw_text_visual_bl(
        draw,
        lay["ticker_bl_x"],
        lay["ticker_bl_y"],
        ticker,
        ticker_font,
        COLOR_WHITE,
        _is_white,
        ticker_tracking,
    )
    ticker_box = (
        30,
        max(0, int(lay["ticker_bl_y"]) - 90),
        550,
        int(lay["ticker_bl_y"]) + 15,
    )
    ticker_metrics = _visual_bbox(base.convert("RGB"), ticker_box, _is_white)
    ticker_br = ticker_metrics[1][0] if ticker_metrics else lay["ticker_bl_x"]
    badge_text_left = ticker_br + lay["badge_gap"]
    draw_badge(
        base,
        badge_text_left,
        int(lay["ticker_bl_y"]),
        trade.side,
        trade.leverage,
        badge_font,
        lay,
    )

    roi_text = format_roi(trade.roi_pct)
    roi_color = COLOR_ROI_POS if trade.roi_pct >= 0 else COLOR_ROI_NEG
    draw_text_visual_bl(
        draw,
        lay["roi_bl_x"],
        lay["roi_bl_y"],
        roi_text,
        roi_font,
        roi_color,
        _is_roi,
    )

    entry_text = format_price(trade.entry_price, trade.price_decimals)
    filled_text = format_price(trade.filled_price, trade.price_decimals)
    draw_text_visual_bl(
        draw,
        lay["entry_bl_x"],
        lay["entry_bl_y"],
        entry_text,
        price_font,
        COLOR_WHITE,
        _is_white,
        price_tracking,
    )
    draw_text_visual_bl(
        draw,
        lay["filled_bl_x"],
        lay["filled_bl_y"],
        filled_text,
        price_font,
        COLOR_WHITE,
        _is_white,
        price_tracking,
    )

    return base


def save_card(trade: TradeCard, out_path: Path) -> Path:
    img = render_card(trade)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out_path, format="PNG", optimize=True)
    return out_path


def apply_app_root(root: Path) -> None:
    global ROOT, TEMPLATE_POS, TEMPLATE_NEG
    ROOT = root.resolve()
    TEMPLATE_POS = ROOT / "assets/bybit-pnl-diary-template-positive.png"
    TEMPLATE_NEG = ROOT / "assets/bybit-pnl-diary-template-negative.png"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate Bybit PnL diary share card PNG")
    p.add_argument("--app-root", type=Path, default=None)
    p.add_argument("--ticker", default="BTCUSDT")
    p.add_argument("--side", choices=["long", "short"], default="long")
    p.add_argument("--leverage", type=int, default=10)
    p.add_argument("--roi", type=float, required=True)
    p.add_argument("--entry", type=float, required=True)
    p.add_argument("--filled", type=float, required=True)
    p.add_argument("--decimals", type=int, default=None)
    p.add_argument(
        "-o",
        "--output",
        type=Path,
        default=ROOT / "assets/bybit-pnl-diary-card-generated.png",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    if args.app_root is not None:
        apply_app_root(args.app_root)

    trade = TradeCard(
        ticker=args.ticker,
        side=args.side,
        leverage=args.leverage,
        roi_pct=args.roi,
        entry_price=args.entry,
        filled_price=args.filled,
        price_decimals=args.decimals,
    )
    out = save_card(trade, args.output if args.output.is_absolute() else ROOT / args.output)
    try:
        print(f"saved {out.relative_to(ROOT)}")
    except ValueError:
        print(f"saved {out}")


if __name__ == "__main__":
    main()
