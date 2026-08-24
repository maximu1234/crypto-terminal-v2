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
