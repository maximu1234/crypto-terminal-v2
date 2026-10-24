/**
 * RSI Touch Flip — request.security как в pine (lookahead_off).
 * На закрытии свечи графика берём RSI последнего уже закрытого бара источника.
 * 1m на 5m — младший ТФ, не HTF-проекция по open.
 */
import {
computeWilderRsiValues
} from "./rsi-touch-flip-engine.js?v=525cb7f2";
import {
normalizeRsiTouchFlipPrefs
} from "./rsi-touch-flip-prefs.js?v=f6c3ff87";
import {
klineGapFillEnds
} from "../kline-history-pages.js?v=f9dac656";

const KLINE_PAGE =
1000;
const MAX_SOURCE_PAGES =
60;

const sourceCache =
new Map();

/**
 * @param {unknown} tf
 * @returns {number}
 */
export function rsiTouchFlipTfPeriodSec(
tf
){

const t =
String(
tf ||
""
).trim();

if(
t ===
"D"
){
return 86400;
}

if(
t ===
"W"
){
return 604800;
}

const n =
Number(
t
);

return Number.isFinite(
n
) &&
n >
0
? n *
60
: 0;

}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function rsiTouchFlipUnixSec(
raw
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return NaN;
}

return n >
1e12
? Math.floor(
n /
1000
)
: n;

}

/**
 * Сколько дней покрывает история на графике (open первой → close последней).
 * @param {Array<{time:number}>} chartCandles
 * @param {string} chartTf
 * @returns {number}
 */
export function rsiTouchFlipChartDays(
chartCandles,
chartTf
){

const rows =
Array.isArray(
chartCandles
)
? chartCandles
: [];

if(
!rows.length
){
return NaN;
}

const first =
rsiTouchFlipUnixSec(
rows[0].time
);
const last =
rsiTouchFlipUnixSec(
rows[rows.length - 1].time
);
const period =
rsiTouchFlipTfPeriodSec(
chartTf
);

if(
!Number.isFinite(
first
) ||
!Number.isFinite(
last
) ||
last <
first ||
!(
period >
0
)
){
return NaN;
}

return (
last -
first +
period
) /
86400;

}

/**
 * Сколько страниц kline (по 1000), чтобы источник покрыл весь график.
 * @param {Array<{time:number}>} chartCandles
 * @param {string} chartTf
 * @param {string} sourceTf
 * @param {number} rsiLen
 */
export function rsiTouchFlipSourcePages(
chartCandles,
chartTf,
sourceTf,
rsiLen
){

const rows =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const chartSec =
rsiTouchFlipTfPeriodSec(
chartTf
);
const srcSec =
rsiTouchFlipTfPeriodSec(
sourceTf
);

if(
!rows.length ||
!(
chartSec >
0
) ||
!(
srcSec >
0
)
){
return 1;
}

const first =
rsiTouchFlipUnixSec(
rows[0].time
);
const last =
rsiTouchFlipUnixSec(
rows[rows.length - 1].time
);
const span =
last -
first +
chartSec;
const need =
Math.ceil(
span /
srcSec
) +
Math.max(
2,
Math.round(
Number(
rsiLen
) ||
14
)
) +
5;
return Math.min(
MAX_SOURCE_PAGES,
Math.max(
1,
Math.ceil(
need /
KLINE_PAGE
)
)
);

}

/**
 * Последний бар источника, который уже закрыт к закрытию свечи графика.
 * @param {Array<{time:number}>} chartCandles
 * @param {string} chartTf
 * @param {Array<{time:number}>} sourceCandles
 * @param {string} sourceTf
 * @param {number[]} sourceRsi
 * @returns {number[]}
 */
export function projectClosedSourceRsiOntoChart(
chartCandles,
chartTf,
sourceCandles,
sourceTf,
sourceRsi
){

const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const source =
Array.isArray(
sourceCandles
)
? sourceCandles
: [];
const rsi =
Array.isArray(
sourceRsi
)
? sourceRsi
: [];
const out =
new Array(
chart.length
).fill(
NaN
);
const chartSec =
rsiTouchFlipTfPeriodSec(
chartTf
);
const srcSec =
rsiTouchFlipTfPeriodSec(
sourceTf
);

if(
!(
chartSec >
0
) ||
!(
srcSec >
0
) ||
!source.length
){
return out;
}

let j =
0;

for(
let i =
0;
i <
chart.length;
i++
){
const open =
rsiTouchFlipUnixSec(
chart[i]?.time
);

if(
!Number.isFinite(
open
)
){
continue;
}

const cutoff =
open +
chartSec -
srcSec;

while(
j +
1 <
source.length &&
rsiTouchFlipUnixSec(
source[j + 1].time
) <=
cutoff
){
j++;
}

const srcOpen =
rsiTouchFlipUnixSec(
source[j]?.time
);
const value =
Number(
rsi[j]
);

if(
Number.isFinite(
srcOpen
) &&
srcOpen <=
cutoff &&
Number.isFinite(
value
)
){
out[i] =
value;
}

}

return out;

}

