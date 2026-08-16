/**
 * Paint filter hides only Supertrend-rejected entries.
 * Pending / timeout-cancel stay visible when the «Данные» panel is open.
 */
import assert from "node:assert/strict";
import test from "node:test";

import {
setAlgoPattern12PaintEntryFilter,
clearAlgoPattern12PaintEntryFilter,
applyAlgoPattern12PaintEntryFilter
} from "../js/algo-trading/pattern-12-scene-cache.js";

function sampleScene(){
  return {
    setups: [
      { side: "short", b4: 10, p4: 1.5, b1: 1, p1: 2, b2: 2, p2: 1.8, b3: 5, p3: 1.7 },
      { side: "short", b4: 20, p4: 1.4, b1: 11, p1: 2, b2: 12, p2: 1.8, b3: 15, p3: 1.6 },
      { side: "long", b4: 30, p4: 1.2, b1: 21, p1: 1, b2: 22, p2: 1.1, b3: 25, p3: 1.05 }
    ],
    pt4Marks: [
      { side: "short", bar: 10, price: 1.5, label: "Short" },
      { side: "short", bar: 20, price: 1.4, label: "Short" },
      { side: "long", bar: 30, price: 1.2, label: "Long" }
    ],
    pt4Dots: [
      { side: "short", bar: 10, price: 1.5 },
      { side: "short", bar: 20, price: 1.4 },
      { side: "long", bar: 30, price: 1.2 }
    ],
    patternLines: [],
    badges: []
  };
}

test("filters off: open panel keeps pending and cancelled setups", () => {
  clearAlgoPattern12PaintEntryFilter();
  const scene = sampleScene();

  setAlgoPattern12PaintEntryFilter(
    [{ type: "entry", side: "short", setupBar: 10, pt4: 1.5 }],
    {
      rawEvents: [
        { type: "entry", side: "short", setupBar: 10, pt4: 1.5 }
      ],
      pendingSetups: [
        { side: "short", b4: 20, p4: 1.4 }
      ]
    }
  );

  const painted = applyAlgoPattern12PaintEntryFilter(scene);
  assert.equal(painted.setups.length, 3);
  assert.equal(painted.pt4Marks.length, 3);

  clearAlgoPattern12PaintEntryFilter();
  const full = applyAlgoPattern12PaintEntryFilter(scene);
  assert.equal(full.setups.length, 3);
});

test("Supertrend reject hides only that entry, keeps pending", () => {
  clearAlgoPattern12PaintEntryFilter();
  const scene = sampleScene();

  setAlgoPattern12PaintEntryFilter(
    [{ type: "entry", side: "short", setupBar: 10, pt4: 1.5 }],
    {
      rawEvents: [
        { type: "entry", side: "short", setupBar: 10, pt4: 1.5 },
        { type: "entry", side: "long", setupBar: 30, pt4: 1.2 }
      ]
    }
  );

  const painted = applyAlgoPattern12PaintEntryFilter(scene);
  assert.deepEqual(
    painted.setups.map(s => s.b4).sort((a, b) => a - b),
    [10, 20]
  );
  assert.equal(painted.pt4Marks.length, 2);
  assert.ok(painted.pt4Marks.every(m => m.side === "short"));
  clearAlgoPattern12PaintEntryFilter();
});
