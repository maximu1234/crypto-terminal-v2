/**
 * Elliott Waves drawings: 5 subtypes, degree labels, defaults.
 * Geometry is a polyline starting at an unlabeled origin (vertex 0),
 * then labeled wave ends: 0–1–2–3–4–5, 0–A–B–C, etc.
 */
import {
fibPriceAtRatio
} from "./fib-spec.js?v=17";

export const ELLIOTT_DEFAULT_COLOR =
"#38bdf8";

export const ELLIOTT_DEFAULT_DEGREE =
"submicro";

export const ELLIOTT_TOOL_DEFAULTS_VERSION =
5;

export const PATTERN_DASH_DEFAULT_OPACITY =
40;

export const PATTERN_12_TP_LEVEL_COUNT =
9;

export const PATTERN_12_TP_DEFAULT_LEVELS =
Object.freeze([
1,
1.5,
2,
2.44,
2.5,
null,
null,
null,
null
]);

export const PATTERN_12_TP_TICK_PAD_PX =
14;

export const PATTERN_12_TP_TICK_LEN_PX =
40;

export const ELLIOTT_IMPULSE =
"elliott-impulse";

export const ELLIOTT_CORRECTION =
"elliott-correction";

export const ELLIOTT_TRIANGLE =
"elliott-triangle";

export const ELLIOTT_DOUBLE =
"elliott-double";

export const ELLIOTT_TRIPLE =
"elliott-triple";

export const PATTERN_HS =
"pattern-hs";

export const PATTERN_DOUBLE_TB =
"pattern-double-tb";

export const PATTERN_12 =
"pattern-12";

export const ELLIOTT_WAVE_TYPES =
Object.freeze([
ELLIOTT_IMPULSE,
ELLIOTT_CORRECTION,
ELLIOTT_TRIANGLE,
ELLIOTT_DOUBLE,
ELLIOTT_TRIPLE
]);

export const ELLIOTT_PATTERN_TYPES =
Object.freeze([
PATTERN_HS,
PATTERN_DOUBLE_TB,
PATTERN_12
]);

export const ELLIOTT_TOOL_TYPES =
Object.freeze([
...ELLIOTT_WAVE_TYPES,
...ELLIOTT_PATTERN_TYPES
]);

export const ELLIOTT_TOOL_META =
Object.freeze({
[ELLIOTT_IMPULSE]:
Object.freeze({
id: ELLIOTT_IMPULSE,
kind: "impulse",
pointCount: 6,
title: "Elliott impulse wave (1·2·3·4·5)"
}),
[ELLIOTT_CORRECTION]:
Object.freeze({
id: ELLIOTT_CORRECTION,
kind: "correction",
pointCount: 4,
title: "Elliott correction wave (A·B·C)"
}),
[ELLIOTT_TRIANGLE]:
Object.freeze({
id: ELLIOTT_TRIANGLE,
kind: "triangle",
pointCount: 6,
title: "Elliott triangle wave (A·B·C·D·E)"
}),
[ELLIOTT_DOUBLE]:
Object.freeze({
id: ELLIOTT_DOUBLE,
kind: "double",
pointCount: 4,
title: "Elliott double combo wave (W·X·Y)"
}),
[ELLIOTT_TRIPLE]:
Object.freeze({
id: ELLIOTT_TRIPLE,
kind: "triple",
pointCount: 6,
title: "Elliott triple combo wave (W·X·Y·X·Z)"
}),
[PATTERN_HS]:
Object.freeze({
id: PATTERN_HS,
kind: "hs",
pointCount: 7,
title: "Head & Shoulders (LS · H · RS)"
}),
[PATTERN_DOUBLE_TB]:
Object.freeze({
id: PATTERN_DOUBLE_TB,
kind: "double-tb",
pointCount: 5,
title: "Double Top/Bottom (D1 · D2)"
}),
[PATTERN_12]:
Object.freeze({
id: PATTERN_12,
kind: "pattern-12",
pointCount: 6,
title: "Pattern 1-2-1-2-3 (1·2 · 1·2·3) (P)"
})
});

