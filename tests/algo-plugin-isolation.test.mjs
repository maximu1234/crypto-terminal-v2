/**
 * Algo plugin isolation: no imports from Terminal trade modules / original Pattern 1-2.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(
path.dirname(fileURLToPath(import.meta.url)),
".."
);

function walkJsFiles(dir, out = []) {
if (!fs.existsSync(dir)) {
return out;
}

for (const name of fs.readdirSync(dir)) {
const full = path.join(dir, name);
const st = fs.statSync(full);

if (st.isDirectory()) {
walkJsFiles(full, out);
continue;
}

if (/\.(js|cjs|mjs)$/.test(name)) {
out.push(full);
}
}

return out;
}

function collectAlgoSources() {
const desktopAlgo = walkJsFiles(path.join(root, "desktop/trading")).filter(
(f) => {
const base = path.basename(f);
return base.startsWith("algo-") || base.startsWith("algo");
}
);

return [
...walkJsFiles(path.join(root, "js/algo-trading")),
path.join(root, "js/algo-trading.js"),
path.join(root, "js/algo-trading-list.js"),
path.join(root, "js/algo-trading-page-boot.js"),
...desktopAlgo
].filter((f) => fs.existsSync(f));
}

/** Forbidden import/require targets (not algo-local pattern-trade-* or algo-trading/trade). */
const FORBIDDEN = [
/from\s+["'][^"']*\/js\/trade\//,
/from\s+["']\.\.\/trade\//,
/from\s+["']\.\/trade\//,
/from\s+["'][^"']*\/trade-(?!.*algo)[a-z0-9-]+\.js/,
/from\s+["']\.\.\/trade-[a-z]/,
/from\s+["'][^"']*\/indicators\/pattern-12/,
/require\(\s*["']\.\/(?:bybit-rest|bingx-rest|trading-router|trading-stream|exchange-credentials)/,
/cryptoTerminalDesktop\.trading\b/
];

test("algo sources do not import Terminal trade / original pattern-12", () => {
const hits = [];

for (const file of collectAlgoSources()) {
const text = fs.readFileSync(file, "utf8");
const rel = path.relative(root, file);

for (const re of FORBIDDEN) {
if (re.test(text)) {
hits.push(`${rel} ↔ ${re}`);
}
}
}

assert.deepEqual(hits, []);
});

test("Terminal Early T3 list does not import bot-bridge or strategy prefs", () => {
const list = fs.readFileSync(
path.join(root, "js/algo-trading/terminal-early-t3-list.js"),
"utf8"
);
const flags = fs.readFileSync(
path.join(root, "js/algo-trading/bot-status-flags.js"),
"utf8"
);
const terminal = fs.readFileSync(
path.join(root, "js/terminal.js"),
"utf8"
);

assert.doesNotMatch(list, /bot-bridge\.js/);
assert.doesNotMatch(list, /bot-strategy-prefs/);
assert.doesNotMatch(list, /pattern-12-settings/);
assert.doesNotMatch(list, /early-t3-bot-prefs/);
assert.match(list, /bot-status-flags\.js/);

assert.doesNotMatch(flags, /bot-strategy-prefs/);
assert.doesNotMatch(flags, /pattern-12-settings/);
assert.doesNotMatch(flags, /early-t3-bot-prefs/);
assert.doesNotMatch(flags, /bot-ticker-book/);
assert.doesNotMatch(flags, /bot-cloud-lock/);

assert.doesNotMatch(terminal, /from\s+["']\.\/algo-trading\/bot-bridge/);
assert.match(terminal, /algo-trading\/terminal-early-t3-list\.js/);
});

test("RSI Touch Flip stays inside algo plugin and off Terminal", () => {
const engine = fs.readFileSync(
path.join(root, "js/algo-trading/rsi-touch-flip-engine.js"),
"utf8"
);
const book = fs.readFileSync(
path.join(root, "js/algo-trading/rsi-touch-flip-book.js"),
"utf8"
);
const panel = fs.readFileSync(
path.join(root, "js/algo-trading/rsi-touch-flip-panel.js"),
"utf8"
);
const fit = fs.readFileSync(
path.join(root, "js/algo-trading/rsi-touch-flip-fit-panel.js"),
"utf8"
);
const liveMath = fs.readFileSync(
path.join(root, "desktop/trading/algo-bot-rsi-touch-flip-math.cjs"),
"utf8"
);
const liveEngine = fs.readFileSync(
path.join(root, "desktop/trading/algo-bot-rsi-touch-flip-engine.cjs"),
"utf8"
);
const terminal = fs.readFileSync(
path.join(root, "js/terminal.js"),
"utf8"
);

const ui = fs.readFileSync(
path.join(root, "js/algo-trading/bot-strategy-ui.js"),
"utf8"
);
const html = fs.readFileSync(
path.join(root, "algo-trading.html"),
"utf8"
);

assert.doesNotMatch(engine, /indicators\/pattern-12/);
assert.doesNotMatch(engine, /bot-bridge/);
assert.doesNotMatch(book, /from\s+["'][^"']*bot-ticker-book/);
assert.doesNotMatch(book, /from\s+["'][^"']*bot-bridge/);
assert.doesNotMatch(book, /indicators\/pattern-12/);
assert.doesNotMatch(book, /cryptoTerminalDesktop\.trading\b/);
assert.doesNotMatch(panel, /bot-bridge/);
assert.doesNotMatch(panel, /bot-strategy-prefs/);
assert.doesNotMatch(panel, /from\s+["'][^"']*bot-ticker-book/);
assert.doesNotMatch(panel, /indicators\/pattern-12/);
assert.doesNotMatch(fit, /bot-bridge/);
assert.doesNotMatch(fit, /bot-strategy-prefs/);
assert.doesNotMatch(fit, /indicators\/pattern-12/);
assert.doesNotMatch(liveMath, /indicators\/pattern-12/);
assert.doesNotMatch(liveMath, /algo-bot-pattern-engine/);
assert.doesNotMatch(liveEngine, /indicators\/pattern-12/);
assert.doesNotMatch(liveEngine, /algo-bot-pattern-engine/);
assert.doesNotMatch(liveEngine, /cryptoTerminalDesktop\.trading\b/);
assert.doesNotMatch(terminal, /rsi-touch-flip/);
assert.doesNotMatch(ui, /algo-bot-rsi-flip-len/);
assert.doesNotMatch(html, /algo-bot-rsi-flip-len/);
assert.doesNotMatch(html, /algo-rsi-flip-copy-to-bot/);
assert.doesNotMatch(html, /Перенести в Боты/);
});

test("RSI live bot is not stopped on Algo page mount", () => {
const ui = fs.readFileSync(
path.join(root, "js/algo-trading/bot-strategy-ui.js"),
"utf8"
);
const start = ui.indexOf("Live-бот живёт в main");
const end = ui.indexOf("function onAnalysisBotChanged");
assert.ok(start > 0 && end > start);
const mountTail = ui.slice(start, end);
assert.doesNotMatch(mountTail, /onPattern12ModuleDisabled/);
assert.doesNotMatch(mountTail, /stopAlgoBotIfRunning/);
});