function mergeSourceRows(
left,
right
){

const byTime =
new Map();

for(
const row of [
...(
Array.isArray(
left
)
? left
: []
),
...(
Array.isArray(
right
)
? right
: []
)
]
){

const time =
rsiTouchFlipUnixSec(
row?.time
);

if(
Number.isFinite(
time
)
){
byTime.set(
time,
{
...row,
time
}
);
}

}

return Array.from(
byTime.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

}

/**
 * Источник покрывает первую и последнюю свечу графика и не рвётся посередине.
 * @param {Array<{time:number}>} rows
 * @param {Array<{time:number}>} chart
 * @param {string} chartTf
 * @param {string} sourceTf
 */
export function rsiTouchFlipSourceCoversChart(
rows,
chart,
chartTf,
sourceTf
){

const source =
Array.isArray(
rows
)
? rows
: [];
const bars =
Array.isArray(
chart
)
? chart
: [];
const srcSec =
rsiTouchFlipTfPeriodSec(
sourceTf
);
const chartSec =
rsiTouchFlipTfPeriodSec(
chartTf
);

if(
!source.length ||
!bars.length ||
!(
srcSec >
0
) ||
!(
chartSec >
0
) ||
klineGapFillEnds(
source,
sourceTf
).length
){
return false;
}

const srcStart =
rsiTouchFlipUnixSec(
source[0].time
);
const srcEnd =
rsiTouchFlipUnixSec(
source[source.length - 1].time
);
const first =
rsiTouchFlipUnixSec(
bars[0].time
);
const last =
rsiTouchFlipUnixSec(
bars[bars.length - 1].time
);
const firstCutoff =
first +
chartSec -
srcSec;

/*
 * Закрытие последней свечи графика может быть ещё впереди
 * (5m бар только открылся — минутного бара на его close нет).
 * Хватает источника на open этой свечи.
 */
return srcStart <=
firstCutoff +
srcSec &&
srcEnd +
srcSec >=
last;

}

async function repairSourceGaps(
rows,
symbol,
sourceTf,
loadHistory
){

let merged =
mergeSourceRows(
rows
);

for(
let attempt =
0;
attempt <
2;
attempt++
){

const fills =
klineGapFillEnds(
merged,
sourceTf
).slice(
0,
24
);

if(
!fills.length
){
break;
}

const extra =
[];

for(
const endMs of fills
){

const page =
await loadHistory(
symbol,
sourceTf,
1,
{
parallel:
false,
batchGapMs:
80,
endMs
}
);

if(
Array.isArray(
page
) &&
page.length
){
extra.push(
...page
);
}

}

const next =
mergeSourceRows(
merged,
extra
);

if(
next.length ===
merged.length
){
break;
}

merged =
next;

}

return merged;

}

async function extendSourceBackward(
rows,
needStartSec,
symbol,
sourceTf,
loadHistory
){

let merged =
mergeSourceRows(
rows
);

for(
let guard =
0;
guard <
15 &&
merged.length &&
rsiTouchFlipUnixSec(
merged[0].time
) >
needStartSec;
guard++
){

const older =
await loadHistory(
symbol,
sourceTf,
4,
{
parallel:
false,
batchGapMs:
80,
endMs:
Math.floor(
rsiTouchFlipUnixSec(
merged[0].time
) *
1000
) -
1
}
);
const next =
mergeSourceRows(
older,
merged
);

if(
!next.length ||
next[0].time >=
merged[0].time
){
break;
}

merged =
next;

}

return merged;

}

async function loadOneSourcePage(
symbol,
sourceTf,
endMs,
loadHistory
){

for(
let attempt =
0;
attempt <
3;
attempt++
){

const page =
await loadHistory(
symbol,
sourceTf,
1,
{
parallel:
false,
batchGapMs:
40,
endMs,
pageLimit:
1000
}
);

if(
Array.isArray(
page
) &&
page.length
){
return page;
}

}

return [];

}

async function walkSourceSeries(
symbol,
sourceTf,
endMs,
loadHistory,
chart,
chartTf,
maxPages
){

let rows =
[];
let cursor =
endMs;
const limit =
Math.max(
1,
Math.floor(
Number(
maxPages
) ||
1
)
);

for(
let i =
0;
i <
limit;
i++
){

const page =
await loadOneSourcePage(
symbol,
sourceTf,
cursor,
loadHistory
);

if(
!page.length
){
break;
}

const merged =
mergeSourceRows(
page,
rows
);

if(
rows.length &&
merged.length ===
rows.length
){
break;
}

rows =
merged;

if(
rsiTouchFlipSourceCoversChart(
rows,
chart,
chartTf,
sourceTf
)
){
break;
}

if(
page.length <
1000
){
break;
}

cursor =
Math.floor(
rsiTouchFlipUnixSec(
rows[0].time
) *
1000
) -
1;

}

return rows;

}

async function loadSourceCandles(
symbol,
sourceTf,
pages,
endMs,
loadHistory,
chart,
chartTf
){

const key =
[
String(
symbol ||
""
).toUpperCase(),
sourceTf,
pages,
endMs
].join(
"|"
);
const hit =
sourceCache.get(
key
);

if(
hit &&
rsiTouchFlipSourceCoversChart(
hit,
chart,
chartTf,
sourceTf
)
){
return hit;
}

const loaded =
await loadHistory(
symbol,
sourceTf,
pages,
{
parallel:
true,
batchGapMs:
0,
endMs
}
);
let rows =
Array.isArray(
loaded
)
? loaded
: [];

if(
!rows.length
){
throw new Error(
"нет свечей RSI ТФ"
);
}

rows =
await repairSourceGaps(
rows,
symbol,
sourceTf,
loadHistory
);

const chartBars =
Array.isArray(
chart
)
? chart
: [];
const srcSec =
rsiTouchFlipTfPeriodSec(
sourceTf
);
const chartSec =
rsiTouchFlipTfPeriodSec(
chartTf
);
const first =
rsiTouchFlipUnixSec(
chartBars[0]?.time
);

if(
Number.isFinite(
first
) &&
srcSec >
0 &&
chartSec >
0
){
rows =
await extendSourceBackward(
rows,
first +
chartSec -
srcSec,
symbol,
sourceTf,
loadHistory
);
}

if(
!rsiTouchFlipSourceCoversChart(
rows,
chart,
chartTf,
sourceTf
)
){
rows =
await walkSourceSeries(
symbol,
sourceTf,
endMs,
loadHistory,
chart,
chartTf,
pages
);
}

if(
!rows.length
){
throw new Error(
"нет свечей RSI ТФ"
);
}

if(
klineGapFillEnds(
rows,
sourceTf
).length ||
!rsiTouchFlipSourceCoversChart(
rows,
chart,
chartTf,
sourceTf
)
){
throw new Error(
`свечи RSI ${sourceTf} загружены не целиком`
);
}

sourceCache.set(
key,
rows
);

if(
sourceCache.size >
8
){
const first =
sourceCache.keys().next().value;
sourceCache.delete(
first
);
}

return rows;

}

/**
 * RSI, выровненный по свечам графика — как ta.rsi + request.security.
 * @param {Array} chartCandles
 * @param {object} rawSettings
 * @param {{ chartTf: string, symbol: string, loadHistory: Function }} host
 * @returns {Promise<number[]>}
 */
export async function resolveRsiTouchFlipChartRsi(
chartCandles,
rawSettings,
host
){

const settings =
normalizeRsiTouchFlipPrefs(
rawSettings
);
const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const rsiTf =
String(
settings.rsiTf ||
""
).trim();
const chartTf =
String(
host?.chartTf ||
""
).trim();

if(
!chart.length
){
return [];
}

if(
!rsiTf ||
rsiTf ===
chartTf
){

if(
klineGapFillEnds(
chart,
chartTf
).length
){
throw new Error(
"свечи графика загружены с дырами"
);
}

return computeWilderRsiValues(
chart,
settings.rsiLen
);
}

const chartSec =
rsiTouchFlipTfPeriodSec(
chartTf
);
const srcSec =
rsiTouchFlipTfPeriodSec(
rsiTf
);

if(
!(
chartSec >
0
) ||
!(
srcSec >
0
)
){
throw new Error(
"некорректный ТФ RSI"
);
}

const pages =
rsiTouchFlipSourcePages(
chart,
chartTf,
rsiTf,
settings.rsiLen
);
const last =
rsiTouchFlipUnixSec(
chart[chart.length - 1].time
);
const endMs =
(
last +
chartSec
) *
1000;
const source =
await loadSourceCandles(
host.symbol,
rsiTf,
pages,
endMs,
host.loadHistory,
chart,
chartTf
);
const sourceRsi =
computeWilderRsiValues(
source,
settings.rsiLen
);
return projectClosedSourceRsiOntoChart(
chart,
chartTf,
source,
rsiTf,
sourceRsi
);

}
