import assert from "node:assert/strict";
import test from "node:test";

const {
  clampPositionPrices,
  formatPositionPrice,
  getPositionHandleScreens,
  initialPositionTpSlPercent,
  positionBodyDist,
  positionMetrics,
  positionSizingFromShape,
  positionXBounds
} = await import("../js/drawings/position.js");

const toXY = (point) => {
  if (!point || !Number.isFinite(point.time) || !Number.isFinite(point.price)) {
    return null;
  }
  return {
    x: point.time,
    y: 100 - point.price
  };
};

const plotPriceToCoordinate = (price) =>
  Number.isFinite(price)
    ? 100 - price
    : null;

function position(type = "long") {
  return {
    type,
    p1: { time: 10, price: 50 },
    p2: { time: 30, price: 50 },
    tpPrice: type === "long" ? 60 : 40,
    slPrice: type === "long" ? 40 : 60
  };
}

test("positionXBounds normalizes horizontal direction", () => {
  assert.deepEqual(
    positionXBounds(position(), toXY),
    { x1: 10, x2: 30, yEntry: 50 }
  );

  const reversed = position();
  [reversed.p1, reversed.p2] = [reversed.p2, reversed.p1];
  assert.deepEqual(
    positionXBounds(reversed, toXY),
    { x1: 10, x2: 30, yEntry: 50 }
  );
});

test("positionBodyDist covers long and short zones", () => {
  assert.equal(
    positionBodyDist(20, 45, position("long"), toXY, plotPriceToCoordinate),
    0
  );
  assert.equal(
    positionBodyDist(20, 55, position("short"), toXY, plotPriceToCoordinate),
    0
  );
  assert.equal(
    positionBodyDist(35, 50, position("long"), toXY, plotPriceToCoordinate),
    5
  );
  assert.equal(
    positionBodyDist(
      20,
      50,
      { ...position(), type: "rectangle" },
      toXY,
      plotPriceToCoordinate
    ),
    Infinity
  );
});

test("getPositionHandleScreens returns entry, TP and SL handles", () => {
  assert.deepEqual(
    getPositionHandleScreens(position(), toXY, plotPriceToCoordinate),
    [
      { id: "entryL", x: 10, y: 50 },
      { id: "entryR", x: 30, y: 50 },
      { id: "tp", x: 10, y: 40 },
      { id: "sl", x: 10, y: 60 }
    ]
  );

  assert.deepEqual(
    getPositionHandleScreens(
      { ...position(), tpPrice: null },
      toXY,
      plotPriceToCoordinate
    ),
    []
  );
});

test("position metrics use log RR; sizing $/% use linear exchange PnL", () => {
  const shape = {
    ...position(),
    riskUsd: 100
  };

  const metrics = positionMetrics(shape);
  // entry 50, tp 60, sl 40 → |ln(60/50)|*100 / |ln(40/50)|*100
  const tpPct = Math.abs(Math.log(60 / 50)) * 100;
  const slPct = Math.abs(Math.log(40 / 50)) * 100;
  assert.ok(Math.abs(metrics.tpPct - tpPct) < 1e-9);
  assert.ok(Math.abs(metrics.slPct - slPct) < 1e-9);
  assert.equal(metrics.rr, (tpPct / slPct).toFixed(2));

  const sizing = positionSizingFromShape(shape);
  assert.equal(sizing.riskUsd, 100);
  assert.ok(Number.isFinite(sizing.volume));
  // volume from linear stop % = 20
  assert.equal(sizing.volume, Math.round((100 * 100) / 20));
  // TP$ = volume × linear TP% / 100 = 500 × 20% = 100
  assert.equal(sizing.profitUsd, sizing.volume * 0.2);
  assert.equal(sizing.tpPct, 20);
  assert.equal(sizing.slPct, 20);
  assert.ok(Math.abs(sizing.rrNum - 1) < 1e-9);

  // algo-style linear 1к2: entry 110, sl 105, tp = 110 + 2*(110-105)
  const entry = 110;
  const sl = 105;
  const tp = entry + 2 * (entry - sl);
  const linShape = {
    type: "long",
    p1: { time: 1, price: entry },
    p2: { time: 2, price: entry },
    tpPrice: tp,
    slPrice: sl,
    riskUsd: 10
  };
  const linSizing = positionSizingFromShape(linShape);
  assert.ok(Math.abs(linSizing.rrNum - 2) < 1e-9);
  assert.ok(Math.abs(linSizing.profitUsd - 20) < 1e-9);

  // St2/St3: ⅓ + ⅓ + ⅓ на трёх тейках (линейно), не 100% до дальнего TP
  const partialShape = {
    type: "long",
    p1: { time: 1, price: 100 },
    p2: { time: 2, price: 100 },
    tpPrice: 115,
    slPrice: 95,
    riskUsd: 10,
    partialExitPrices: [105, 110, 115]
  };
  const partSizing = positionSizingFromShape(partialShape);
  // volume = 10 / 5% = 200; Σ ⅓×200×(5%+10%+15%) = 20
  assert.ok(Math.abs(partSizing.profitUsd - 20) < 1e-9);
  assert.ok(Math.abs(partSizing.rrNum - 2) < 1e-9);

  assert.deepEqual(
    positionMetrics({
      ...shape,
      p1: { ...shape.p1, price: 0 }
    }),
    { tpPct: 0, slPct: 0, rr: "—" }
  );
});


test("initialPositionTpSlPercent uses default percents", () => {
  const long = initialPositionTpSlPercent("long", 100);
  assert.equal(long.tpPrice, 103);
  assert.equal(long.slPrice, 98.5);

  const short = initialPositionTpSlPercent("short", 100);
  assert.equal(short.tpPrice, 97);
  assert.ok(Math.abs(short.slPrice - 101.5) < 1e-9);
});

test("clampPositionPrices keeps long TP above entry", () => {
  const shape = {
    type: "long",
    p1: { time: 1, price: 100 },
    p2: { time: 2, price: 100 },
    tpPrice: 90,
    slPrice: 95
  };
  clampPositionPrices(shape);
  assert.ok(shape.tpPrice > 100);
  assert.ok(shape.slPrice < 100);
});

test("formatPositionPrice picks precision by magnitude", () => {
  assert.equal(formatPositionPrice(1234.56), "1234.6");
  assert.equal(formatPositionPrice(1.23456), "1.2346");
  assert.equal(formatPositionPrice(0.1234567), "0.123457");
  assert.equal(formatPositionPrice(NaN), "—");
});
