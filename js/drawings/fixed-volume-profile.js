/** @module drawings/fixed-volume-profile — Fixed Range Volume Profile (TradingView FRVP) */

import {
klineTfToMs
} from "../kline-history-pages.js?v=2";

import {
priceFormatForValue
} from "../chart/chart-options.js?v=7";

export const FVP_TYPE =
"fvp";

export const FVP_TOOL_DEFAULTS_VERSION =
3;

export const FVP_LTF_SEQUENCE =
Object.freeze([
"1",
"5",
"15",
"30",
"60",
"240",
"D"
]);

export const FVP_LTF_BAR_LIMIT =
5000;

const FVP_STYLE_KEY_LIST =
Object.freeze([
"rowsLayout",
"rowSize",
"volumeMode",
"vaPercent",
"extendRight",
"showProfile",
"showValues",
"valuesColor",
"widthPercent",
"placement",
"upColor",
"downColor",
"vaUpColor",
"vaDownColor",
"showPoc",
"pocColor",
"pocLineWidth",
"pocLineStyle",
"showDevelopingPoc",
"developingPocColor",
"developingPocLineWidth",
"developingPocLineStyle",
"showVah",
"vahColor",
"vahLineWidth",
"vahLineStyle",
"showVal",
"valColor",
"valLineWidth",
"valLineStyle",
"showDevelopingVa",
"developingVaColor",
"developingVaLineWidth",
"developingVaLineStyle",
"showHistogramBox",
"histogramBoxColor"
]);

export const FVP_STYLE_KEYS =
FVP_STYLE_KEY_LIST;

export function isFvpType(
type
){

return type ===
FVP_TYPE;

}

export function createFvpToolDefaults(
overrides =
{}
){

return {
fvpDefaultsVersion:
FVP_TOOL_DEFAULTS_VERSION,
color:
"#787b86",
lineWidth:
1,
rowsLayout:
"numberOfRows",
rowSize:
24,
volumeMode:
"upDown",
vaPercent:
70,
extendRight:
false,
showProfile:
true,
showValues:
true,
valuesColor:
"#b2b5be",
widthPercent:
30,
placement:
"left",
upColor:
"rgba(38,166,154,0.2)",
downColor:
"rgba(239,83,80,0.2)",
vaUpColor:
"rgba(38,166,154,0.5)",
vaDownColor:
"rgba(239,83,80,0.5)",
showPoc:
true,
pocColor:
"#ffffff",
pocLineWidth:
1,
pocLineStyle:
"solid",
showDevelopingPoc:
false,
developingPocColor:
"#2962ff",
developingPocLineWidth:
1,
developingPocLineStyle:
"solid",
showVah:
false,
vahColor:
"#787b86",
vahLineWidth:
1,
vahLineStyle:
"solid",
showVal:
false,
valColor:
"#787b86",
valLineWidth:
1,
valLineStyle:
"solid",
showDevelopingVa:
false,
developingVaColor:
"rgba(41,98,255,0.35)",
developingVaLineWidth:
1,
developingVaLineStyle:
"solid",
showHistogramBox:
true,
histogramBoxColor:
"rgba(120,123,134,0.2)",
...overrides
};

}

export function migrateFvpToolDefaults(
saved
){

const defaults =
createFvpToolDefaults();

if(
!saved ||
typeof saved !==
"object"
){
return defaults;
}

const prevVersion =
Number(
saved.fvpDefaultsVersion
) ||
0;

const out =
{
...defaults,
...saved,
fvpDefaultsVersion:
FVP_TOOL_DEFAULTS_VERSION
};

if(
prevVersion <
2
){
out.placement =
"left";
out.pocColor =
"#ffffff";
}

if(
prevVersion <
3
){
out.placement =
"left";

if(
Number(
out.widthPercent
) ===
100
){
out.widthPercent =
30;
}
}

out.rowsLayout =
out.rowsLayout ===
"ticksPerRow"
? "ticksPerRow"
: "numberOfRows";

out.volumeMode =
out.volumeMode ===
"total" ||
out.volumeMode ===
"delta"
? out.volumeMode
: "upDown";

out.placement =
"left";

out.rowSize =
clampPositiveInt(
out.rowSize,
24,
1,
10000
);

out.vaPercent =
clampNumber(
out.vaPercent,
70,
1,
100
);

out.widthPercent =
clampNumber(
out.widthPercent,
30,
1,
100
);

return out;

}

