import test from "node:test";
import assert from "node:assert/strict";

import {
ELLIOTT_DEFAULT_COLOR,
ELLIOTT_DEFAULT_DEGREE,
ELLIOTT_CORRECTION,
ELLIOTT_DOUBLE,
ELLIOTT_IMPULSE,
ELLIOTT_TOOL_META,
ELLIOTT_WAVE_TYPES,
ELLIOTT_TOOL_TYPES,
ELLIOTT_TRIANGLE,
ELLIOTT_TRIPLE,
PATTERN_12,
PATTERN_12_TP_DEFAULT_LEVELS,
PATTERN_DASH_DEFAULT_OPACITY,
PATTERN_DOUBLE_TB,
PATTERN_HS,
createElliottToolDefaults,
elliottDisplayLabels,
elliottLabelForVertex,
elliottNecklineScreen,
elliottPointCount,
elliottUsesCircleWrap,
elliottSelectionHandlePoints,
elliottVertexLabel,
formatPattern12TpLabel,
getElliottPoints,
isElliottType,
isElliottWaveType,
isPattern12Draw,
isPatternHsFamily,
migrateElliottToolDefaults,
normalizeElliottDegree,
normalizeElliottShape,
normalizePattern12TpFlags,
normalizePattern12TpLevels,
normalizePatternDashOpacity,
parsePattern12TpLevel,
pattern12DashScreen,
pattern12TpEntries,
pattern12TpPrice,
pattern12TpTickLayout,
setElliottPoints
} from "../js/drawings/elliott-spec.js";

test("elliott subtypes and click counts", ()=>{

assert.deepEqual(
ELLIOTT_WAVE_TYPES,
[
ELLIOTT_IMPULSE,
ELLIOTT_CORRECTION,
ELLIOTT_TRIANGLE,
ELLIOTT_DOUBLE,
ELLIOTT_TRIPLE
]
);
assert.equal(
ELLIOTT_TOOL_TYPES.includes(
PATTERN_HS
),
true
);

assert.equal(
elliottPointCount(
ELLIOTT_IMPULSE
),
6
);
assert.equal(
elliottPointCount(
ELLIOTT_CORRECTION
),
4
);
assert.equal(
elliottPointCount(
ELLIOTT_TRIANGLE
),
6
);
assert.equal(
elliottPointCount(
ELLIOTT_DOUBLE
),
4
);
assert.equal(
elliottPointCount(
ELLIOTT_TRIPLE
),
6
);

});

test("elliott defaults are blue and Submicro", ()=>{

const defaults =
createElliottToolDefaults();

assert.equal(
defaults.color,
ELLIOTT_DEFAULT_COLOR
);
assert.equal(
defaults.degree,
ELLIOTT_DEFAULT_DEGREE
);
assert.equal(
defaults.degree,
"submicro"
);
assert.equal(
defaults.showWave,
true
);
assert.equal(
defaults.lineWidth,
1
);

ELLIOTT_TOOL_TYPES.forEach(
type=>{
assert.equal(
isElliottType(
type
),
true
);
}
);

assert.equal(
isElliottType(
"trendline"
),
false
);

});

test("submicro impulse labels are parentheses like TradingView", ()=>{

assert.equal(
normalizeElliottDegree(
"nope"
),
"submicro"
);

assert.equal(
elliottUsesCircleWrap(
"submicro"
),
false
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"submicro"
),
[
"(1)",
"(2)",
"(3)",
"(4)",
"(5)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_CORRECTION,
"submicro"
),
[
"(A)",
"(B)",
"(C)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"micro"
),
[
"1",
"2",
"3",
"4",
"5"
]
);
assert.equal(
elliottUsesCircleWrap(
"micro"
),
true
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"minuette"
),
[
"(i)",
"(ii)",
"(iii)",
"(iv)",
"(v)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_CORRECTION,
"minuette"
),
[
"(a)",
"(b)",
"(c)"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_TRIPLE,
"minor"
),
[
"W",
"X",
"Y",
"X",
"Z"
]
);

