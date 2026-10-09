import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function functionNames(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  return [...source.matchAll(/^(?:export )?function ([A-Za-z0-9_]+)/gm)]
    .map(match => match[1])
    .sort();
}

test("Bybit and BingX book panels keep the same function names", () => {
  const bybit = functionNames("js/trade/bybit/book-panel.js");
  const bingx = functionNames("js/trade/bingx/book-panel.js");
  assert.deepEqual(bybit, bingx);
});