export function normalizeFvpShape(
shape,
defaults
){

if(
!shape ||
shape.type !==
FVP_TYPE
){
return shape;
}

const base =
migrateFvpToolDefaults(
defaults ||
null
);

for(
const key of
FVP_STYLE_KEY_LIST
){

if(
shape[key] ===
undefined
){
shape[key] =
base[key];
}

}

shape.rowsLayout =
shape.rowsLayout ===
"ticksPerRow"
? "ticksPerRow"
: "numberOfRows";

shape.volumeMode =
shape.volumeMode ===
"total" ||
shape.volumeMode ===
"delta"
? shape.volumeMode
: "upDown";

const prevVersion =
Number(
shape.fvpDefaultsVersion
) ||
0;

if(
prevVersion <
2
){
shape.placement =
"left";
shape.pocColor =
"#ffffff";
}

if(
prevVersion <
3
){
shape.placement =
"left";

if(
Number(
shape.widthPercent
) ===
100
){
shape.widthPercent =
30;
}
}

shape.fvpDefaultsVersion =
FVP_TOOL_DEFAULTS_VERSION;

shape.placement =
"left";

shape.rowSize =
clampPositiveInt(
shape.rowSize,
base.rowSize,
1,
10000
);

shape.vaPercent =
clampNumber(
shape.vaPercent,
base.vaPercent,
1,
100
);

shape.widthPercent =
clampNumber(
shape.widthPercent,
base.widthPercent,
1,
100
);

shape.extendRight =
!!shape.extendRight;

shape.showProfile =
shape.showProfile !==
false;

shape.showValues =
shape.showValues !==
false;

shape.showPoc =
shape.showPoc !==
false;

shape.showHistogramBox =
shape.showHistogramBox !==
false;

shape.showDevelopingPoc =
!!shape.showDevelopingPoc;
shape.showVah =
!!shape.showVah;
shape.showVal =
!!shape.showVal;
shape.showDevelopingVa =
!!shape.showDevelopingVa;

shape.pocLineWidth =
clampPositiveInt(
shape.pocLineWidth,
1,
1,
4
);
shape.vahLineWidth =
clampPositiveInt(
shape.vahLineWidth,
1,
1,
4
);
shape.valLineWidth =
clampPositiveInt(
shape.valLineWidth,
1,
1,
4
);
shape.developingPocLineWidth =
clampPositiveInt(
shape.developingPocLineWidth,
1,
1,
4
);
shape.developingVaLineWidth =
clampPositiveInt(
shape.developingVaLineWidth,
1,
1,
4
);

if(
!shape.color
){
shape.color =
base.color;
}

if(
shape.lineWidth ==
null
){
shape.lineWidth =
1;
}

return shape;

}

export function copyFvpStyleToShape(
shape,
style
){

if(
!shape ||
!style
){
return shape;
}

for(
const key of
FVP_STYLE_KEY_LIST
){

if(
style[key] !==
undefined
){
shape[key] =
style[key];
}

}

return normalizeFvpShape(
shape,
style
);

}

export function extractFvpStyleSnapshot(
shape
){

const base =
createFvpToolDefaults();
const out =
{};

for(
const key of
FVP_STYLE_KEY_LIST
){
out[key] =
shape?.[key] !==
undefined
? shape[key]
: base[key];
}

out.fvpDefaultsVersion =
FVP_TOOL_DEFAULTS_VERSION;
out.color =
shape?.color ||
base.color;
out.lineWidth =
Number(
shape?.lineWidth
) ||
1;

return migrateFvpToolDefaults(
out
);

}

