import test from "node:test";
import assert from "node:assert/strict";

import {
layoutFvpRows,
computeFvpValueArea,
accumulateFvpVolume,
isFvpUpBar,
pickFvpLowerTf,
fvpTimeRange,
formatFvpVolume,
createFvpToolDefaults,
migrateFvpToolDefaults,
normalizeFvpShape,
copyFvpStyleToShape
} from "../js/drawings/fixed-volume-profile.js";

test("number of rows: 100 ticks / 25 → 4 ticks per row, 25 rows", ()=>{

const layout =
layoutFvpRows({
high: 11,
low: 10,
tickSize: 0.01,
rowsLayout: "numberOfRows",
rowSize: 25
});

assert.equal(layout.totalTicks, 100);
assert.equal(layout.ticksPerRow, 4);
assert.equal(layout.rows.length, 25);

});

test("number of rows: 100 ticks / 30 rounds to 3 ticks and 34 rows", ()=>{

const layout =
layoutFvpRows({
high: 11,
low: 10,
tickSize: 0.01,
rowsLayout: "numberOfRows",
rowSize: 30
});

assert.equal(layout.totalTicks, 100);
assert.equal(layout.ticksPerRow, 3);
assert.equal(layout.rows.length, 34);
assert.ok(
Math.abs(
layout.rows[layout.rows.length - 1].high -
layout.rows[layout.rows.length - 1].low -
0.01
) <
1e-9
);

});

test("ticks per row: 200-300 at 0.01 / 25 → 400 rows", ()=>{

const layout =
layoutFvpRows({
high: 300,
low: 200,
tickSize: 0.01,
rowsLayout: "ticksPerRow",
rowSize: 25
});

assert.equal(layout.ticksPerRow, 25);
assert.equal(layout.rows.length, 400);

});

test("FRVP up bar uses close > open", ()=>{

assert.equal(
isFvpUpBar({ open: 10, close: 10.1 }),
true
);
assert.equal(
isFvpUpBar({ open: 10, close: 10 }),
false
);
assert.equal(
isFvpUpBar({ open: 10, close: 9.9 }),
false
);

});

test("volume goes to the close row; reverse time order still valid", ()=>{

const layout =
layoutFvpRows({
high: 12,
low: 10,
tickSize: 0.5,
rowsLayout: "ticksPerRow",
rowSize: 1
});

const total =
accumulateFvpVolume(
layout.rows,
[
{ open: 10, close: 10.1, high: 10.2, low: 10, volume: 5 },
{ open: 11.8, close: 11.7, high: 11.9, low: 11.6, volume: 7 }
]
);

assert.equal(total, 12);
assert.equal(layout.rows[0].up, 5);
assert.equal(layout.rows[layout.rows.length - 1].down, 7);

const range =
fvpTimeRange(
{
p1: { time: 50, price: 1 },
p2: { time: 10, price: 1 }
},
50
);

assert.equal(range.tLeft, 10);
assert.equal(range.tRightAnchor, 50);
assert.equal(range.valid, true);

});

test("value area expands from POC toward 70%", ()=>{

const rows =
[2, 4, 10, 3, 1].map(
(total, i)=>({
low: i,
high: i + 1,
mid: i + 0.5,
up: total,
down: 0,
total,
inVA: false
})
);
const va =
computeFvpValueArea(
rows,
70,
20
);

assert.equal(va.pocIndex, 2);
assert.equal(va.vaLowIndex, 1);
assert.equal(va.vaHighIndex, 2);
assert.equal(rows.filter(row=>row.inVA).reduce((s, row)=>s + row.total, 0), 14);

});

test("lower timeframe picker follows TV 5000-bar cap", ()=>{

const weekMs =
7 *
24 *
60 *
60 *
1000;

assert.equal(
pickFvpLowerTf(weekMs, "D"),
"5"
);
assert.equal(
pickFvpLowerTf(4 * 60 * 1000, "60"),
"1"
);
assert.equal(
pickFvpLowerTf(60 * 60 * 1000, "60"),
"1"
);

});

test("defaults and normalize match TradingView FRVP drawing", ()=>{

const defaults =
createFvpToolDefaults();

assert.equal(defaults.rowsLayout, "numberOfRows");
assert.equal(defaults.rowSize, 24);
assert.equal(defaults.volumeMode, "upDown");
assert.equal(defaults.vaPercent, 70);
assert.equal(defaults.extendRight, false);
assert.equal(defaults.showPoc, true);
assert.equal(defaults.pocColor, "#ffffff");
assert.equal(defaults.showVah, false);
assert.equal(defaults.showVal, false);
assert.equal(defaults.showDevelopingPoc, false);
assert.equal(defaults.showDevelopingVa, false);
assert.equal(defaults.showHistogramBox, true);
assert.equal(defaults.widthPercent, 30);
assert.equal(defaults.placement, "left");

const shape =
{
type: "fvp",
p1: { time: 1, price: 1 },
p2: { time: 2, price: 2 }
};

normalizeFvpShape(shape);
copyFvpStyleToShape(shape, defaults);
assert.equal(shape.rowSize, 24);
assert.equal(shape.showProfile, true);
assert.equal(shape.placement, "left");
assert.equal(shape.pocColor, "#ffffff");

});

test("v2 defaults migrate 100% width to 30% and keep left placement", ()=>{

const migrated =
migrateFvpToolDefaults({
fvpDefaultsVersion: 2,
placement: "right",
widthPercent: 100,
rowSize: 24
});

assert.equal(migrated.placement, "left");
assert.equal(migrated.widthPercent, 30);
assert.equal(migrated.rowSize, 24);

const customWidth =
migrateFvpToolDefaults({
fvpDefaultsVersion: 2,
widthPercent: 50
});

assert.equal(customWidth.widthPercent, 50);

const shape =
{
type: "fvp",
fvpDefaultsVersion: 2,
placement: "right",
widthPercent: 100,
p1: { time: 1, price: 1 },
p2: { time: 2, price: 2 }
};

normalizeFvpShape(shape);
assert.equal(shape.placement, "left");
assert.equal(shape.widthPercent, 30);

});

test("v1 defaults migrate to left placement and white POC", ()=>{

const migrated =
migrateFvpToolDefaults({
fvpDefaultsVersion: 1,
placement: "right",
pocColor: "#2962ff",
rowSize: 24
});

assert.equal(migrated.placement, "left");
assert.equal(migrated.pocColor, "#ffffff");
assert.equal(migrated.rowSize, 24);

const shape =
{
type: "fvp",
fvpDefaultsVersion: 1,
placement: "right",
pocColor: "#2962ff",
p1: { time: 1, price: 1 },
p2: { time: 2, price: 2 }
};

normalizeFvpShape(shape);
assert.equal(shape.placement, "left");
assert.equal(shape.pocColor, "#ffffff");

});

test("volume labels use compact TradingView-style units", ()=>{

assert.equal(formatFvpVolume(12400), "12.4K");
assert.equal(formatFvpVolume(1_200_000), "1.2M");
assert.equal(formatFvpVolume(8), "8");

});

test("toolbar icon data includes Fixed Volume Profile", async ()=>{

const {
DRAW_TOOL_ICON_DATA
} =
await import(
"../js/draw-toolbar-icon-data.js"
);

assert.ok(
String(
DRAW_TOOL_ICON_DATA["fixed-volume-profile"] ||
""
).startsWith(
"data:image/png;base64,"
)
);

});
