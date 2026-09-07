import test from "node:test";
import assert from "node:assert/strict";

import {
applyCoordFieldToShape,
barIndexFromTime,
coordFieldsForType,
formatCoordPrice,
hasCoordSettings,
parseCoordBar,
parseCoordNumber,
readShapeCoordPoint,
timeFromBarIndex
} from "../js/drawings/draw-coords.js";

import {
coordSettingsHtml,
drawSettingsTabsHtml
} from "../js/drawings/draw-coord-settings.js";

const candles = [
{ time: 1_000, close: 10 },
{ time: 1_060, close: 11 },
{ time: 1_120, close: 12 },
{ time: 1_180, close: 13 }
];

test("coord settings exist for lines, fib, channel, rect, positions", ()=>{

for(
const type of
[
"trendline",
"hline",
"hray",
"arrow",
"rectangle",
"fib",
"channel",
"long",
"short"
]
){
assert.equal(
hasCoordSettings(
type
),
true,
type
);
}

});

test("coord settings skip brush, elliott, text and volume profile", ()=>{

for(
const type of
[
"brush",
"text",
"fvp",
"elliott-impulse",
"elliott-correction"
]
){
assert.equal(
hasCoordSettings(
type
),
false,
type
);
}

});

test("hline coordinates are price-only", ()=>{

const fields =
coordFieldsForType(
"hline"
);

assert.equal(
fields.length,
1
);
assert.equal(
fields[0].price,
true
);
assert.equal(
fields[0].bar,
false
);

});

test("trendline has two price+bar points", ()=>{

const fields =
coordFieldsForType(
"trendline"
);

assert.equal(
fields.length,
2
);
assert.equal(
fields[1].id,
"p2"
);
assert.equal(
fields[1].bar,
true
);

});

test("bar index maps to candle time and back", ()=>{

assert.equal(
barIndexFromTime(
candles,
1_120,
"1"
),
2
);
assert.equal(
timeFromBarIndex(
candles,
2,
"1"
),
1_120
);

});

test("bar index extrapolates past the last candle", ()=>{

assert.equal(
timeFromBarIndex(
candles,
5,
"1"
),
1_180 +
2 *
60
);
assert.equal(
barIndexFromTime(
candles,
1_180 +
120,
"1"
),
5
);

});

test("parseCoordNumber accepts comma decimals", ()=>{

assert.equal(
parseCoordNumber(
"7,63"
),
7.63
);
assert.equal(
parseCoordBar(
"98.4"
),
98
);

});

test("formatCoordPrice trims trailing zeros", ()=>{

assert.equal(
formatCoordPrice(
7.63
),
"7.63"
);

});

test("apply hline price leaves the bar/time unchanged", ()=>{

const shape = {
type: "hline",
time: 1_120,
price: 7
};

assert.equal(
applyCoordFieldToShape(
shape,
"anchor",
"price",
"7.63",
candles,
"1"
),
true
);
assert.equal(
shape.price,
7.63
);
assert.equal(
shape.time,
1_120
);

});

test("apply trendline bar moves that point to the candle time", ()=>{

const shape = {
type: "trendline",
p1: { time: 1_000, price: 10 },
p2: { time: 1_180, price: 13 }
};

assert.equal(
applyCoordFieldToShape(
shape,
"p1",
"bar",
"2",
candles,
"1"
),
true
);
assert.equal(
shape.p1.time,
1_120
);
assert.equal(
shape.p1.price,
10
);
assert.equal(
shape.p2.time,
1_180
);

});

test("position entry price updates both anchors", ()=>{

const shape = {
type: "long",
p1: { time: 1_000, price: 10 },
p2: { time: 1_180, price: 10 },
tpPrice: 12,
slPrice: 9
};

assert.equal(
applyCoordFieldToShape(
shape,
"entry",
"price",
"10.5",
candles,
"1"
),
true
);
assert.equal(
shape.p1.price,
10.5
);
assert.equal(
shape.p2.price,
10.5
);
assert.equal(
readShapeCoordPoint(
shape,
"tp"
).price,
12
);

});

test("coordSettingsHtml matches TV labels and skips bar on hline", ()=>{

const hline =
coordSettingsHtml(
"hline"
);
const trend =
coordSettingsHtml(
"trendline"
);

assert.match(
hline,
/#1 \(price\)/
);
assert.equal(
hline.includes(
"data-coord-kind=\"bar\""
),
false
);
assert.match(
trend,
/#1 \(price, bar\)/
);
assert.match(
trend,
/#2 \(price, bar\)/
);
assert.equal(
coordSettingsHtml(
"brush"
),
""
);

});

test("style settings wrap into Style and Coordinates tabs", ()=>{

const html =
drawSettingsTabsHtml({
styleHtml: `<div class="rect-settings"></div>`,
coordsHtml: coordSettingsHtml(
"rectangle"
)
});

assert.match(
html,
/data-draw-settings-tab="style"/
);
assert.match(
html,
/data-draw-settings-tab="coords"/
);
assert.match(
html,
/class="rect-settings"/
);
assert.match(
html,
/class="draw-coord-settings"/
);

});