function clampPositiveInt(
value,
fallback,
min,
max
){

const n =
Math.round(
Number(
value
)
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
max,
Math.max(
min,
n
)
);

}

function clampNumber(
value,
fallback,
min,
max
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
max,
Math.max(
min,
n
)
);

}

export function normalizeFvpTf(
tf
){

const t =
String(
tf ||
""
).trim();

if(
t ===
"1D" ||
t ===
"D"
){
return "D";
}

if(
t ===
"1W" ||
t ===
"W"
){
return "W";
}

if(
t ===
"1M" ||
t ===
"M"
){
return "M";
}

return t;

}

export function pickFvpLowerTf(
spanMs,
chartTf =
"60"
){

const chart =
normalizeFvpTf(
chartTf
);

if(
!(
spanMs >
0
)
){
return chart ||
"1";
}

if(
spanMs <=
5 *
60 *
1000
){
return "1";
}

for(
const tf of
FVP_LTF_SEQUENCE
){

const ms =
klineTfToMs(
tf
);

if(
!(
ms >
0
)
){
continue;
}

if(
spanMs /
ms <
FVP_LTF_BAR_LIMIT
){
return tf;
}

}

return FVP_LTF_SEQUENCE[
FVP_LTF_SEQUENCE.length -
1
];

}

export function inferFvpTickSize(
price
){

const move =
priceFormatForValue(
price
)?.minMove;

if(
Number.isFinite(
move
) &&
move >
0
){
return move;
}

return 0.01;

}

export function candleTimeMs(
time
){

const t =
Number(
time
);

if(
!Number.isFinite(
t
)
){
return NaN;
}

return t >
1e12
? t
: t *
1000;

}

export function fvpTimeRange(
shape,
lastCandleTime
){

const t1 =
Number(
shape?.p1?.time
);
const t2 =
Number(
shape?.p2?.time
);

const tLeft =
Math.min(
t1,
t2
);
const tRightAnchor =
Math.max(
t1,
t2
);

const last =
Number(
lastCandleTime
);

const tRight =
shape?.extendRight &&
Number.isFinite(
last
)
? Math.max(
tRightAnchor,
last
)
: tRightAnchor;

return {
tLeft,
tRightAnchor,
tRight,
valid:
Number.isFinite(
tLeft
) &&
Number.isFinite(
tRightAnchor
)
};

}

export function filterBarsInRange(
bars,
tLeft,
tRight
){

if(
!Array.isArray(
bars
)
){
return [];
}

return bars.filter(
bar=>{

const t =
Number(
bar?.time
);

return Number.isFinite(
t
) &&
t >=
tLeft &&
t <=
tRight;

}
);

}

export function profileHighLow(
bars
){

let high =
-Infinity;
let low =
Infinity;

for(
const bar of
bars
){

const h =
Number(
bar?.high
);
const l =
Number(
bar?.low
);

if(
Number.isFinite(
h
)
){
high =
Math.max(
high,
h
);
}

if(
Number.isFinite(
l
)
){
low =
Math.min(
low,
l
);
}

}

if(
!(
high >
low
) &&
Number.isFinite(
high
)
){
low =
high;
}

return {
high,
low,
valid:
Number.isFinite(
high
) &&
Number.isFinite(
low
)
};

}

/**
 * TradingView Rows Layout / Row Size.
 * Number of Rows: ticksPerRow = (top-bottom) / rowSize / tickSize, then
 * round so the resulting row count is closer to the requested size.
 */
