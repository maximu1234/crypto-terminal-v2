import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("api/moex.js exports handler and whitelists ISS paths", () => {
  const handler = require(path.join(root, "api/moex.js"));
  assert.equal(typeof handler, "function");
});

test("moex adapter files exist and do not import trade modules", () => {
  const files = [
    "js/exchanges/moex/public.js",
    "js/exchanges/moex/fetch.js",
    "js/exchanges/moex/listings.js",
    "js/exchanges/moex/intervals.js",
    "js/exchanges/moex-readonly-stub.js"
  ];

  for (const rel of files) {
    const abs = path.join(root, rel);
    assert.ok(fs.existsSync(abs), rel);
    const src = fs.readFileSync(abs, "utf8");
    assert.equal(
      /js\/trade\//.test(src) || /from ["'].*trade\//.test(src),
      false,
      `${rel} must not import trade modules`
    );
  }
});

test("registry includes moex market tabs", async () => {
  const src = fs.readFileSync(
    path.join(root, "js/exchanges/registry.js"),
    "utf8"
  );
  assert.match(src, /moex\s*:/);
  assert.match(src, /id:\s*"shares"/);
  assert.match(src, /id:\s*"etf"/);
  assert.match(src, /id:\s*"indices"/);
  assert.match(src, /id:\s*"currency"/);
});

test("isExchangeTradingEnabled stays bybit|bingx only", () => {
  const src = fs.readFileSync(
    path.join(root, "js/market-api.js"),
    "utf8"
  );
  assert.match(src, /moexPublicAdapter/);
  assert.match(
    src,
    /return id ===\s*"bybit" \|\|\s*id ===\s*"bingx"/
  );
  assert.equal(/id ===\s*"moex"/.test(src.split("isExchangeTradingEnabled")[1] || ""), false);
});
