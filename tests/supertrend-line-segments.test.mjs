import assert from "node:assert/strict";
import test from "node:test";

import {
buildSupertrendChartLineData,
splitSupertrendValuedSegments
} from "../js/indicators/supertrend-math.js";

/** Рост → обвал → рост: несколько смен тренда Supertrend. */
function candlesWithFlips(){

const rows = [];
let price = 100;

for(let i = 0; i < 30; i++){
  const open = price;
  price += 2;
  rows.push({
    time: 1_700_000_000 + i * 60,
    open,
    high: price + 0.5,
    low: open - 0.5,
    close: price,
    volume: 1
  });
}

for(let i = 30; i < 60; i++){
  const open = price;
  price -= 4;
  rows.push({
    time: 1_700_000_000 + i * 60,
    open,
    high: open + 0.5,
    low: price - 0.5,
    close: price,
    volume: 1
  });
}

for(let i = 60; i < 90; i++){
  const open = price;
  price += 4;
  rows.push({
    time: 1_700_000_000 + i * 60,
    open,
    high: price + 0.5,
    low: open - 0.5,
    close: price,
    volume: 1
  });
}

return rows;
}

function valuedTimes(points){
  return (Array.isArray(points) ? points : [])
    .filter((p) => Number.isFinite(p?.value))
    .map((p) => p.time);
}

function hasTimeGap(times, barSec = 60){
  for(let i = 1; i < times.length; i++){
    if(times[i] - times[i - 1] > barSec){
      return true;
    }
  }
  return false;
}

test("splitSupertrendValuedSegments breaks a color at whitespace", () => {
  const points = [
    { time: 1, value: 10 },
    { time: 2, value: 11 },
    { time: 3 },
    { time: 4 },
    { time: 5, value: 20 },
    { time: 6, value: 21 }
  ];
  const segments = splitSupertrendValuedSegments(points);
  assert.equal(segments.length, 2);
  assert.deepEqual(segments[0].map((p) => p.time), [1, 2]);
  assert.deepEqual(segments[1].map((p) => p.time), [5, 6]);
});

test("Supertrend flip yields separate segments, not one polyline per color", () => {
  const candles = candlesWithFlips();
  const lines = buildSupertrendChartLineData(candles, candles, 10, 3);

  const upTimes = valuedTimes(lines.up);
  const downTimes = valuedTimes(lines.down);
  assert.ok(upTimes.length > 0, "up line has values");
  assert.ok(downTimes.length > 0, "down line has values");

  const upSegments = splitSupertrendValuedSegments(lines.up);
  const downSegments = splitSupertrendValuedSegments(lines.down);
  const totalSegments = upSegments.length + downSegments.length;

  assert.ok(
    totalSegments >= 3,
    `expected 3+ color segments after two flips, got up=${upSegments.length} down=${downSegments.length}`
  );

  assert.ok(
    hasTimeGap(upTimes) || hasTimeGap(downTimes),
    "at least one color has a time gap — LWC would draw a diagonal through candles if kept as one series"
  );

  for(const segment of [...upSegments, ...downSegments]){
    const times = segment.map((p) => p.time);
    assert.equal(hasTimeGap(times), false, "a painted segment must be contiguous");
  }
});
