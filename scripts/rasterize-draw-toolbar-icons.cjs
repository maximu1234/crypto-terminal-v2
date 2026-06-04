/**
 * Рендер long/short/trash PNG (96×96) в стиле trendline: stroke 2px, чёрный фон.
 * Запуск: node scripts/rasterize-draw-toolbar-icons.cjs
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SIZE = 96;
const STROKE = 2;
const BG = [0, 0, 0, 255];
const FG = [255, 255, 255, 255];

const OUT_DIR = path.join(
__dirname,
"../assets/draw-toolbar-icons"
);

function dist2(x, y, cx, cy){
return (x - cx) * (x - cx) + (y - cy) * (y - cy);
}

function distToSegment(px, py, x1, y1, x2, y2){
const dx = x2 - x1;
const dy = y2 - y1;
const len2 = dx * dx + dy * dy;
if(len2 < 1e-6){
return Math.hypot(px - x1, py - y1);
}
let t = ((px - x1) * dx + (py - y1) * dy) / len2;
t = Math.max(0, Math.min(1, t));
const qx = x1 + t * dx;
const qy = y1 + t * dy;
return Math.hypot(px - qx, py - qy);
}

function strokeCircle(buf, cx, cy, r){
const half = STROKE / 2;
const r0 = r - half;
const r1 = r + half;
for(let y = 0; y < SIZE; y++){
for(let x = 0; x < SIZE; x++){
const d = Math.sqrt(dist2(x + 0.5, y + 0.5, cx, cy));
if(d >= r0 && d <= r1){
setPx(buf, x, y, FG);
}
}
}
}

function strokeLine(buf, x1, y1, x2, y2){
const half = STROKE / 2;
for(let y = 0; y < SIZE; y++){
for(let x = 0; x < SIZE; x++){
const d = distToSegment(
x + 0.5,
y + 0.5,
x1,
y1,
x2,
y2
);
if(d <= half){
setPx(buf, x, y, FG);
}
}
}
}

function fillRect(buf, x0, y0, x1, y1){
for(let y = y0; y < y1; y++){
for(let x = x0; x < x1; x++){
if(x >= 0 && x < SIZE && y >= 0 && y < SIZE){
setPx(buf, x, y, FG);
}
}
}
}

function setPx(buf, x, y, rgba){
const i = (y * SIZE + x) * 4;
buf[i] = rgba[0];
buf[i + 1] = rgba[1];
buf[i + 2] = rgba[2];
buf[i + 3] = rgba[3];
}

function clear(buf){
for(let i = 0; i < buf.length; i += 4){
buf[i] = BG[0];
buf[i + 1] = BG[1];
buf[i + 2] = BG[2];
buf[i + 3] = BG[3];
}
}

function drawLong(buf){
strokeCircle(buf, 22, 30, 4);
strokeLine(buf, 28, 30, 74, 30);
strokeCircle(buf, 22, 66, 4);
strokeLine(buf, 28, 66, 74, 66);
strokeLine(buf, 46, 44, 46, 58);
strokeLine(buf, 46, 58, 54, 58);
}

function cubicPoint(p0, p1, p2, p3, t){

const u = 1 - t;
const uu = u * u;
const tt = t * t;

return [
uu * u * p0[0] +
3 * uu * t * p1[0] +
3 * u * tt * p2[0] +
tt * t * p3[0],
uu * u * p0[1] +
3 * uu * t * p1[1] +
3 * u * tt * p2[1] +
tt * t * p3[1]
];

}

function strokeBezier(buf, p0, p1, p2, p3){

const steps = 40;
let px;
let py;

for(let i = 0; i <= steps; i++){
const p = cubicPoint(
p0,
p1,
p2,
p3,
i / steps
);

if(i > 0){
strokeLine(buf, px, py, p[0], p[1]);
}

px = p[0];
py = p[1];

}

}

function drawShort(buf){

strokeCircle(buf, 22, 30, 4);
strokeLine(buf, 28, 30, 74, 30);
strokeCircle(buf, 22, 66, 4);
strokeLine(buf, 28, 66, 74, 66);

strokeBezier(
buf,
[56, 42],
[44, 42],
[42, 48],
[50, 51]
);

strokeBezier(
buf,
[50, 51],
[58, 54],
[58, 60],
[46, 60]
);

}

function drawTrash(buf){
strokeLine(buf, 34, 34, 62, 34);
strokeLine(buf, 38, 34, 38, 30);
strokeLine(buf, 58, 34, 58, 30);
strokeLine(buf, 38, 30, 58, 30);
strokeLine(buf, 36, 34, 38, 76);
strokeLine(buf, 58, 34, 56, 76);
strokeLine(buf, 38, 76, 56, 76);
strokeLine(buf, 42, 44, 42, 68);
strokeLine(buf, 48, 44, 48, 68);
strokeLine(buf, 54, 44, 54, 68);
}

function crc32(buf){
let c = ~0;
for(let i = 0; i < buf.length; i++){
c ^= buf[i];
for(let k = 0; k < 8; k++){
c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
}
}
return ~c >>> 0;
}

function chunk(type, data){
const len = Buffer.alloc(4);
len.writeUInt32BE(data.length, 0);
const typeBuf = Buffer.from(type);
const body = Buffer.concat([typeBuf, data]);
const crc = Buffer.alloc(4);
crc.writeUInt32BE(
crc32(Buffer.concat([typeBuf, data])),
0
);
return Buffer.concat([len, body, crc]);
}

function encodePng(rgba){
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for(let y = 0; y < SIZE; y++){
const row = y * (SIZE * 4 + 1);
raw[row] = 0;
rgba.copy(
raw,
row + 1,
y * SIZE * 4,
(y + 1) * SIZE * 4
);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;
const sig = Buffer.from([
137, 80, 78, 71, 13, 10, 26, 10
]);
return Buffer.concat([
sig,
chunk("IHDR", ihdr),
chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
chunk("IEND", Buffer.alloc(0))
]);
}

function writeIcon(name, drawFn){
const buf = Buffer.alloc(SIZE * SIZE * 4);
clear(buf);
drawFn(buf);
const out = path.join(OUT_DIR, `${name}.png`);
fs.writeFileSync(out, encodePng(buf));
console.log("wrote", out);
}

writeIcon("long", drawLong);
writeIcon("short", drawShort);
writeIcon("trash", drawTrash);