export function layoutFvpRows(
{
high,
low,
tickSize,
rowsLayout,
rowSize
}
){

const tick =
Number(
tickSize
);

if(
!(
tick >
0
) ||
!(
high >=
low
)
){
return {
rows: [],
ticksPerRow: 1,
totalTicks: 0
};
}

const span =
high -
low;
const totalTicks =
Math.max(
1,
Math.round(
span /
tick
)
);
const requested =
clampPositiveInt(
rowSize,
24,
1,
10000
);

let ticksPerRow =
1;

if(
rowsLayout ===
"ticksPerRow"
){
ticksPerRow =
requested;
}else{

const raw =
totalTicks /
requested;
const down =
Math.max(
1,
Math.floor(
raw
)
);
const up =
Math.max(
1,
Math.ceil(
raw
)
);
const rowsDown =
Math.ceil(
totalTicks /
down
);
const rowsUp =
Math.ceil(
totalTicks /
up
);
const distDown =
Math.abs(
rowsDown -
requested
);
const distUp =
Math.abs(
rowsUp -
requested
);

ticksPerRow =
distDown <
distUp
? down
: distUp <
distDown
? up
: (
Math.abs(
raw -
down
) <=
Math.abs(
up -
raw
)
? down
: up
);

}

const rows =
[];
let cursor =
low;

while(
cursor <
high -
tick *
0.25 &&
rows.length <
20000
){

const next =
Math.min(
high,
cursor +
ticksPerRow *
tick
);

rows.push(
{
low: cursor,
high: next,
mid: (
cursor +
next
) /
2,
up: 0,
down: 0,
total: 0,
inVA: false
}
);

if(
next >=
high
){
break;
}

cursor =
next;

}

if(
!rows.length
){

rows.push(
{
low,
high,
mid: (
low +
high
) /
2,
up: 0,
down: 0,
total: 0,
inVA: false
}
);

}

return {
rows,
ticksPerRow,
totalTicks
};

}

export function isFvpUpBar(
bar
){

const open =
Number(
bar?.open
);
const close =
Number(
bar?.close
);

if(
!Number.isFinite(
open
) ||
!Number.isFinite(
close
)
){
return false;
}

return close >
open;

}

function rowIndexForPrice(
rows,
price
){

if(
!rows.length
){
return -1;
}

if(
price <=
rows[0].low
){
return 0;
}

const last =
rows.length -
1;

if(
price >=
rows[last].high
){
return last;
}

for(
let i =
0;
i <
rows.length;
i++
){

const row =
rows[i];

if(
price >=
row.low &&
price <
row.high
){
return i;
}

}

return last;

}

export function accumulateFvpVolume(
rows,
bars
){

if(
!rows.length
){
return 0;
}

let totalVolume =
0;

for(
const bar of
bars
){

const vol =
Number(
bar?.volume
);
const qty =
Number.isFinite(
vol
) &&
vol >
0
? vol
: 1;
const close =
Number(
bar?.close
);

if(
!Number.isFinite(
close
)
){
continue;
}

const index =
rowIndexForPrice(
rows,
close
);

if(
index <
0
){
continue;
}

const row =
rows[index];
const up =
isFvpUpBar(
bar
);

if(
up
){
row.up +=
qty;
}else{
row.down +=
qty;
}

row.total +=
qty;
totalVolume +=
qty;

}

return totalVolume;

}

/**
 * Value Area: start at POC, expand to the adjacent higher-volume side
 * until vaPercent of total volume. Ties → closer to POC, then above.
 */