assert.deepEqual(
elliottDisplayLabels(
ELLIOTT_IMPULSE,
"grand-supercycle"
),
[
"I",
"II",
"III",
"IV",
"V"
]
);
assert.equal(
elliottUsesCircleWrap(
"grand-supercycle"
),
true
);

assert.equal(
elliottLabelForVertex(
ELLIOTT_IMPULSE,
"submicro",
0
),
""
);
assert.equal(
elliottLabelForVertex(
ELLIOTT_IMPULSE,
"submicro",
1
),
"(1)"
);
assert.equal(
elliottLabelForVertex(
ELLIOTT_IMPULSE,
"submicro",
5
),
"(5)"
);
assert.equal(
elliottLabelForVertex(
ELLIOTT_CORRECTION,
"submicro",
1
),
"(A)"
);

});

test("normalize elliott shape fills missing style", ()=>{

const shape =
normalizeElliottShape({
type: ELLIOTT_IMPULSE,
points: [
{ time: 1, price: 10 },
{ time: 2, price: 12 },
{ time: 3, price: 11 },
{ time: 4, price: 14 },
{ time: 5, price: 16 },
{ time: 6, price: 18 }
]
});

assert.equal(
shape.color,
ELLIOTT_DEFAULT_COLOR
);
assert.equal(
shape.degree,
"submicro"
);
assert.equal(
shape.showWave,
true
);
assert.equal(
getElliottPoints(
shape
).length,
6
);

});

test("migrate elliott defaults rejects bad width", ()=>{

const migrated =
migrateElliottToolDefaults({
color: "#fff",
lineWidth: 99,
degree: "minute",
showWave: false
});

assert.equal(
migrated.color,
"#fff"
);
assert.equal(
migrated.lineWidth,
4
);
assert.equal(
migrated.degree,
"minute"
);
assert.equal(
migrated.showWave,
false
);

});

test("setElliottPoints mirrors p1/p2", ()=>{

const shape =
{
type: ELLIOTT_CORRECTION
};

setElliottPoints(
shape,
[
{ time: 1, price: 1 },
{ time: 2, price: 2 },
{ time: 3, price: 3 }
]
);

assert.equal(
shape.p1.time,
1
);
assert.equal(
shape.p2.time,
3
);

});

test("selection handles include every vertex", ()=>{

const shape =
{
type: ELLIOTT_IMPULSE
};

setElliottPoints(
shape,
[
{ time: 1, price: 10 },
{ time: 2, price: 12 },
{ time: 3, price: 11 },
{ time: 4, price: 14 },
{ time: 5, price: 13 },
{ time: 6, price: 16 }
]
);

const handles =
elliottSelectionHandlePoints(
shape
);

assert.equal(
handles.length,
6
);
assert.equal(
handles[0].time,
1
);
assert.equal(
handles[2].time,
3
);
assert.equal(
handles[5].time,
6
);

});

test("head and shoulders uses 7 clicks and short labels", ()=>{

assert.equal(
elliottPointCount(
PATTERN_HS
),
7
);
assert.equal(
elliottPointCount(
PATTERN_DOUBLE_TB
),
5
);
assert.equal(
isPatternHsFamily(
PATTERN_HS
),
true
);
assert.equal(
isElliottWaveType(
PATTERN_HS
),
false
);

const hs =
normalizeElliottShape({
type: PATTERN_HS,
points: [
{ time: 1, price: 10 },
{ time: 2, price: 14 },
{ time: 3, price: 11 },
{ time: 4, price: 16 },
{ time: 5, price: 11.2 },
{ time: 6, price: 13.5 },
{ time: 7, price: 10.5 }
]
});

assert.equal(
elliottVertexLabel(
hs,
1
).text,
"LS"
);
assert.equal(
elliottVertexLabel(
hs,
3
).text,
"H"
);
assert.equal(
elliottVertexLabel(
hs,
5
).text,
"RS"
);
assert.equal(
elliottVertexLabel(
hs,
2
).text,
""
);

const neck =
elliottNecklineScreen(
PATTERN_HS,
[
{ x: 0, y: 40 },
{ x: 10, y: 10 },
{ x: 20, y: 30 },
{ x: 30, y: 0 },
{ x: 40, y: 32 },
{ x: 50, y: 14 },
{ x: 60, y: 38 }
]
);

assert.equal(
!!neck,
true
);
assert.equal(
neck.a.x,
0
);
assert.equal(
neck.b.x,
60
);

});

