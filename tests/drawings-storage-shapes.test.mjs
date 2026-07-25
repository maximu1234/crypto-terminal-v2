import test from "node:test";
import assert from "node:assert/strict";

test(
"mergeShapeLists keeps newer arrow and rectangle by updatedAt",
async()=>{

const {
mergeShapeLists,
getShapeRevisionTime
} =
await import(
"../js/drawings-storage.js"
);

const arrowLocal =
{
id: "d_100_arrow",
type: "arrow",
color: "#ffffff",
lineWidth: 1,
p1: { time: 10, price: 100 },
p2: { time: 20, price: 110 },
updatedAt: 2000
};

const arrowCloud =
{
...arrowLocal,
color: "#ff0000",
updatedAt: 3000
};

const mergedArrow =
mergeShapeLists(
[arrowLocal],
[arrowCloud]
);

assert.equal(
mergedArrow.length,
1
);
assert.equal(
mergedArrow[0].color,
"#ff0000"
);
assert.equal(
getShapeRevisionTime(
mergedArrow[0]
),
3000
);

const rectLocal =
{
id: "d_100_rect",
type: "rectangle",
color: "#ffffff",
lineWidth: 1,
p1: { time: 10, price: 100 },
p2: { time: 20, price: 90 },
showFill: true,
fillColor: "#f97316",
fillOpacity: 0.25,
showMedian: true,
medianColor: "#888888",
updatedAt: 5000
};

const rectCloud =
{
...rectLocal,
showMedian: false,
fillOpacity: 0.5,
updatedAt: 4000
};

const mergedRect =
mergeShapeLists(
[rectLocal],
[rectCloud]
);

assert.equal(
mergedRect.length,
1
);
assert.equal(
mergedRect[0].showMedian,
true
);
assert.equal(
mergedRect[0].fillOpacity,
0.25
);

}
);

test(
"mergeDrawingsPayload merges arrow and rectangle per symbol",
async()=>{

const {
mergeDrawingsPayload
} =
await import(
"../js/drawings-storage.js"
);

const local =
{
BTC: [
{
id: "a1",
type: "arrow",
updatedAt: 100,
p1: { time: 1, price: 1 },
p2: { time: 2, price: 2 }
}
]
};

const cloud =
{
BTC: [
{
id: "r1",
type: "rectangle",
updatedAt: 200,
p1: { time: 3, price: 3 },
p2: { time: 4, price: 4 },
showFill: true,
fillColor: "#f97316",
fillOpacity: 0.25
}
]
};

const merged =
mergeDrawingsPayload(
local,
cloud,
{},
{}
);

assert.equal(
merged.shapes.BTC.length,
2
);
assert.ok(
merged.shapes.BTC.some(
s=>
s.type ===
"arrow"
)
);
assert.ok(
merged.shapes.BTC.some(
s=>
s.type ===
"rectangle"
)
);

}
);