export function computeFvpValueArea(
rows,
vaPercent,
totalVolume
){

const n =
rows.length;

if(
!n ||
!(
totalVolume >
0
)
){
return {
pocIndex: -1,
vaLowIndex: -1,
vaHighIndex: -1
};
}

let pocIndex =
0;
let pocVol =
-1;
const mid =
(
n -
1
) /
2;

for(
let i =
0;
i <
n;
i++
){

const vol =
rows[i].total;

if(
vol >
pocVol
){
pocVol =
vol;
pocIndex =
i;
continue;
}

if(
vol ===
pocVol &&
Math.abs(
i -
mid
) <
Math.abs(
pocIndex -
mid
)
){
pocIndex =
i;
}

}

const target =
totalVolume *
(
clampNumber(
vaPercent,
70,
1,
100
) /
100
);
let used =
rows[pocIndex].total;
let low =
pocIndex;
let high =
pocIndex;
rows[pocIndex].inVA =
true;

while(
used <
target &&
(
low >
0 ||
high <
n -
1
)
){

const above =
high +
1 <
n
? rows[high + 1].total
: -1;
const below =
low >
0
? rows[low - 1].total
: -1;

if(
above <
0 &&
below <
0
){
break;
}

let pick =
null;

if(
above >
below
){
pick =
"above";
}else if(
below >
above
){
pick =
"below";
}else if(
above ===
below &&
above >=
0
){

const distAbove =
1;
const distBelow =
1;

if(
distBelow <
distAbove
){
pick =
"below";
}else{
pick =
"above";
}

}else{
pick =
above >=
0
? "above"
: "below";
}

        const nextVol =
        pick ===
        "above"
        ? above
        : below;

        if(
        !(
        nextVol >=
        0
        )
        ){
        break;
        }

        if(
        used +
        nextVol >
        target
        ){
        break;
        }

if(
pick ===
"above"
){
high +=
1;
rows[high].inVA =
true;
used +=
rows[high].total;
}else{
low -=
1;
rows[low].inVA =
true;
used +=
rows[low].total;
}

}

return {
pocIndex,
vaLowIndex: low,
vaHighIndex: high
};

}

export function formatFvpVolume(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return "0";
}

const abs =
Math.abs(
n
);
const sign =
n <
0
? "-"
: "";

function trim(
x
){

return String(
x
).replace(
/\.0$/,
""
);

}

if(
abs >=
1e9
){
return sign +
trim(
(
abs /
1e9
).toFixed(
1
)
) +
"B";
}

if(
abs >=
1e6
){
return sign +
trim(
(
abs /
1e6
).toFixed(
1
)
) +
"M";
}

if(
abs >=
1e3
){
return sign +
trim(
(
abs /
1e3
).toFixed(
1
)
) +
"K";
}

if(
abs >=
10
){
return sign +
String(
Math.round(
abs
)
);
}

return sign +
trim(
abs.toFixed(
1
)
);

}

export function buildFvpHistogram(
{
bars,
high,
low,
tickSize,
rowsLayout,
rowSize,
vaPercent,
wantDeveloping
}
){

const layout =
layoutFvpRows(
{
high,
low,
tickSize,
rowsLayout,
rowSize
}
);
const rows =
layout.rows;
const totalVolume =
accumulateFvpVolume(
rows,
bars
);
const va =
computeFvpValueArea(
rows,
vaPercent,
totalVolume
);

const developingPoc =
[];
const developingVaHigh =
[];
const developingVaLow =
[];

if(
wantDeveloping &&
bars.length
){

const scratch =
layoutFvpRows(
{
high,
low,
tickSize,
rowsLayout,
rowSize
}
).rows;

let running =
0;

for(
const bar of
bars
){

        accumulateFvpVolume(
        scratch,
        [
        bar
        ]
        );
        running +=
        Number(
        bar.volume
        ) >
        0
        ? Number(
        bar.volume
        )
        : 1;

        for(
        const row of
        scratch
        ){
        row.inVA =
        false;
        }

        const stepVa =
        computeFvpValueArea(
        scratch,
        vaPercent,
        running
        );

const t =
Number(
bar.time
);

if(
stepVa.pocIndex >=
0
){
developingPoc.push(
{
time: t,
price: scratch[stepVa.pocIndex].mid
}
);
}

if(
stepVa.vaHighIndex >=
0
){
developingVaHigh.push(
{
time: t,
price: scratch[stepVa.vaHighIndex].high
}
);
}

if(
stepVa.vaLowIndex >=
0
){
developingVaLow.push(
{
time: t,
price: scratch[stepVa.vaLowIndex].low
}
);
}

}

}

return {
rows,
totalVolume,
ticksPerRow: layout.ticksPerRow,
totalTicks: layout.totalTicks,
pocIndex: va.pocIndex,
vaLowIndex: va.vaLowIndex,
vaHighIndex: va.vaHighIndex,
pocPrice: va.pocIndex >=
0
? rows[va.pocIndex].mid
: null,
vahPrice: va.vaHighIndex >=
0
? rows[va.vaHighIndex].high
: null,
valPrice: va.vaLowIndex >=
0
? rows[va.vaLowIndex].low
: null,
developingPoc,
developingVaHigh,
developingVaLow
};

}