const CHARSETS =
Object.freeze({
romanUpper:
Object.freeze({
impulse:
[
"I",
"II",
"III",
"IV",
"V"
],
correction:
[
"A",
"B",
"C"
],
triangle:
[
"A",
"B",
"C",
"D",
"E"
],
double:
[
"W",
"X",
"Y"
],
triple:
[
"W",
"X",
"Y",
"X",
"Z"
]
}),
arabic:
Object.freeze({
impulse:
[
"1",
"2",
"3",
"4",
"5"
],
correction:
[
"A",
"B",
"C"
],
triangle:
[
"A",
"B",
"C",
"D",
"E"
],
double:
[
"W",
"X",
"Y"
],
triple:
[
"W",
"X",
"Y",
"X",
"Z"
]
}),
romanLower:
Object.freeze({
impulse:
[
"i",
"ii",
"iii",
"iv",
"v"
],
correction:
[
"a",
"b",
"c"
],
triangle:
[
"a",
"b",
"c",
"d",
"e"
],
double:
[
"w",
"x",
"y"
],
triple:
[
"w",
"x",
"y",
"x",
"z"
]
})
});

/**
 * TradingView degree glyphs: wrap cycles circle → ( ) → plain,
 * charset cycles roman-upper → arabic → roman-lower.
 * Default Submicro is arabic in parentheses: (1) (2) (3) (4) (5).
 */
export const ELLIOTT_DEGREES =
Object.freeze([
{
id: "supermillennium",
title: "Supermillennium",
charset: "romanUpper",
wrap: "circle",
fontPx: 18
},
{
id: "millennium",
title: "Millennium",
charset: "romanUpper",
wrap: "paren",
fontPx: 17
},
{
id: "submillennium",
title: "Submillennium",
charset: "romanUpper",
wrap: "none",
fontPx: 16
},
{
id: "grand-supercycle",
title: "Grand supercycle",
charset: "romanUpper",
wrap: "circle",
fontPx: 16
},
{
id: "supercycle",
title: "Supercycle",
charset: "romanUpper",
wrap: "paren",
fontPx: 15
},
{
id: "cycle",
title: "Cycle",
charset: "romanUpper",
wrap: "none",
fontPx: 15
},
{
id: "primary",
title: "Primary",
charset: "arabic",
wrap: "circle",
fontPx: 14
},
{
id: "intermediate",
title: "Intermediate",
charset: "arabic",
wrap: "paren",
fontPx: 14
},
{
id: "minor",
title: "Minor",
charset: "arabic",
wrap: "none",
fontPx: 13
},
{
id: "minute",
title: "Minute",
charset: "romanLower",
wrap: "circle",
fontPx: 13
},
{
id: "minuette",
title: "Minuette",
charset: "romanLower",
wrap: "paren",
fontPx: 12
},
{
id: "subminuette",
title: "Subminuette",
charset: "romanLower",
wrap: "none",
fontPx: 12
},
{
id: "micro",
title: "Micro",
charset: "arabic",
wrap: "circle",
fontPx: 12
},
{
id: "submicro",
title: "Submicro",
charset: "arabic",
wrap: "paren",
fontPx: 13
},
{
id: "minuscule",
title: "Minuscule",
charset: "arabic",
wrap: "none",
fontPx: 11
}
]);

const DEGREE_BY_ID =
Object.fromEntries(
ELLIOTT_DEGREES.map(
row=>
[
row.id,
row
]
)
);

export function isElliottType(
type
){

return ELLIOTT_TOOL_TYPES.includes(
type
);

}

export function isElliottWaveType(
type
){

return ELLIOTT_WAVE_TYPES.includes(
type
);

}

export function isPatternHsFamily(
type
){

return type ===
PATTERN_HS ||
type ===
PATTERN_DOUBLE_TB;

}

export function isPattern12Draw(
type
){

return type ===
PATTERN_12;

}

export function elliottToolMeta(
type
){

return ELLIOTT_TOOL_META[
type
] ||
null;

}

export function elliottPointCount(
type
){

return elliottToolMeta(
type
)?.pointCount ||
0;

}

export function normalizeElliottDegree(
raw
){

if(
typeof raw ===
"string" &&
DEGREE_BY_ID[
raw
]
){
return raw;
}

return ELLIOTT_DEFAULT_DEGREE;

}

