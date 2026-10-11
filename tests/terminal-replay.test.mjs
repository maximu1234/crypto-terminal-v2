import assert from "node:assert/strict";
import test from "node:test";
import { candlesUpToTime } from "../js/terminal/terminal-replay.js";

const rows = [
  { time: 10, close: 1 },
  { time: 20, close: 2 },
  { time: 30, close: 3 }
];

test("replay cut keeps the clicked bar and hides later bars", () => {
  assert.deepEqual(
    candlesUpToTime(rows, 20).map((row) => row.time),
    [10, 20]
  );
});

test("replay without a cut shows the whole series", () => {
  assert.equal(candlesUpToTime(rows, null), rows);
  assert.equal(candlesUpToTime(rows, Number.NaN), rows);
});

test("older history prepended before the cut stays visible", () => {
  const extended = [{ time: 5, close: 0 }, ...rows];
  assert.deepEqual(
    candlesUpToTime(extended, 20).map((row) => row.time),
    [5, 10, 20]
  );
});
