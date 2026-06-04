/**
 * Пересобирает js/draw-toolbar-icon-data.js из assets/draw-toolbar-icons/*.png
 * Запуск: node scripts/encode-draw-toolbar-icon-data.cjs
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
"hray",
"fib",
"channel",
"short",
"long",
"trash"
];

const entries = {};

for(const name of NAMES){
const file = path.join(ICON_DIR, `${name}.png`);
const b64 = fs.readFileSync(file).toString("base64");
entries[name] = `data:image/png;base64,${b64}`;
}

const lines = [
"/** @generated — node scripts/encode-draw-toolbar-icon-data.cjs */",
"export const DRAW_TOOL_ICON_DATA = {"
];

for(const name of NAMES){
lines.push(
`  ${name}: "${entries[name]}",`
);
}

lines.push("};", "", "export function getDrawToolIconSrc(name){", "return DRAW_TOOL_ICON_DATA[name] || \"\";", "}", "");

const out = path.join(
__dirname,
"../js/draw-toolbar-icon-data.js"
);

fs.writeFileSync(out, lines.join("\n"));
console.log("wrote", out, `(${NAMES.length} icons)`);