export function elliottDegreeSpec(
raw
){

return DEGREE_BY_ID[
normalizeElliottDegree(
raw
)
];

}

function wrapLabelText(
core,
wrap
){

if(
wrap ===
"paren"
){
return `(${core})`;
}

if(
wrap ===
"doubleParen"
){
return `((${core}))`;
}

if(
wrap ===
"brackets"
){
return `[${core}]`;
}

return String(
core
);

}

export function elliottCoreLabels(
type,
degreeId
){

const meta =
elliottToolMeta(
type
);
const spec =
elliottDegreeSpec(
degreeId
);

if(
!meta ||
!isElliottWaveType(
type
)
){
return [];
}

const set =
CHARSETS[
spec.charset
] ||
CHARSETS.arabic;

return set[
meta.kind
].slice();

}

export function elliottDisplayLabels(
type,
degreeId
){

const spec =
elliottDegreeSpec(
degreeId
);

return elliottCoreLabels(
type,
degreeId
).map(
core=>
wrapLabelText(
core,
spec.wrap
)
);

}

export function elliottLabelForVertex(
type,
degreeId,
index,
degreeJuniorId
){

return elliottVertexLabel({
type,
degree:
degreeId,
degreeJunior:
degreeJuniorId
},
index
).text;

}

export function elliottVertexLabel(
shape,
index
){

const type =
shape?.type;
const empty =
{
text: "",
circled: false,
fontPx: 13
};

if(
index <
1
){
return empty;
}

if(
type ===
PATTERN_HS
){
const text =
[
"",
"LS",
"",
"H",
"",
"RS",
""
][
index
] ||
"";

return {
text,
circled: false,
fontPx: 13
};

}

if(
type ===
PATTERN_DOUBLE_TB
){
const text =
[
"",
"D1",
"",
"D2",
""
][
index
] ||
"";

return {
text,
circled: false,
fontPx: 13
};

}

if(
type ===
PATTERN_12
){

const senior =
elliottDegreeSpec(
shape?.degree
);
const junior =
elliottDegreeSpec(
shape?.degreeJunior
);
const spec =
index <=
2
? senior
: junior;
let core =
"";

if(
index ===
1 ||
index ===
3
){
core =
"1";
}else if(
index ===
2 ||
index ===
4
){
core =
"2";
}else if(
index ===
5
){
core =
"3";
}

if(
!core
){
return empty;
}

return {
text:
wrapLabelText(
core,
spec.wrap
),
circled:
spec.wrap ===
"circle",
fontPx:
Number.isFinite(
spec.fontPx
) &&
spec.fontPx >
0
? spec.fontPx
: 13
};

}

if(
!isElliottWaveType(
type
)
){
return empty;
}

const text =
elliottDisplayLabels(
type,
shape?.degree
)[
index -
1
] ||
"";

return {
text,
circled:
elliottUsesCircleWrap(
shape?.degree
),
fontPx:
elliottLabelFontPx(
shape?.degree
)
};

}

function lineThroughToXRange(
a,
b,
x1,
x2
){

if(
!a ||
!b
){
return null;
}

const leftX =
Math.min(
x1,
x2
);
const rightX =
Math.max(
x1,
x2
);

if(
Math.abs(
b.x -
a.x
) <
0.5
){
return {
a: {
x: a.x,
y: a.y
},
b: {
x: a.x,
y: b.y
}
};
}

const k =
(b.y - a.y) /
(b.x - a.x);
const yAt =
x=>
a.y +
k *
(x - a.x);

return {
a: {
x: leftX,
y: yAt(
leftX
)
},
b: {
x: rightX,
y: yAt(
rightX
)
}
};

}

export function elliottNecklineScreen(
type,
screens
){

if(
!Array.isArray(
screens
) ||
!screens.length
){
return null;
}

const xs =
screens.map(
p=>
p.x
);
const minX =
Math.min(
...xs
);
const maxX =
Math.max(
...xs
);

if(
type ===
PATTERN_HS &&
screens.length >=
5
){
return lineThroughToXRange(
screens[2],
screens[4],
minX,
maxX
);
}

if(
type ===
PATTERN_DOUBLE_TB &&
screens.length >=
3 &&
screens[2]
){
return {
a: {
x: minX,
y: screens[2].y
},
b: {
x: maxX,
y: screens[2].y
}
};
}

return null;

}

