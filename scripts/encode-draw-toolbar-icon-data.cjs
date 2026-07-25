/**
 * Пересобирает js/draw-toolbar-icon-data.js из assets/draw-toolbar-icons/*.png
 * node scripts/encode-draw-toolbar-icon-data.cjs
 */
const fs = require("fs");
const path = require("path");

const ICON_DIR = path.join(
__dirname,
"../assets/draw-toolbar-icons"
);

const NAMES = [
"cursor",
"trendline",
"brush",
"arrow",
"hray",
"hline",
"fib",
"channel",
"rectangle",
"long",
"short",
"trash"
];


const EXPECTED_W = 50;
const EXPECTED_H = 70;

function pngSize(buf){
const w = buf.readUInt32BE(16);
const h = buf.readUInt32BE(20);
return { w, h };
}

const entries = {};

for(const name of NAMES){
const file = path.join(ICON_DIR, `${name}.png`);
const buf = fs.readFileSync(file);
const { w, h } = pngSize(buf);
if(w !== EXPECTED_W || h !== EXPECTED_H){
throw new Error(
`${name}.png is ${w}x${h}, expected ${EXPECTED_W}x${EXPECTED_H} (do not re-encode mismatched sources)`
);
}
entries[name] = `data:image/png;base64,${buf.toString("base64")}`;
}

const lines = [
"export const DRAW_TOOL_ICON_DATA = {"
];

for(const name of NAMES){
lines.push(
`  ${name}: "${entries[name]}",`
);
}

lines.push(
"}",
"",
"export function getDrawToolIconSrc(name){",
"return DRAW_TOOL_ICON_DATA[name] || \"\";",
"}",
""
);

fs.writeFileSync(
path.join(__dirname, "../js/draw-toolbar-icon-data.js"),
lines.join("\n")
);

console.log("wrote draw-toolbar-icon-data.js");