test("double top/bottom labels D1 D2 and a horizontal neckline", ()=>{

assert.equal(
elliottLabelForVertex(
PATTERN_DOUBLE_TB,
"submicro",
1
),
"D1"
);
assert.equal(
elliottLabelForVertex(
PATTERN_DOUBLE_TB,
"submicro",
3
),
"D2"
);

const neck =
elliottNecklineScreen(
PATTERN_DOUBLE_TB,
[
{ x: 0, y: 20 },
{ x: 10, y: 0 },
{ x: 20, y: 18 },
{ x: 30, y: 1 },
{ x: 40, y: 22 }
]
);

assert.equal(
neck.a.y,
18
);
assert.equal(
neck.b.y,
18
);
assert.equal(
neck.a.x,
0
);
assert.equal(
neck.b.x,
40
);

});

test("pattern 1-2 uses two degrees and a 1 to (1) dash", ()=>{

assert.equal(
elliottPointCount(
PATTERN_12
),
6
);
assert.equal(
isPattern12Draw(
PATTERN_12
),
true
);

const defaults =
createElliottToolDefaults({
type: PATTERN_12
});

assert.equal(
defaults.degree,
"micro"
);
assert.equal(
defaults.degreeJunior,
"submicro"
);
assert.equal(
defaults.showPatternDash,
true
);
assert.equal(
defaults.patternDashOpacity,
PATTERN_DASH_DEFAULT_OPACITY
);

const shape =
normalizeElliottShape({
type: PATTERN_12,
degree: "micro",
degreeJunior: "submicro",
points: [
{ time: 1, price: 10 },
{ time: 2, price: 14 },
{ time: 3, price: 11 },
{ time: 4, price: 13 },
{ time: 5, price: 12 },
{ time: 6, price: 16 }
]
});

assert.equal(
elliottVertexLabel(
shape,
1
).text,
"1"
);
assert.equal(
elliottVertexLabel(
shape,
1
).circled,
true
);
assert.equal(
elliottVertexLabel(
shape,
2
).text,
"2"
);
assert.equal(
elliottVertexLabel(
shape,
3
).text,
"(1)"
);
assert.equal(
elliottVertexLabel(
shape,
3
).circled,
false
);
assert.equal(
elliottVertexLabel(
shape,
5
).text,
"(3)"
);

const dash =
pattern12DashScreen(
[
{ x: 0, y: 40 },
{ x: 10, y: 8 },
{ x: 20, y: 30 },
{ x: 40, y: 16 },
{ x: 50, y: 24 },
{ x: 80, y: 4 }
]
);

assert.equal(
dash.a.x,
10
);
assert.ok(
dash.b.x >
40
);

});

test("pattern 1-2 keeps a custom color through normalize and migrate", ()=>{

const color =
"#f19d38";

assert.equal(
normalizeElliottShape({
type: PATTERN_12,
color,
points: [
{ time: 1, price: 10 },
{ time: 2, price: 14 },
{ time: 3, price: 11 },
{ time: 4, price: 13 },
{ time: 5, price: 12 },
{ time: 6, price: 16 }
]
}).color,
color
);

assert.equal(
migrateElliottToolDefaults(
{
color,
lineWidth: 2
},
PATTERN_12
).color,
color
);

assert.equal(
createElliottToolDefaults({
type: PATTERN_12,
color
}).color,
color
);

});

