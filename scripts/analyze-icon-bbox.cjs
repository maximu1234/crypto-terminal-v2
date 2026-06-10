const fs = require("fs");
const zlib = require("zlib");

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  const chunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    chunks.push({ type, data: buf.slice(pos + 8, pos + 8 + len) });
    pos += 12 + len;
  }
  const ihdr = chunks.find((c) => c.type === "IHDR").data;
  const w = ihdr.readUInt32BE(0);
  const h = ihdr.readUInt32BE(4);
  const ct = ihdr[9];
  const bpp = ct === 6 ? 4 : 0;
  const idat = Buffer.concat(
    chunks.filter((c) => c.type === "IDAT").map((c) => c.data)
  );
  const inflated = zlib.inflateSync(idat);
  const rowBytes = w * bpp;
  const rgba = Buffer.alloc(w * h * 4);
  let inPos = 0;
  let prior = Buffer.alloc(rowBytes);
  for (let y = 0; y < h; y++) {
    const filter = inflated[inPos++];
    const row = inflated.subarray(inPos, inPos + rowBytes);
    inPos += rowBytes;
    const out = Buffer.from(row);
    for (let i = 0; i < out.length; i++) {
      const x = out[i];
      const a = i >= bpp ? out[i - bpp] : 0;
      const b = prior[i];
      const c = i >= bpp ? prior[i - bpp] : 0;
      let v = x;
      if (filter === 1) v = (x + a) & 255;
      else if (filter === 2) v = (x + b) & 255;
      else if (filter === 3) v = (x + Math.floor((a + b) / 2)) & 255;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = (x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      out[i] = v;
    }
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      rgba[i] = out[x * 4];
      rgba[i + 1] = out[x * 4 + 1];
      rgba[i + 2] = out[x * 4 + 2];
      rgba[i + 3] = out[x * 4 + 3];
    }
    prior = out;
  }
  return { w, h, rgba };
}

function bbox(file) {
  const { w, h, rgba } = decodePng(file);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = rgba[(y * w + x) * 4 + 3];
      if (a > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { canvas: `${w}x${h}`, content: "empty" };
  return {
    canvas: `${w}x${h}`,
    content: `${maxX - minX + 1}x${maxY - minY + 1}`,
    pad: `L${minX} T${minY} R${w - maxX - 1} B${h - maxY - 1}`,
  };
}

[
  "assets/draw-toolbar-icons/trendline.png",
  "icons/draw-arrow.png",
  "icons/draw-rectangle.png",
  "assets/draw-toolbar-icons/trash.png",
  "assets/draw-toolbar-icons/cursor.png",
].forEach((f) => console.log(f, bbox(f)));
