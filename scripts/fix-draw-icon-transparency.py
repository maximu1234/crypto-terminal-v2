#!/usr/bin/env python3
"""Remove opaque dark background from arrow/rectangle toolbar PNGs."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets" / "draw-toolbar-icons"
SOURCE_DIR = ROOT / "icons"
NAMES = ("arrow", "rectangle")
LUM_THRESHOLD = 42


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def decode_png(path: Path) -> tuple[int, int, bytearray]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"not png: {path}")

    width, height = struct.unpack(">II", data[16:24])
    pos = 8
    idat = b""
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        chunk_type = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        if chunk_type == b"IDAT":
            idat += chunk
        pos += 12 + length

    raw = zlib.decompress(idat)
    bpp = 4
    row_bytes = width * bpp
    rgba = bytearray(width * height * 4)
    prior = bytearray(row_bytes)
    index = 0

    for y in range(height):
        filt = raw[index]
        index += 1
        row = bytearray(raw[index : index + row_bytes])
        index += row_bytes

        for j in range(len(row)):
            value = row[j]
            left = row[j - bpp] if j >= bpp else 0
            up = prior[j]
            up_left = prior[j - bpp] if j >= bpp else 0

            if filt == 1:
                value = (value + left) & 255
            elif filt == 2:
                value = (value + up) & 255
            elif filt == 3:
                value = (value + ((left + up) // 2)) & 255
            elif filt == 4:
                value = (value + paeth(left, up, up_left)) & 255

            row[j] = value

        for x in range(width):
            offset = (y * width + x) * 4
            source = x * 4
            rgba[offset : offset + 4] = row[source : source + 4]

        prior = row

    return width, height, rgba


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def strip_dark_background(rgba: bytearray) -> bytearray:
    out = bytearray(rgba)
    for i in range(0, len(out), 4):
        r, g, b = out[i], out[i + 1], out[i + 2]
        if luminance(r, g, b) < LUM_THRESHOLD:
            out[i : i + 4] = b"\0\0\0\0"
        else:
            out[i + 3] = 255
    return out


def crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFFFFFF


def chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", crc32(tag + data))
    )


def encode_png(width: int, height: int, rgba: bytes | bytearray) -> bytes:
    rows = bytearray()
    row_bytes = width * 4
    for y in range(height):
        rows.append(0)
        start = y * row_bytes
        rows.extend(rgba[start : start + row_bytes])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(rows), 9))
        + chunk(b"IEND", b"")
    )


def fix_file(path: Path) -> None:
    width, height, rgba = decode_png(path)
    fixed = strip_dark_background(rgba)
    path.write_bytes(encode_png(width, height, fixed))
    print(f"fixed {path}")


def main() -> None:
    for name in NAMES:
        fix_file(ICON_DIR / f"{name}.png")
        source = SOURCE_DIR / f"draw-{name}.png"
        if source.exists():
            fix_file(source)

    print("done — run: python3 scripts/encode-draw-toolbar-icon-data.py")


if __name__ == "__main__":
    main()
