import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRsiTouchFlipBook,
  normalizeRsiTouchFlipBookRow,
  sumRsiTouchFlipBookBudgets,
  rsiTouchFlipBookBudgetFits,
  parseWalletAvailableUsdt
} from "../js/algo-trading/rsi-touch-flip-book.js";

test("book row keeps chart tf and launch prefs per ticker", () => {
  const row = normalizeRsiTouchFlipBookRow({
    symbol: "ethusdt.p",
    tf: "5",
    prefs: { rsiLen: 20, osLevel: 35, obLevel: 78, budget: 250, rsiTf: "1" }
  });
  assert.equal(row.symbol, "ETHUSDT");
  assert.equal(row.tf, "5");
  assert.equal(row.prefs.rsiLen, 20);
  assert.equal(row.prefs.budget, 250);
  assert.equal(row.prefs.rsiTf, "1");
});

test("duplicate symbols collapse to the last row", () => {
  const book = normalizeRsiTouchFlipBook([
    { symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } },
    { symbol: "ethusdt.p", tf: "1", prefs: { budget: 400 } }
  ]);
  assert.equal(book.length, 1);
  assert.equal(book[0].tf, "1");
  assert.equal(book[0].prefs.budget, 400);
});

test("budget gate uses overwrite of the same ticker", () => {
  const rows = [
    { symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } },
    { symbol: "SOLUSDT", tf: "5", prefs: { budget: 100 } }
  ];
  const over = rsiTouchFlipBookBudgetFits({
    rows,
    available: 300,
    incoming: { symbol: "ETHUSDT", budget: 200 }
  });
  assert.equal(over.ok, true);
  assert.equal(over.sum, 300);
  const fail = rsiTouchFlipBookBudgetFits({
    rows,
    available: 250,
    incoming: { symbol: "BTCUSDT", budget: 80 }
  });
  assert.equal(fail.ok, false);
  assert.equal(fail.sum, 280);
});

test("start gate is sum of all book budgets vs available", () => {
  const rows = [
    { symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } },
    { symbol: "SOLUSDT", tf: "1", prefs: { budget: 50 } }
  ];
  assert.equal(sumRsiTouchFlipBookBudgets(rows), 150);
  assert.equal(rsiTouchFlipBookBudgetFits({ rows, available: 150 }).ok, true);
  assert.equal(rsiTouchFlipBookBudgetFits({ rows, available: 149 }).ok, false);
});

test("coin list symbols stay without .P so they match Bybit tickers and Pattern flags", () => {
  const book = normalizeRsiTouchFlipBook([
    { symbol: "ETHUSDT.P", tf: "5", prefs: { budget: 80 } },
    { symbol: "solusdt", tf: "1", prefs: { budget: 40 } }
  ]);
  assert.deepEqual(
    book.map((row) => row.symbol),
    ["ETHUSDT", "SOLUSDT"]
  );
});

test("wallet available 0 falls back to equity like the algo-profile label", () => {
  assert.equal(
    parseWalletAvailableUsdt({ ok: true, usdt: "86.53", available: 0 }),
    86.53
  );
  assert.equal(
    parseWalletAvailableUsdt({ ok: true, usdt: "86.53", available: 50 }),
    50
  );
  assert.equal(
    parseWalletAvailableUsdt({ ok: true, usdt: "0", available: 0 }),
    0
  );
  const gate = rsiTouchFlipBookBudgetFits({
    rows: [],
    available: { ok: true, usdt: "86.53", available: 0 },
    incoming: { symbol: "ETHUSDT", budget: 80 }
  });
  assert.equal(gate.ok, true);
  assert.equal(gate.available, 86.53);
});
