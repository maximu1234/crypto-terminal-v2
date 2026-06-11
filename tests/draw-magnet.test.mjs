import test from "node:test";
import assert from "node:assert/strict";

import {
findCandleNearestTime,
snapPlotToCandleWick
} from "../js/drawings/draw-magnet.js";

const candles = [
{ time: 100, open: 10, high: 12, low: 9, close: 11 },
{ time: 200, open: 11, high: 15, low: 10, close: 14 },
{ time: 300, open: 14, high: 16, low: 13, close: 13.5 }
];

test(
"findCandleNearestTime picks nearest bar",
()=>{

assert.equal(
findCandleNearestTime(
candles,
200
).time,
200
);

assert.equal(
findCandleNearestTime(
candles,
240
).time,
200
);

assert.equal(
findCandleNearestTime(
candles,
260
).time,
300
);

assert.equal(
findCandleNearestTime(
candles,
50
).time,
100
);

assert.equal(
findCandleNearestTime(
candles,
500
).time,
300
);

}
);

test(
"snapPlotToCandleWick snaps to high or low by plot distance",
()=>{

const timeFromX = x=>
x <
150
? 100
:200;

const xFromTime = t=>
t ===
100
? 50
:150;

const priceToPlotY = price=>
price ===
12
? 20
:price ===
15
? 40
:80;

const highSnap =
snapPlotToCandleWick({
plotX: 160,
plotY: 35,
candles,
timeFromX,
xFromTime,
priceToPlotY
});

assert.equal(
highSnap.time,
200
);
assert.equal(
highSnap.price,
15
);
assert.equal(
highSnap.y,
40
);
assert.equal(
highSnap.x,
150
);

const lowSnap =
snapPlotToCandleWick({
plotX: 160,
plotY: 70,
candles,
timeFromX,
xFromTime,
priceToPlotY
});

assert.equal(
lowSnap.price,
10
);
assert.equal(
lowSnap.y,
80
);

}
);