let fvpSource =
{
getSymbol:()=>
"",
getTf:()=>
"60",
getCandles:()=>
[],
loadHistory: null,
scheduleRedraw: null
};

const fvpLtfCache =
new Map();

const fvpLtfInflight =
new Set();

export function bindFvpDataSource(
next
){

fvpSource =
{
...fvpSource,
...next
};

}

export function clearFvpLtfCache(){

fvpLtfCache.clear();
fvpLtfInflight.clear();

}

function fvpCacheKey(
symbol,
tf,
tLeft,
tRight
){

return [
String(
symbol ||
""
).toUpperCase(),
tf,
tLeft,
tRight
].join(
"|"
);

}

function requestFvpLtf(
symbol,
tf,
tLeft,
tRight
){

const key =
fvpCacheKey(
symbol,
tf,
tLeft,
tRight
);

if(
fvpLtfCache.has(
key
) ||
fvpLtfInflight.has(
key
)
){
return;
}

const loadHistory =
fvpSource.loadHistory;

if(
typeof loadHistory !==
"function"
){
return;
}

const tfMs =
klineTfToMs(
tf
);
const spanMs =
Math.max(
0,
candleTimeMs(
tRight
) -
candleTimeMs(
tLeft
)
);
const barCount =
tfMs >
0
? Math.ceil(
spanMs /
tfMs
)
: 1;
const requests =
Math.min(
6,
Math.max(
1,
Math.ceil(
barCount /
1000
) +
1
)
);
const endMs =
candleTimeMs(
tRight
);

fvpLtfInflight.add(
key
);

Promise.resolve(
loadHistory(
symbol,
tf,
requests,
{
endMs,
parallel: true
}
)
).then(
bars=>{

const list =
Array.isArray(
bars
)
? bars
: [];

fvpLtfCache.set(
key,
filterBarsInRange(
list,
tLeft,
tRight
)
);
fvpLtfInflight.delete(
key
);
fvpSource.scheduleRedraw?.();

}
).catch(
()=>{

fvpLtfInflight.delete(
key
);

}
);

}

export function resolveFvpBars(
shape,
chartCandles
){

const last =
chartCandles?.[
chartCandles.length -
1
]?.time;
const range =
fvpTimeRange(
shape,
last
);

if(
!range.valid
){
return [];
}

const chartBars =
filterBarsInRange(
chartCandles,
range.tLeft,
range.tRight
);
const spanMs =
Math.max(
0,
candleTimeMs(
range.tRight
) -
candleTimeMs(
range.tLeft
)
);
const chartTf =
normalizeFvpTf(
fvpSource.getTf?.() ||
"60"
);
const ltf =
pickFvpLowerTf(
spanMs,
chartTf
);
const symbol =
fvpSource.getSymbol?.() ||
"";

if(
ltf ===
chartTf
){
return chartBars;
}

const key =
fvpCacheKey(
symbol,
ltf,
range.tLeft,
range.tRight
);
const cached =
fvpLtfCache.get(
key
);

if(
cached
){
return cached.length
? cached
: chartBars;
}

requestFvpLtf(
symbol,
ltf,
range.tLeft,
range.tRight
);

return chartBars;

}