test("pattern 1-2 style snapshot keeps a custom color", async ()=>{

const {
extractStyleSnapshot
} =
await import(
"../js/drawings/draw-templates.js"
);

assert.equal(
extractStyleSnapshot(
{
type: PATTERN_12,
color: "#ef4444",
lineWidth: 2,
degree: "micro"
},
PATTERN_12
).color,
"#ef4444"
);

});

test("pattern 1-2 color default payload keeps toolbar color when shape extras are merged", ()=>{

const prev =
migrateElliottToolDefaults(
{
color: "#ffffff"
},
PATTERN_12
);
const style =
{
color: "#df484c",
lineWidth: 2
};
const primaryTarget =
{
degree: "minute",
degreeJunior: "submicro"
};
const defaultsPayload =
{
color: style.color,
lineWidth: style.lineWidth
};

Object.assign(
defaultsPayload,
{
degree:
primaryTarget?.degree ||
prev.degree,
degreeJunior:
primaryTarget?.degreeJunior ||
prev.degreeJunior
}
);

assert.equal(
defaultsPayload.color,
"#df484c"
);
assert.equal(
defaultsPayload.degree,
"minute"
);

});

test("pattern 1-2 dash opacity clamps to 0-100 and defaults to 40", ()=>{

assert.equal(
normalizePatternDashOpacity(),
PATTERN_DASH_DEFAULT_OPACITY
);
assert.equal(
normalizePatternDashOpacity(
"nope"
),
PATTERN_DASH_DEFAULT_OPACITY
);
assert.equal(
normalizePatternDashOpacity(
-8
),
0
);
assert.equal(
normalizePatternDashOpacity(
140
),
100
);
assert.equal(
normalizePatternDashOpacity(
37.4
),
37
);

assert.equal(
migrateElliottToolDefaults(
{
color: "#ffffff"
},
PATTERN_12
).patternDashOpacity,
PATTERN_DASH_DEFAULT_OPACITY
);
assert.equal(
migrateElliottToolDefaults(
{
patternDashOpacity: 25
},
PATTERN_12
).patternDashOpacity,
25
);

assert.equal(
normalizeElliottShape({
type: PATTERN_12,
points: [
{ time: 1, price: 10 },
{ time: 2, price: 14 },
{ time: 3, price: 11 },
{ time: 4, price: 13 },
{ time: 5, price: 12 },
{ time: 6, price: 16 }
]
}).patternDashOpacity,
PATTERN_DASH_DEFAULT_OPACITY
);

});