export function pattern12DashScreen(
screens
){

if(
!Array.isArray(
screens
) ||
screens.length <
4 ||
!screens[1] ||
!screens[3]
){
return null;
}

const a =
screens[1];
const b =
screens[3];
const maxX =
Math.max(
...screens.map(
p=>
p.x
),
a.x,
b.x
) +
36;
const left =
a.x <=
b.x
? a
: b;
const right =
a.x <=
b.x
? b
: a;

if(
Math.abs(
right.x -
left.x
) <
0.5
){
return {
a: left,
b: {
x: maxX,
y: left.y
}
};
}

const k =
(right.y - left.y) /
(right.x - left.x);

return {
a: left,
b: {
x: maxX,
y: left.y +
k *
(maxX - left.x)
}
};

}

export function elliottUsesCircleWrap(
degreeId
){

return elliottDegreeSpec(
degreeId
).wrap ===
"circle";

}

export function elliottLabelFontPx(
degreeId
){

const px =
elliottDegreeSpec(
degreeId
).fontPx;

return Number.isFinite(
px
) &&
px >
0
? px
: 13;

}

export function parsePattern12TpLevel(
raw
){

if(
raw ==
null ||
raw ===
""
){
return null;
}

if(
typeof raw ===
"number"
){

if(
!Number.isFinite(
raw
)
){
return null;
}

return Math.round(
raw *
1e6
) /
1e6;

}

const s =
String(
raw
).replace(
/,/g,
"."
).trim();

if(
!s ||
s ===
"." ||
s ===
"-"
){
return null;
}

const n =
Number(
s
);

if(
!Number.isFinite(
n
)
){
return null;
}

return Math.round(
n *
1e6
) /
1e6;

}

export function formatPattern12TpLabel(
raw
){

const n =
parsePattern12TpLevel(
raw
);

if(
n ==
null
){
return "";
}

if(
Number.isInteger(
n
)
){
return String(
n
);
}

let s =
n.toFixed(
6
).replace(
/0+$/,
""
);

if(
s.endsWith(
"."
)
){
s =
s.slice(
0,
-1
);
}

return s;

}

export function normalizePattern12TpLevels(
raw
){

if(
!Array.isArray(
raw
) ||
raw.length ===
0
){
return PATTERN_12_TP_DEFAULT_LEVELS.slice();
}

const out =
[];

for(
let i =
0;
i <
PATTERN_12_TP_LEVEL_COUNT;
i++
){

if(
i <
raw.length
){
out.push(
parsePattern12TpLevel(
raw[
i
]
)
);
}else{
out.push(
parsePattern12TpLevel(
PATTERN_12_TP_DEFAULT_LEVELS[
i
]
)
);
}

}

return out;

}

export function normalizePattern12TpFlags(
senior,
junior
){

const seniorSet =
senior ===
true ||
senior ===
false;
const juniorSet =
junior ===
true ||
junior ===
false;

if(
!seniorSet &&
!juniorSet
){
return {
showTpSenior:
false,
showTpJunior:
true
};
}

const seniorOn =
senior ===
true;
const juniorOn =
junior ===
true;

if(
seniorOn &&
juniorOn
){
return {
showTpSenior:
false,
showTpJunior:
true
};
}

return {
showTpSenior:
seniorOn,
showTpJunior:
juniorOn
};

}

export function normalizePatternDashOpacity(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return PATTERN_DASH_DEFAULT_OPACITY;
}

return Math.max(
0,
Math.min(
100,
Math.round(
n
)
)
);

}

export function createElliottToolDefaults(
overrides =
{}
){

const type =
overrides.type;
const isP12 =
type ===
PATTERN_12;
const rest =
{
...overrides
};

delete rest.type;

return {
elliottDefaultsVersion:
ELLIOTT_TOOL_DEFAULTS_VERSION,
color:
ELLIOTT_DEFAULT_COLOR,
lineWidth:
1,
degree:
isP12
? "micro"
: ELLIOTT_DEFAULT_DEGREE,
degreeJunior:
ELLIOTT_DEFAULT_DEGREE,
showWave:
true,
showPatternDash:
true,
patternDashOpacity:
PATTERN_DASH_DEFAULT_OPACITY,
...(
isP12
? {
...normalizePattern12TpFlags(),
tpLevels:
PATTERN_12_TP_DEFAULT_LEVELS.slice()
}
: {}
),
...rest
};

}

