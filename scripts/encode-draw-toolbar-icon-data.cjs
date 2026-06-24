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
"fib",
"channel",
"rectangle",
"long",
"short",
"trash"
];

const entries = {};

for(const name of NAMES){
const file = path.join(ICON_DIR, `${name}.png`);
const b64 = fs.readFileSync(file).toString("base64");
entries[name] = `data:image/png;base64,${b64}`;
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
