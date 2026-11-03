import test from "node:test";
import assert from "node:assert/strict";

import { calculateMacd } from "../js/indicators/macd-math.js";
import { calculateAwesomeOscillator } from "../js/indicators/ao-math.js";
import { fibPrices } from "../js/canvas-bench/drawings.js";
import { macdReplaceLast, rollMacd } from "../js/canvas-bench/macd.js";
import { aoReplaceLast, rollAo } from "../js/canvas-bench/ao.js";
import { positionPnlText } from "../js/canvas-bench/pnl-tag.js";

function candles(count, closeOf) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const close = closeOf(i);
    rows.push({
      time: i * 60,
      open: close - 1,
      high: close + 2,
      low: close - 2,
      close,
      volume: 10 + i
    });
  }
  return rows;
}

test("MACD last point matches the terminal formula and a tick does not recompute history", () => {
  const rows = candles(80, i => 100 + Math.sin(i / 4) * 5);
  const full = calculateMacd(rows);
  const state = rollMacd(rows);
  const last = rows.length - 1;
  assert.ok(Math.abs(state.macd[last] - full[last].macd) < 1e-8);
  assert.ok(Math.abs(state.signal[last] - full[last].signal) < 1e-8);
  assert.ok(Math.abs(state.hist[last] - full[last].hist) < 1e-8);
  const frozen = state.macd[last - 1];
  rows[last] = { ...rows[last], close: rows[last].close + 3 };
  assert.equal(macdReplaceLast(state, rows), true);
  const again = calculateMacd(rows);
  assert.equal(state.macd[last - 1], frozen);
  assert.ok(Math.abs(state.macd[last] - again[last].macd) < 1e-6);
  assert.ok(Math.abs(state.signal[last] - again[last].signal) < 1e-6);
  assert.ok(Math.abs(state.hist[last] - again[last].hist) < 1e-6);
});

test("AO last bar matches the terminal formula after a same-bar tick", () => {
  const rows = candles(60, i => 100 + i * 0.2);
  const full = calculateAwesomeOscillator(rows);
  const state = rollAo(rows);
  const last = rows.length - 1;
  assert.ok(Math.abs(state.values[last] - full.at(-1).value) < 1e-8);
  rows[last] = {
    ...rows[last],
    high: rows[last].high + 4,
    low: rows[last].low + 1
  };
  assert.equal(aoReplaceLast(state, rows), true);
  const again = calculateAwesomeOscillator(rows);
  assert.ok(Math.abs(state.values[last] - again.at(-1).value) < 1e-8);
  assert.equal(state.values[last - 1], rollAo(rows).values[last - 1]);
});

test("fib has the seven retracement prices and PnL follows the last price", () => {
  const prices = fibPrices({
    points: [{ price: 100 }, { price: 200 }]
  });
  assert.equal(prices.length, 7);
  assert.equal(prices[0], 100);
  assert.equal(prices.at(-1), 200);
  assert.equal(positionPnlText(100, 110, 0.02), "+0.20");
  assert.equal(positionPnlText(100, 90, 0.02), "-0.20");
});
