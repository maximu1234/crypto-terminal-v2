/**
 * Режет горизонтальный спрайт панели рисования на отдельные PNG без ресайза.
 * node scripts/slice-draw-toolbar-sprite.cjs <sprite.png>
 */
const fs = require("fs");
const zlib = require("zlib");

const NAMES = [
"cursor",
"trendline",
"hray",
"fib",
"channel",
"long",
"short",
"trash"
];

const OUT_DIR = require("path").join(
__dirname,
"../assets/draw-toolbar-icons"
);

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

function unfilterRow(
filter,
row,
prior,
bpp
){

const out = Buffer.from(row);

for(let i = 0; i < out.length; i++){
const x = out[i];
const a = i >= bpp
? out[i - bpp]
: 0;
const b = prior[i];
const c =
i >= bpp
? prior[i - bpp]
: 0;

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

return out;

}

function decodePng(file){

const buf = fs.readFileSync(file);
if(buf.toString("latin1", 0, 8) !== "\x89PNG\r\n\x1a\n"){
throw new Error("not png");
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
: colorType === 2
? 3
: 0;

if(bitDepth !== 8 || !bpp){
throw new Error(`unsupported png ${bitDepth}/${colorType}`);
}

const idat = Buffer.concat(
chunks.filter(c => c.type === "IDAT").map(c => c.data)
);
const inflated = zlib.inflateSync(idat);
const rowBytes = w * bpp;
const rgba = Buffer.alloc(w * h * 4);
let raw = 0;
let prior = Buffer.alloc(rowBytes);

for(let y = 0; y < h; y++){
const filter = inflated[raw++];
const row = unfilterRow(
filter,
inflated.slice(raw, raw + rowBytes),
prior,
bpp
);
raw += rowBytes;

for(let x = 0; x < w; x++){
const i = (y * w + x) * 4;
const ri = x * bpp;
rgba[i] = row[ri];
rgba[i + 1] = row[ri + 1];
rgba[i + 2] = row[ri + 2];
rgba[i + 3] =
bpp === 4
? row[ri + 3]
: 255;
}

prior = row;
}

return { w, h, rgba };

}

function luminance(r, g, b){
return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const SUM_THRESHOLD =
1650;
const MERGE_GAP_PX =
14;
const MIN_SLICE_WIDTH =
24;

function findSlices(w, h, rgba){

const sum = new Array(w).fill(0);

for(let x = 0; x < w; x++){
for(let y = 0; y < h; y++){
const i = (y * w + x) * 4;
sum[x] +=
luminance(
rgba[i],
rgba[i + 1],
rgba[i + 2]
);
}
}

const threshold =
SUM_THRESHOLD;
let map = "";

for(let x = 0; x < w; x++){
map +=
sum[x] < threshold
? "."
: "#";
}

const raw = [];
let i = 0;

while(i < map.length){

if(map[i] === "#"){
const x0 = i;

while(
i < map.length &&
map[i] === "#"
){
i++;
}

raw.push({
x0,
x1:i,
width:i - x0
});

}else{
i++;
}

}

const merged = [];

for(const part of raw){

if(
!merged.length
){
merged.push({ ...part });
continue;
}

const prev =
merged[merged.length - 1];
const gap =
part.x0 - prev.x1;

if(
gap <= MERGE_GAP_PX
){
prev.x1 = part.x1;
prev.width =
prev.x1 - prev.x0;
}else{
merged.push({ ...part });
}

}

merged.sort(
(a, b)=>
b.width - a.width
);

const parts =
merged
.filter(
part=>
part.width >= MIN_SLICE_WIDTH
)
.sort(
(a, b)=>
a.x0 - b.x0
);

if(parts.length < NAMES.length){
return parts;
}

const slices = [];

for(let i = 0; i < NAMES.length; i++){
const x0 = parts[i].x0;
const x1 =
i < NAMES.length - 1
? parts[i + 1].x0
: w;

slices.push({
x0,
x1,
width:x1 - x0
});

}

return slices;

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

function main(){

const src =
process.argv[2] ||
require("path").join(
__dirname,
"../assets/draw-toolbar-icons/source-toolbar-sprite.png"
);

const { w, h, rgba } = decodePng(src);
const slices = findSlices(w, h, rgba);

console.log(
`sprite ${w}x${h}, slices: ${slices.length}`,
slices.map(s => s.width).join("+")
);

let useSlices = slices;

if(useSlices.length !== NAMES.length){
const n = NAMES.length;
const base = Math.floor(w / n);
let rem = w - base * n;
useSlices = [];

let x = 0;

for(let i = 0; i < n; i++){
const width =
base + (rem > 0 ? 1 : 0);
if(rem > 0){
rem--;
}
useSlices.push({
x0:x,
x1:x + width,
width
});
x += width;
}

console.log(
`fallback equal split:`,
useSlices.map(s => s.width).join("+")
);

}

function copySlicePixels(
out,
width,
h,
rgba,
srcW,
x0
){

for(let y = 0; y < h; y++){
for(let x = 0; x < width; x++){
const si = (y * srcW + (x0 + x)) * 4;
const di = (y * width + x) * 4;
const r = rgba[si];
const g = rgba[si + 1];
const b = rgba[si + 2];

if(
luminance(r, g, b) < 42
){
out[di] = 0;
out[di + 1] = 0;
out[di + 2] = 0;
out[di + 3] = 0;
}else{
out[di] = r;
out[di + 1] = g;
out[di + 2] = b;
out[di + 3] = 255;
}

}

}

}

for(let i = 0; i < NAMES.length; i++){
const { x0, width } = useSlices[i];
const out = Buffer.alloc(width * h * 4);

copySlicePixels(
out,
width,
h,
rgba,
w,
x0
);

const file = require("path").join(
OUT_DIR,
`${NAMES[i]}.png`
);
fs.writeFileSync(file, encodePng(width, h, out));
console.log("wrote", file, `${width}x${h}`);
}

}

main();
