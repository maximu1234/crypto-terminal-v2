/**
 * Algo bot main-process helpers are duplicated per file on purpose (no shared
 * policy layer), so every clamp/resolve/compute/pick helper that a file calls
 * must also be defined in that same file — иначе ReferenceError в рантайме.
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

const FILES = [
"desktop/trading/algo-bot-order-executor.cjs",
"desktop/trading/algo-bot-store.cjs",
"desktop/trading/algo-bot-watchlist-refresh.cjs",
"desktop/trading/algo-bot-pattern-engine.cjs",
"desktop/trading/algo-trading-bot.cjs",
"bot-app/trading/algo-bot-order-executor.cjs",
"bot-app/trading/algo-bot-store.cjs",
"bot-app/trading/algo-bot-watchlist-refresh.cjs",
"bot-app/trading/algo-bot-pattern-engine.cjs",
"bot-app/trading/algo-trading-bot.cjs"
];

const HELPER = /^(?:clamp|resolve|compute|pick|normalize)[A-Z][\w$]*$/;

function localDefinitions(text) {
const defs = new Set();

for (const m of text.matchAll(/function\s+([A-Za-z_$][\w$]*)/g)) {
defs.add(m[1]);
}

for (const m of text.matchAll(
/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g
)) {
defs.add(m[1]);
}

for (const m of text.matchAll(/([A-Za-z_$][\w$]*)\s*[,}]\s*\n?\s*}\s*=\s*require/g)) {
defs.add(m[1]);
}

for (const m of text.matchAll(/^\s*([A-Za-z_$][\w$]*),?\s*$/gm)) {
defs.add(m[1]);
}

return defs;
}

test("algo bot helpers called in a file are defined in that file", () => {
const missing = [];

for (const rel of FILES) {
const full = path.join(root, rel);

if (!fs.existsSync(full)) {
continue;
}

const text = fs.readFileSync(full, "utf8");
const defs = localDefinitions(text);

for (const m of text.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
const name = m[1];

if (HELPER.test(name) && !defs.has(name)) {
missing.push(`${rel} → ${name}`);
}
}
}

assert.deepEqual([...new Set(missing)], []);
});