export function migrateElliottToolDefaults(
saved,
type
){

const toolType =
type ||
saved?.type;
const base =
createElliottToolDefaults(
{
type:
toolType
}
);

if(
!saved ||
typeof saved !==
"object"
){
return base;
}

const lineWidth =
Number(
saved.lineWidth
);

return {
...base,
color:
typeof saved.color ===
"string" &&
saved.color.trim()
? saved.color.trim()
: ELLIOTT_DEFAULT_COLOR,
lineWidth:
Number.isFinite(
lineWidth
) &&
lineWidth >=
1
? Math.min(
4,
Math.round(
lineWidth
)
)
: 1,
degree:
normalizeElliottDegree(
saved.degree ||
base.degree
),
degreeJunior:
normalizeElliottDegree(
saved.degreeJunior ||
base.degreeJunior
),
showWave:
saved.showWave !==
false,
showPatternDash:
saved.showPatternDash !==
false,
patternDashOpacity:
normalizePatternDashOpacity(
saved.patternDashOpacity ??
base.patternDashOpacity
),
...(
toolType ===
PATTERN_12
? {
...normalizePattern12TpFlags(
saved.showTpSenior,
saved.showTpJunior
),
tpLevels:
normalizePattern12TpLevels(
saved.tpLevels
)
}
: {}
)
};

}

function clonePoint(
pt
){

if(
!pt ||
typeof pt !==
"object"
){
return null;
}

const time =
Number(
pt.time
);
const price =
Number(
pt.price
);

if(
!Number.isFinite(
time
) ||
!Number.isFinite(
price
)
){
return null;
}

return {
time,
price
};

}

export function getElliottPoints(
shape
){

if(
Array.isArray(
shape?.points
)
){
return shape.points.map(
clonePoint
).filter(
Boolean
);
}

const fromNamed =
[
shape?.p1,
shape?.p2,
shape?.p3,
shape?.p4,
shape?.p5
].map(
clonePoint
).filter(
Boolean
);

return fromNamed;

}

export function setElliottPoints(
shape,
points
){

if(
!shape
){
return;
}

const next =
(points || []).map(
clonePoint
).filter(
Boolean
);

shape.points =
next;

if(
next[
0
]
){
shape.p1 =
next[
0
];
}

if(
next.length >
1
){
shape.p2 =
next[
next.length -
1
];
}

}

export function pattern12TpPrice(
fromPt,
toPt,
ratio,
logarithmic
){

const a =
Number(
fromPt?.price
);
const b =
Number(
toPt?.price
);
const v =
parsePattern12TpLevel(
ratio
);

if(
!Number.isFinite(
a
) ||
!Number.isFinite(
b
) ||
a ===
b ||
v ==
null ||
v ===
0
){
return null;
}

const price =
fibPriceAtRatio(
a,
b,
v,
logarithmic
);

return Number.isFinite(
price
)
? price
: null;

}

export function pattern12TpEntries(
shape,
logarithmic
){

if(
!isPattern12Draw(
shape?.type
)
){
return [];
}

const pts =
getElliottPoints(
shape
);
const levels =
normalizePattern12TpLevels(
shape?.tpLevels
);
const out =
[];

function addFamily(
fromPt,
toPt,
kind
){

for(
const ratio of levels
){

const price =
pattern12TpPrice(
fromPt,
toPt,
ratio,
logarithmic
);

if(
price ==
null
){
continue;
}

out.push(
{
kind,
ratio,
price,
label:
formatPattern12TpLabel(
ratio
)
}
);

}

}

const tpFlags =
normalizePattern12TpFlags(
shape.showTpSenior,
shape.showTpJunior
);

if(
tpFlags.showTpSenior
){
addFamily(
pts[
0
],
pts[
1
],
"senior"
);
}

if(
tpFlags.showTpJunior
){
addFamily(
pts[
2
],
pts[
3
],
"junior"
);
}

return out;

}

