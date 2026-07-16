import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStandardFibTemplateSnapshot,
  listTemplatesForType
} from "../js/drawings/draw-templates.js";
import {
  DEFAULT_FIB_SPEC
} from "../js/drawings/constants.js";

test("standard fib template has 18 levels matching DEFAULT_FIB_SPEC slots", () => {
  const snap =
  buildStandardFibTemplateSnapshot();

  assert.equal(
    snap.fibShowTrendLine,
    false
  );
  assert.equal(
    snap.lineWidth,
    1
  );
  assert.equal(
    snap.fibLevels.length,
    DEFAULT_FIB_SPEC.length
  );
  assert.equal(
    snap.fibLevels.length,
    18
  );
});

test("standard fib template enables classic ratios", () => {
  const levels =
  buildStandardFibTemplateSnapshot().fibLevels;
  const enabled =
  levels.filter(
    row =>
    row.enabled
  ).map(
    row =>
    row.v
  );

  assert.deepEqual(
    enabled,
    [
      0,
      0.236,
      0.382,
      0.5,
      0.618,
      0.786,
      1,
      1.618,
      2.618,
      3.618
    ]
  );

  assert.equal(
    levels[
    0
    ].color,
    "#b49b40"
  );
  assert.equal(
    levels[
    1
    ].color,
    "#6b3539"
  );
  assert.equal(
    levels[
    3
    ].color,
    "#ffffff"
  );
  assert.equal(
    levels[
    11
    ].color,
    "#673180"
  );
  assert.equal(
    levels[
    0
    ].lineStyle,
    "solid"
  );
  assert.equal(
    levels[
    0
    ].fillBg,
    false
  );
});

test("listTemplatesForType fib includes built-in Standard Fib", () => {
  const list =
  listTemplatesForType(
    "fib"
  );
  const builtin =
  list.find(
    item =>
    item.builtin
  );

  assert.ok(
    builtin
  );
  assert.equal(
    builtin.name,
    "Стандартная фиба"
  );
});