test("pattern 1-2-1-2-3 take profit uses five fib levels on senior 0-1 and junior 2-1", async ()=>{

assert.equal(
ELLIOTT_TOOL_META[
PATTERN_12
].title,
"Pattern 1-2-1-2-3 (1·2 · 1·2·3) (P)"
);

assert.deepEqual(
PATTERN_12_TP_DEFAULT_LEVELS,
[
1,
1.5,
2,
2.44,
2.5
]
);
assert.equal(
parsePattern12TpLevel(
"1,5"
),
1.5
);
assert.equal(
formatPattern12TpLabel(
2.44
),
"2.44"
);

const defaults =
createElliottToolDefaults({
type: PATTERN_12
});

assert.equal(
defaults.showTpSenior,
false
);
assert.equal(
defaults.showTpJunior,
true
);
assert.deepEqual(
defaults.tpLevels,
[
1,
1.5,
2,
2.44,
2.5
]
);

const shape =
normalizeElliottShape({
type: PATTERN_12,
points: [
{ time: 1, price: 10 },
{ time: 2, price: 14 },
{ time: 3, price: 11 },
{ time: 4, price: 13 },
{ time: 5, price: 12 },
{ time: 6, price: 16 }
]
});

assert.equal(
pattern12TpPrice(
shape.points[0],
shape.points[1],
1
),
14
);
assert.equal(
pattern12TpPrice(
shape.points[0],
shape.points[1],
2
),
18
);
assert.equal(
pattern12TpPrice(
shape.points[2],
shape.points[3],
1
),
13
);
assert.equal(
pattern12TpPrice(
shape.points[0],
shape.points[1],
0
),
null
);
assert.equal(
pattern12TpPrice(
shape.points[0],
shape.points[1],
2,
false
),
18
);
assert.equal(
pattern12TpPrice(
shape.points[0],
shape.points[1],
1,
true
),
14
);
assert.equal(
pattern12TpPrice(
shape.points[0],
shape.points[1],
2,
true
),
10 *
Math.pow(
14 /
10,
2
)
);
assert.equal(
pattern12TpPrice(
shape.points[2],
shape.points[3],
2,
true
),
11 *
Math.pow(
13 /
11,
2
)
);

const senior =
pattern12TpEntries(
{
...shape,
showTpSenior:
true,
showTpJunior:
false
}
);
const junior =
pattern12TpEntries(
{
...shape,
showTpSenior:
false,
showTpJunior:
true
}
);

assert.equal(
senior.length,
5
);
assert.equal(
senior[0].kind,
"senior"
);
assert.equal(
senior[0].price,
14
);
assert.equal(
junior[0].kind,
"junior"
);
assert.equal(
junior[0].price,
13
);

const ticks =
pattern12TpTickLayout(
shape,
[
{ x: 10, y: 80 },
{ x: 20, y: 40 },
{ x: 30, y: 70 },
{ x: 40, y: 50 },
{ x: 50, y: 60 },
{ x: 80, y: 20 }
],
price=>
1000 -
price
);

assert.equal(
ticks.length,
5
);
assert.ok(
ticks[0].x1 >
80
);
assert.ok(
ticks[0].x2 >
ticks[0].x1
);
assert.equal(
ticks.filter(
t=>
t.kind ===
"junior" &&
t.ratio ===
1
)[0].y,
1000 -
13
);

assert.deepEqual(
normalizePattern12TpFlags(
true,
true
),
{
showTpSenior:
false,
showTpJunior:
true
}
);
assert.deepEqual(
normalizePattern12TpFlags(
false,
false
),
{
showTpSenior:
false,
showTpJunior:
false
}
);
assert.equal(
pattern12TpEntries(
{
...shape,
showTpSenior:
true,
showTpJunior:
true
}
).every(
e=>
e.kind ===
"junior"
),
true
);

assert.deepEqual(
normalizePattern12TpLevels(
null
),
[
1,
1.5,
2,
2.44,
2.5
]
);
assert.equal(
migrateElliottToolDefaults(
{},
PATTERN_12
).showTpSenior,
false
);
assert.equal(
migrateElliottToolDefaults(
{},
PATTERN_12
).showTpJunior,
true
);
assert.equal(
migrateElliottToolDefaults(
{
showTpSenior:
true,
showTpJunior:
true
},
PATTERN_12
).showTpSenior,
false
);
assert.equal(
migrateElliottToolDefaults(
{
showTpSenior:
true,
showTpJunior:
true
},
PATTERN_12
).showTpJunior,
true
);
assert.equal(
normalizeElliottShape(
shape
).tpLevels[
3
],
2.44
);

const {
elliottSettingsHtml
} =
await import(
"../js/drawings/draw-elliott-settings.js"
);
const html =
elliottSettingsHtml();

assert.match(
html,
/Take profit/
);
assert.match(
html,
/elliott-tp-senior-on/
);
assert.match(
html,
/elliott-tp-junior-on/
);
assert.match(
html,
/elliott-degree-row/
);
assert.match(
html,
/elliott-tp-flags/
);
assert.match(
html,
/1 → \(1\) \/ TP opacity/
);
assert.equal(
(html.match(
/class="elliott-tp-level"/g
) || []).length,
5
);

});
