import struct
import zlib
from pathlib import Path


def decode_png(path):
    data = Path(path).read_bytes()
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
                predictor = left + up - up_left
                pa = abs(predictor - left)
                pb = abs(predictor - up)
                pc = abs(predictor - up_left)
                nearest = left if pa <= pb and pa <= pc else up if pb <= pc else up_left
                value = (value + nearest) & 255

            row[j] = value

        for x in range(width):
            offset = (y * width + x) * 4
            source = x * 4
            rgba[offset : offset + 4] = row[source : source + 4]

        prior = row

    return width, height, rgba


def bbox(path):
    width, height, rgba = decode_png(path)
    min_x = width
    min_y = height
    max_x = -1
    max_y = -1

    for y in range(height):
        for x in range(width):
            alpha = rgba[(y * width + x) * 4 + 3]
            if alpha > 10:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < 0:
        return {"canvas": f"{width}x{height}", "content": "empty"}

    return {
        "canvas": f"{width}x{height}",
        "content": f"{max_x - min_x + 1}x{max_y - min_y + 1}",
        "pad": f"L{min_x} T{min_y} R{width - max_x - 1} B{height - max_y - 1}",
    }


if __name__ == "__main__":
    files = [
        "assets/draw-toolbar-icons/trendline.png",
        "assets/draw-toolbar-icons/cursor.png",
        "assets/draw-toolbar-icons/trash.png",
        "assets/draw-toolbar-icons/fib.png",
        "icons/draw-arrow.png",
        "icons/draw-rectangle.png",
    ]

    for file_path in files:
        print(file_path, bbox(file_path))
