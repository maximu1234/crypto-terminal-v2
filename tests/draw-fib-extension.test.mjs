import test from "node:test";
import assert from "node:assert/strict";

import {
DEFAULT_FIB_SPEC,
DEFAULT_FIB_EXT_SPEC,
FIB_TREND_LINE_COLOR
} from "../js/drawings/constants.js";

import {
cloneDefaultFibExtRows,
cloneDefaultFibRows,
fibExtPriceAtRatio,
fibShapePriceAtRatio,
isFibExtType,
isFibType,
resolveFibTrendLineColor,
fibLevelDash,
buildDefaultFibToolStorage,
buildDefaultFibExtToolStorage
} from "../js/drawings/fib-spec.js";

import {
coordFieldsForType,
hasCoordSettings
} from "../js/drawings/draw-coords.js";

import {
fibSettingsHtml
} from "../js/drawings/draw-fib-settings.js";

import {
createDrawRenderer
} from "../js/drawings/draw-render.js";

const TV_EXT_RATIOS = [
0,
0.236,
0.382,
0.5,
0.618,
0.786,
1,
1.272,
1.414,
1.618,
2.618,
3.618,
4.236
];

test("retracement default spec stays distinct from extension", ()=>{

assert.equal(
DEFAULT_FIB_SPEC[1].v,
0.25
);
assert.equal(
DEFAULT_FIB_EXT_SPEC[1].v,
0.236
);
assert.notEqual(
DEFAULT_FIB_SPEC.length,
DEFAULT_FIB_EXT_SPEC.length
);

});

test("trend-based fib extension default ratios match TradingView", ()=>{

assert.deepEqual(
DEFAULT_FIB_EXT_SPEC.map(
row=>
row.v
),
TV_EXT_RATIOS
);

assert.ok(
DEFAULT_FIB_EXT_SPEC.every(
row=>
row.enabled ===
true
)
);

const rows =
cloneDefaultFibExtRows();

assert.equal(
rows.length,
TV_EXT_RATIOS.length
);
assert.equal(
cloneDefaultFibRows().length,
DEFAULT_FIB_SPEC.length
);

});

test("isFibType covers retracement and extension", ()=>{

assert.equal(
isFibType(
"fib"
),
true
);
assert.equal(
isFibType(
"fib-ext"
),
true
);
assert.equal(
isFibExtType(
"fib-ext"
),
true
);
assert.equal(
isFibExtType(
"fib"
),
false
);
assert.equal(
isFibType(
"channel"
),
false
);

});

test("fibExtPriceAtRatio linear: 0 is C, 1 is C+(B-A)", ()=>{

assert.equal(
fibExtPriceAtRatio(
100,
200,
150,
0,
false
),
150
);
assert.equal(
fibExtPriceAtRatio(
100,
200,
150,
1,
false
),
250
);
assert.equal(
fibExtPriceAtRatio(
100,
200,
150,
0.5,
false
),
200
);

});

test("fibExtPriceAtRatio log: C * (B/A)^ratio", ()=>{

assert.equal(
fibExtPriceAtRatio(
100,
200,
150,
0,
true
),
150
);
assert.equal(
fibExtPriceAtRatio(
100,
200,
150,
1,
true
),
300
);

const half =
fibExtPriceAtRatio(
100,
200,
150,
0.5,
true
);

assert.ok(
Math.abs(
half -
150 *
Math.sqrt(
2
)
) <
1e-10
);

});

test("fibShapePriceAtRatio uses extension anchors", ()=>{

const shape = {
type: "fib-ext",
p1: {
price: 100
},
p2: {
price: 200
},
p3: {
price: 150
}
};

assert.equal(
fibShapePriceAtRatio(
shape,
0,
false
),
150
);
assert.equal(
fibShapePriceAtRatio(
shape,
1,
false
),
250
);
assert.equal(
fibShapePriceAtRatio(
shape,
1,
true
),
300
);

});

test("fib-ext log and linear share C at 0 and diverge at other ratios", ()=>{

const a =
100;
const b =
200;
const c =
150;

assert.equal(
fibExtPriceAtRatio(
a,
b,
c,
0,
false
),
c
);
assert.equal(
fibExtPriceAtRatio(
a,
b,
c,
0,
true
),
c
);

const linear618 =
fibExtPriceAtRatio(
a,
b,
c,
0.618,
false
);
const log618 =
fibExtPriceAtRatio(
a,
b,
c,
0.618,
true
);

assert.equal(
linear618,
c + (b - a) * 0.618
);
assert.ok(
Math.abs(
log618 -
c * Math.pow(
b / a,
0.618
)
) <
1e-10
);
assert.notEqual(
linear618,
log618
);

const linear1618 =
fibExtPriceAtRatio(
a,
b,
c,
1.618,
false
);
const log1618 =
fibExtPriceAtRatio(
a,
b,
c,
1.618,
true
);

assert.equal(
linear1618,
c + (b - a) * 1.618
);
assert.ok(
Math.abs(
log1618 -
c * Math.pow(
b / a,
1.618
)
) <
1e-10
);
assert.notEqual(
linear1618,
log1618
);

});

