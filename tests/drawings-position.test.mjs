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

test("position metrics and sizing share one source of truth", () => {
  const shape = {
    ...position(),
    riskUsd: 100
  };

  assert.deepEqual(
    positionMetrics(shape),
    { tpPct: 20, slPct: 20, rr: "1.00" }
  );

  const sizing = positionSizingFromShape(shape);
  assert.equal(sizing.riskUsd, 100);
  assert.ok(Number.isFinite(sizing.volume));

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