export function buildFvpScene(
shape,
{
toXY,
candles
} =
{}
){

if(
!isFvpType(
shape?.type
)
){
return null;
}

normalizeFvpShape(
shape
);

const chartCandles =
Array.isArray(
candles
)
? candles
: (
fvpSource.getCandles?.() ||
[]
);
const last =
chartCandles[
chartCandles.length -
1
];
const range =
fvpTimeRange(
shape,
last?.time
);

if(
!range.valid
){
return null;
}

const bars =
resolveFvpBars(
shape,
chartCandles
);
const hl =
profileHighLow(
bars
);
const high =
hl.valid
? hl.high
: Math.max(
Number(
shape.p1?.price
) ||
0,
Number(
shape.p2?.price
) ||
0
);
const low =
hl.valid
? hl.low
: Math.min(
Number(
shape.p1?.price
) ||
0,
Number(
shape.p2?.price
) ||
0
);
const tickSize =
inferFvpTickSize(
high ||
low ||
1
);
const histogram =
buildFvpHistogram(
{
bars,
high,
low,
tickSize,
rowsLayout: shape.rowsLayout,
rowSize: shape.rowSize,
vaPercent: shape.vaPercent,
wantDeveloping: !!(
shape.showDevelopingPoc ||
shape.showDevelopingVa
)
}
);

const topPt =
toXY?.(
{
time: range.tLeft,
price: high
}
);
const bottomPt =
toXY?.(
{
time: range.tRightAnchor,
price: low
}
);
const rightAnchorPt =
toXY?.(
{
time: range.tRightAnchor,
price: high
}
);
const rightExtPt =
toXY?.(
{
time: range.tRight,
price: high
}
);

if(
!topPt ||
!bottomPt
){
return {
...histogram,
high,
low,
tickSize,
tLeft: range.tLeft,
tRight: range.tRight,
tRightAnchor: range.tRightAnchor,
x1: null,
x2: null,
y1: null,
y2: null,
bars
};
}

let x2 =
shape.extendRight
? (
rightExtPt?.x ??
rightAnchorPt?.x ??
topPt.x
)
: (
rightAnchorPt?.x ??
topPt.x
);

const x1 =
Math.min(
topPt.x,
x2
);
x2 =
Math.max(
topPt.x,
x2
);

const y1 =
Math.min(
topPt.y,
bottomPt.y
);
const y2 =
Math.max(
topPt.y,
bottomPt.y
);

return {
...histogram,
high,
low,
tickSize,
tLeft: range.tLeft,
tRight: range.tRight,
tRightAnchor: range.tRightAnchor,
x1,
x2,
y1,
y2,
bars
};

}

export function fvpScreenBox(
shape,
toXY,
candles
){

const scene =
buildFvpScene(
shape,
{
toXY,
candles
}
);

if(
!scene ||
scene.x1 ==
null
){
return null;
}

return {
left: scene.x1,
right: scene.x2,
top: scene.y1,
bottom: scene.y2,
cx: (
scene.x1 +
scene.x2
) /
2,
cy: (
scene.y1 +
scene.y2
) /
2,
scene
};

}

export function fvpBodyDist(
px,
py,
shape,
toXY,
candles
){

const box =
fvpScreenBox(
shape,
toXY,
candles
);

if(
!box
){
return Infinity;
}

const left =
box.left;
const right =
box.right;
const top =
box.top;
const bottom =
box.bottom;

if(
px >=
left &&
px <=
right &&
py >=
top &&
py <=
bottom
){
return 0;
}

const dx =
px <
left
? left -
px
: px >
right
? px -
right
: 0;
const dy =
py <
top
? top -
py
: py >
bottom
? py -
bottom
: 0;

return Math.hypot(
dx,
dy
);

}

export function getFvpHandleScreens(
shape,
toXY,
candles
){

const box =
fvpScreenBox(
shape,
toXY,
candles
);

if(
!box
){
return [];
}

return [
{
id: "p1",
x: box.left,
y: box.bottom,
square: false
},
{
id: "p2",
x: box.right,
y: box.top,
square: false
}
];

}

export function moveFvpHandle(
shape,
handleId,
point
){

if(
!shape ||
!point
){
return;
}

if(
handleId ===
"p1"
){
shape.p1 =
{
...shape.p1,
time: point.time
};
}

if(
handleId ===
"p2"
){
shape.p2 =
{
...shape.p2,
time: point.time
};
}

}
