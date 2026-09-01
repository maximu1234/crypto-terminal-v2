import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("desktop does not race Vercel /api/bybit for candle history", () => {
  const source = read("js/bybit-fetch.js");
  assert.match(source, /function isDesktopShell/);
  const bulk = source.slice(source.indexOf("export async function fetchBybitBulk"));
  const via = source.slice(source.indexOf("async function fetchBybitViaProxies"));
  assert.match(bulk, /!isDesktopShell\(\)/);
  assert.match(via, /isDesktopShell\(\)/);
});

test("aborted Bybit race losers do not open the network banner", () => {
  const fetchSource = read("js/bybit-fetch.js");
  assert.match(fetchSource, /function isAbortFetchError/);
  const fail = fetchSource.slice(fetchSource.indexOf("function markBybitFailure"));
  assert.match(fail, /isAbortFetchError/);
  const ui = read("js/bybit-network-ui.js");
  assert.match(ui, /AbortError/);
  assert.match(ui, /aborted/);
});