test("fib-ext downtrend projects below C on both scales", ()=>{

const a =
200;
const b =
100;
const c =
150;

assert.equal(
fibExtPriceAtRatio(
a,
b,
c,
1,
false
),
50
);
assert.equal(
fibExtPriceAtRatio(
a,
b,
c,
1,
true
),
75
);
assert.ok(
fibExtPriceAtRatio(
a,
b,
c,
1.618,
false
) <
c
);
assert.ok(
fibExtPriceAtRatio(
a,
b,
c,
1.618,
true
) <
c
);

});

test("fib-ext log 1.0 move matches A-B distance in log pixel space", ()=>{

const a =
100;
const b =
200;
const c =
150;
const level1 =
fibExtPriceAtRatio(
a,
b,
c,
1,
true
);

function logY(
price
){
return 1000 - 120 * Math.log(
price
);
}

const ab =
Math.abs(
logY(
b
) -
logY(
a
)
);
const cTo1 =
Math.abs(
logY(
level1
) -
logY(
c
)
);

assert.ok(
Math.abs(
ab -
cTo1
) <
1e-10
);

});

test("fib-ext has three coordinate fields", ()=>{

assert.equal(
hasCoordSettings(
"fib-ext"
),
true
);

const fields =
coordFieldsForType(
"fib-ext"
);

assert.equal(
fields.length,
3
);
assert.equal(
fields[2].id,
"p3"
);
assert.equal(
fields[2].bar,
true
);
assert.equal(
coordFieldsForType(
"fib"
).length,
2
);

});

test("fib settings html marks extension tool", ()=>{

assert.match(
fibSettingsHtml(),
/data-fib-tool="fib"/
);
assert.match(
fibSettingsHtml(
"fib-ext"
),
/data-fib-tool="fib-ext"/
);

});

test("fib trend line color defaults to palette gray", ()=>{

assert.equal(
FIB_TREND_LINE_COLOR,
"#9ca3af"
);
assert.equal(
resolveFibTrendLineColor(),
"#9ca3af"
);
assert.equal(
resolveFibTrendLineColor(
"#ef4444"
),
"#ef4444"
);
assert.equal(
buildDefaultFibToolStorage().fibTrendLineColor,
"#9ca3af"
);
assert.equal(
buildDefaultFibExtToolStorage().fibTrendLineColor,
"#9ca3af"
);
assert.deepEqual(
fibLevelDash(
"dashed"
),
[8, 6]
);

});

function mockPlacementCtx(){

const strokes =
[];
const dashes =
[];

return {
strokes,
dashes,
strokeStyle:
"",
lineWidth:
1,
fillStyle:
"",
font:
"",
globalAlpha:
1,
setLineDash(
d
){
dashes.push(
[
...(
d ||
[]
)
]
);
},
beginPath(){},
moveTo(){},
lineTo(){},
stroke(){
strokes.push({
color:
this.strokeStyle,
width:
this.lineWidth
});
},
fillText(){},
save(){},
restore(){},
fillRect(){},
arc(){},
fill(){}
};

}

test("fib-ext first-segment preview uses dashed gray trend, not tool stroke", ()=>{

const ctx =
mockPlacementCtx();
const renderer =
createDrawRenderer({
toXY:
p=>
p &&
Number.isFinite(
p.x
) &&
Number.isFinite(
p.y
)
? {
x: p.x,
y: p.y
}
: null,
plotPriceToCoordinate:
()=>
0,
series:
{},
shapeStyle:
()=>({
color:
"#3b82f6",
width:
1,
dash:
[]
}),
drawPosition:
()=>{},
baseDefaultStyle:
()=>({
color:
"#3b82f6",
lineWidth:
1,
fibLevels:
[],
fibShowTrendLine:
true,
fibTrendLineColor:
FIB_TREND_LINE_COLOR
}),
defaultPositionP2:
()=>
null,
initialPositionTpSl:
()=>({}),
pointFromXY:
(
x,
y
)=>({
time:
1,
price:
1,
x,
y
}),
drawAnchorCircle:
()=>{},
drawPositionAnchor:
()=>{},
getPositionHandleScreens:
()=>[],
getPlacement:
()=>({
type:
"fib-ext",
points:[
{
time:
1,
price:
2,
x:
10,
y:
20
}
]
}),
getPreviewPoint:
()=>({
time:
2,
price:
1,
x:
10,
y:
80
}),
getPreviewXY:
()=>({
x:
10,
y:
80
}),
getSelectedId:
()=>
null,
parseDrawColor:
()=>
null,
formatDrawColor:
c=>
c,
getCandles:
()=>[]
});

renderer.drawPlacementPreview(
ctx,
400,
300
);

assert.ok(
ctx.strokes.length >=
1
);
assert.ok(
ctx.strokes.every(
s=>
s.color ===
FIB_TREND_LINE_COLOR
)
);
assert.ok(
ctx.dashes.some(
d=>
d.length ===
2 &&
d[0] ===
8 &&
d[1] ===
6
)
);

});
