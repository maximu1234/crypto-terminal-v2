/**
 * Убирает непрозрачный тёмный фон у PNG иконок (arrow, rectangle).
 * node scripts/fix-draw-icon-transparency.cjs
 */
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const ICONS = [
"arrow",
"rectangle"
];

const ICON_DIR = path.join(
__dirname,
"../assets/draw-toolbar-icons"
);

const LUM_THRESHOLD = 42;

function paeth(a, b, c){

const p = a + b - c;
const pa = Math.abs(p - a);
const pb = Math.abs(p - b);
const pc = Math.abs(p - c);

if(pa <= pb && pa <= pc){
return a;
}
if(pb <= pc){
return b;
}
return c;

}

function decodePng(file){

const buf = fs.readFileSync(file);
if(buf.toString("latin1", 0, 8) !== "\x89PNG\r\n\x1a\n"){
throw new Error(`not png: ${file}`);
}

let pos = 8;
const chunks = [];

while(pos < buf.length){
const len = buf.readUInt32BE(pos);
const type = buf.toString("latin1", pos + 4, pos + 8);
const data = buf.slice(pos + 8, pos + 8 + len);
chunks.push({ type, data });
pos += 12 + len;
}

const ihdr = chunks.find(c => c.type === "IHDR").data;
const w = ihdr.readUInt32BE(0);
const h = ihdr.readUInt32BE(4);
const bitDepth = ihdr[8];
const colorType = ihdr[9];
const bpp =
colorType === 6
? 4
: 0;

if(bitDepth !== 8 || bpp !== 4){
throw new Error(`unsupported png ${bitDepth}/${colorType}`);
}

const idat = Buffer.concat(
chunks.filter(c => c.type === "IDAT").map(c => c.data)
);
const inflated = zlib.inflateSync(idat);
const rowBytes = w * bpp;
const rgba = Buffer.alloc(w * h * 4);
let inPos = 0;
let prior = Buffer.alloc(rowBytes);

for(let y = 0; y < h; y++){
const filter = inflated[inPos++];
const row = inflated.subarray(inPos, inPos + rowBytes);
inPos += rowBytes;
const out = Buffer.from(row);

for(let i = 0; i < out.length; i++){
const x = out[i];
const a = i >= bpp ? out[i - bpp] : 0;
const b = prior[i];
const c = i >= bpp ? prior[i - bpp] : 0;
let v = x;

if(filter === 1){
v = (x + a) & 255;
}else if(filter === 2){
v = (x + b) & 255;
}else if(filter === 3){
v = (x + Math.floor((a + b) / 2)) & 255;
}else if(filter === 4){
v = (x + paeth(a, b, c)) & 255;
}

out[i] = v;
}

for(let x = 0; x < w; x++){
const i = (y * w + x) * 4;
const s = x * 4;
rgba[i] = out[s];
rgba[i + 1] = out[s + 1];
rgba[i + 2] = out[s + 2];
rgba[i + 3] = out[s + 3];
}

prior = out;
}

return { w, h, rgba };

}

function luminance(r, g, b){

return 0.299 * r + 0.587 * g + 0.114 * b;

}

function stripDarkBackground(rgba){

const out = Buffer.from(rgba);

for(let i = 0; i < out.length; i += 4){
const r = out[i];
const g = out[i + 1];
const b = out[i + 2];

if(
luminance(r, g, b) <
LUM_THRESHOLD
){
out[i] = 0;
out[i + 1] = 0;
out[i + 2] = 0;
out[i + 3] = 0;
}else{
out[i + 3] = 255;
}

}

return out;

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
const crc = Buffer.alloc(4);
crc.writeUInt32BE(
crc32(Buffer.concat([typeBuf, data])),
0
);
return Buffer.concat([len, typeBuf, data, crc]);

}

function encodePng(w, h, rgba){

const raw = Buffer.alloc((w * 4 + 1) * h);
for(let y = 0; y < h; y++){
const row = y * (w * 4 + 1);
raw[row] = 0;
rgba.copy(
raw,
row + 1,
y * w * 4,
(y + 1) * w * 4
);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(w, 0);
ihdr.writeUInt32BE(h, 4);
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

for(const name of ICONS){

const file = path.join(ICON_DIR, `${name}.png`);
const { w, h, rgba } = decodePng(file);
const fixed = stripDarkBackground(rgba);
fs.writeFileSync(file, encodePng(w, h, fixed));
console.log(`fixed ${file}`);

const source = path.join(
__dirname,
`../icons/draw-${name}.png`
);

if(fs.existsSync(source)){
const src = decodePng(source);
const srcFixed = stripDarkBackground(src.rgba);
fs.writeFileSync(
source,
encodePng(src.w, src.h, srcFixed)
);
console.log(`fixed ${source}`);
}

}

console.log("done — run: python3 scripts/encode-draw-toolbar-icon-data.py");