export function pattern12TpTickLayout(
shape,
screens,
priceToY,
logarithmic
){

const entries =
pattern12TpEntries(
shape,
logarithmic
);

if(
!entries.length ||
!Array.isArray(
screens
) ||
typeof priceToY !==
"function"
){
return [];
}

const xs =
screens.filter(
Boolean
).map(
p=>
p.x
).filter(
x=>
Number.isFinite(
x
)
);

if(
!xs.length
){
return [];
}

const x1 =
Math.max(
...xs
) +
PATTERN_12_TP_TICK_PAD_PX;
const x2 =
x1 +
PATTERN_12_TP_TICK_LEN_PX;
const ticks =
[];

for(
const entry of entries
){

const y =
priceToY(
entry.price
);

if(
y ==
null ||
!Number.isFinite(
y
)
){
continue;
}

ticks.push(
{
...entry,
x1,
x2,
y
}
);

}

return ticks;

}

export function normalizeElliottShape(
shape
){

if(
!isElliottType(
shape?.type
)
){
return shape;
}

const defaults =
createElliottToolDefaults(
{
type:
shape.type
}
);
const needed =
elliottPointCount(
shape.type
);
const pts =
getElliottPoints(
shape
).slice(
0,
needed
);

setElliottPoints(
shape,
pts
);

shape.color =
typeof shape.color ===
"string" &&
shape.color.trim()
? shape.color.trim()
: defaults.color;

const width =
Number(
shape.lineWidth
);

shape.lineWidth =
Number.isFinite(
width
) &&
width >=
1
? Math.min(
4,
Math.round(
width
)
)
: 1;

shape.degree =
shape.type ===
PATTERN_12 &&
!shape.degree
? "micro"
: normalizeElliottDegree(
shape.degree
);
shape.degreeJunior =
normalizeElliottDegree(
shape.degreeJunior
);
shape.showWave =
shape.showWave !==
false;
shape.showPatternDash =
shape.showPatternDash !==
false;
shape.patternDashOpacity =
normalizePatternDashOpacity(
shape.patternDashOpacity
);

if(
shape.type ===
PATTERN_12
){
Object.assign(
shape,
normalizePattern12TpFlags(
shape.showTpSenior,
shape.showTpJunior
)
);
shape.tpLevels =
normalizePattern12TpLevels(
shape.tpLevels
);
}

return shape;

}

export function elliottHandleId(
index
){

return `pt${index}`;

}

export function elliottHandleIndex(
handleId
){

if(
typeof handleId !==
"string" ||
!handleId.startsWith(
"pt"
)
){
return -1;
}

const n =
Number(
handleId.slice(
2
)
);

return Number.isInteger(
n
)
? n
: -1;

}

export function listElliottHandles(
shape
){

return getElliottPoints(
shape
).map(
(
point,
i
)=>({
id: elliottHandleId(
i
),
point
})
);

}

/** All vertices — hover/selection anchors so every wave point can be dragged. */
export function elliottSelectionHandlePoints(
shape
){

return getElliottPoints(
shape
);

}

const LABEL_OFFSET_PX =
16;

export function elliottLabelAnchor(
screens,
index
){

const p =
screens[
index
];

if(
!p
){
return null;
}

const prev =
screens[
index -
1
];
const next =
screens[
index +
1
];

let up =
true;

if(
prev &&
next
){
up =
p.y <=
prev.y &&
p.y <=
next.y;
}else if(
prev
){
up =
p.y <=
prev.y;
}else if(
next
){
up =
p.y <=
next.y;
}

return {
x: p.x,
y: p.y +
(
up
? -LABEL_OFFSET_PX
: LABEL_OFFSET_PX
)
};

}

export function elliottScreenPoints(
shape,
toXY
){

if(
typeof toXY !==
"function"
){
return [];
}

return getElliottPoints(
shape
).map(
pt=>
toXY(
pt
)
).filter(
xy=>
xy &&
Number.isFinite(
xy.x
) &&
Number.isFinite(
xy.y
)
);

}
