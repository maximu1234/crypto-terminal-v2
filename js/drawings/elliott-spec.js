/**
 * Elliott Waves drawings: 5 subtypes, degree labels, defaults.
 * Geometry is a polyline starting at an unlabeled origin (vertex 0),
 * then labeled wave ends: 0–1–2–3–4–5, 0–A–B–C, etc.
 */

export const ELLIOTT_DEFAULT_COLOR =
"#38bdf8";

export const ELLIOTT_DEFAULT_DEGREE =
"submicro";

export const ELLIOTT_TOOL_DEFAULTS_VERSION =
1;

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

export const ELLIOTT_TOOL_TYPES =
Object.freeze([
ELLIOTT_IMPULSE,
ELLIOTT_CORRECTION,
ELLIOTT_TRIANGLE,
ELLIOTT_DOUBLE,
ELLIOTT_TRIPLE
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
!meta
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
index
){

if(
index <
1
){
return "";
}

return elliottDisplayLabels(
type,
degreeId
)[
index -
1
] ||
"";

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

export function createElliottToolDefaults(
overrides =
{}
){

return {
elliottDefaultsVersion:
ELLIOTT_TOOL_DEFAULTS_VERSION,
color:
ELLIOTT_DEFAULT_COLOR,
lineWidth:
1,
degree:
ELLIOTT_DEFAULT_DEGREE,
showWave:
true,
...overrides
};

}

export function migrateElliottToolDefaults(
saved
){

const base =
createElliottToolDefaults();

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
saved.degree
),
showWave:
saved.showWave !==
false
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
createElliottToolDefaults();
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
normalizeElliottDegree(
shape.degree
);
shape.showWave =
shape.showWave !==
false;

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
