import test from "node:test";
import assert from "node:assert/strict";

import {
createDrawHitTester
} from "../js/drawings/draw-hit.js";

function mockHitDeps({
plotW = 800,
logScale = false,
p1xy = { x: 100, y: 200 },
p2xy = { x: 400, y: 100 },
priceToY = price=>500 - price * 2
}){

const p1 = { time: 1, price: 100 };
const p2 = { time: 2, price: 200 };

return {
deps: {
toXY(
pt
){

if(
!pt
){
return null;
}

if(
pt.time ===
1 &&
pt.price ===
100
){
return {
...p1xy
};
}

if(
pt.time ===
2 &&
pt.price ===
200
){
return {
...p2xy
};
}

return null;

},
getPlotWidth:()=>plotW,
series: {
priceToCoordinate: priceToY,
priceScale:()=>({
options:()=>({
mode: logScale
? 1
: 0
})
})
},
pointFromXY:(
x,
y
)=>({
time: x,
price: y
})
},
p1,
p2
};

}

test(
"hitTestTrendlineBody near segment",
()=>{

const {
deps
} =
mockHitDeps({
p1xy: { x: 0, y: 0 },
p2xy: { x: 100, y: 0 }
});

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "trendline",
p1: { time: 1, price: 100 },
p2: { time: 2, price: 200 }
};

assert.equal(
hit.hitTestTrendlineBody(
50,
2,
shape
),
true
);
assert.equal(
hit.hitTestTrendlineBody(
50,
50,
shape
),
false
);

}
);

test(
"hitTestFibBody wide span hits level row",
()=>{

const {
deps,
p1,
p2
} =
mockHitDeps({
p1xy: { x: 100, y: 100 },
p2xy: { x: 500, y: 300 },
priceToY: price=>400 - price
});

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "fib",
p1,
p2,
fibLevels: [
{ v: 0, enabled: true },
{ v: 0.5, enabled: true },
{ v: 1, enabled: true }
]
};

const midY =
400 - 150;

assert.equal(
hit.hitTestFibBody(
300,
midY,
shape
),
true
);

}
);

test(
"hitTestFibBody vertical anchors hit expanded level span",
()=>{

const {
deps,
p1,
p2
} =
mockHitDeps({
p1xy: { x: 320, y: 100 },
p2xy: { x: 320, y: 400 },
priceToY: price=>400 - price
});

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "fib",
p1,
p2,
fibLevels: [
{ v: 0, enabled: true },
{ v: 0.5, enabled: true },
{ v: 1, enabled: true }
]
};

const midY =
400 - 150;

assert.equal(
hit.hitTestFibBody(
320,
midY,
shape
),
true
);
assert.notEqual(
hit.fibBodyDist(
320,
midY,
shape
),
Infinity
);

}
);

test(
"hitTestFibBody does not hit beyond x span on wide fib",
()=>{

const {
deps,
p1,
p2
} =
mockHitDeps({
p1xy: { x: 200, y: 100 },
p2xy: { x: 400, y: 300 },
priceToY: price=>400 - price
});

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "fib",
p1,
p2,
fibLevels: [
{ v: 0.5, enabled: true }
]
};

const midY =
400 - 150;

assert.equal(
hit.hitTestFibBody(
50,
midY,
shape
),
false
);

}
);

test(
"hitTestHrayLine on horizontal ray",
()=>{

const {
deps
} =
mockHitDeps({});

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "hray",
time: 1,
price: 100
};

assert.equal(
hit.hitTestHrayLine(
400,
200,
shape
),
true
);
assert.equal(
hit.hitTestHrayLine(
400,
250,
shape
),
false
);
/* Left of anchor — ray does not extend. */
assert.equal(
hit.hitTestHrayLine(
50,
200,
shape
),
false
);

}
);

test(
"hitTestHrayLine on horizontal line spans full width",
()=>{

const {
deps
} =
mockHitDeps({});

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "hline",
time: 1,
price: 100
};

assert.equal(
hit.hitTestHrayLine(
400,
200,
shape
),
true
);
assert.equal(
hit.hitTestHrayLine(
50,
200,
shape
),
true
);
assert.equal(
hit.hitTestHrayLine(
400,
250,
shape
),
false
);

}
);

test(
"channelScreenGeometry and hitTestChannelBody",
()=>{

const deps = {
toXY(
pt
){

const map = {
p1: { x: 0, y: 0 },
p2: { x: 100, y: 0 },
p3: { x: 0, y: 50 }
};

return map[
pt.id
] ||
null;

},
getPlotWidth:()=>800,
series: {},
pointFromXY:(
x,
y
)=>({
time: x,
price: y
})
};

const hit =
createDrawHitTester(
deps
);

const shape = {
type: "channel",
p1: { id: "p1" },
p2: { id: "p2" },
p3: { id: "p3" }
};

const geom =
hit.channelScreenGeometry(
shape
);

assert.ok(
geom?.p4
);
assert.equal(
geom.p4.x,
100
);
assert.equal(
hit.hitTestChannelBody(
50,
2,
shape
),
true
);

}
);
