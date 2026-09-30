/**
 * MACD Touch Flip — request.security как в pine (lookahead_off).
 * На закрытии свечи графика берём MACD последнего уже закрытого бара источника.
 * 1m на 5m — младший ТФ, не HTF-проекция по open.
 */
import {
computeMacdLineSignalArrays
} from "./macd-flip-touch-macd.js?v=1";
import {
normalizeMacdFlipTouchPrefs
} from "./macd-flip-touch-prefs.js?v=9";

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
export function macdFlipTouchTfPeriodSec(
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
export function macdFlipTouchUnixSec(
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
export function macdFlipTouchChartDays(
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
macdFlipTouchUnixSec(
rows[0].time
);
const last =
macdFlipTouchUnixSec(
rows[rows.length - 1].time
);
const period =
macdFlipTouchTfPeriodSec(
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
export function macdFlipTouchSourcePages(
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
macdFlipTouchTfPeriodSec(
chartTf
);
const srcSec =
macdFlipTouchTfPeriodSec(
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
macdFlipTouchUnixSec(
rows[0].time
);
const last =
macdFlipTouchUnixSec(
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
 * @param {number[]} sourceSeries
 * @returns {number[]}
 */
export function projectClosedSourceSeriesOntoChart(
chartCandles,
chartTf,
sourceCandles,
sourceTf,
sourceSeries
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
sourceSeries
)
? sourceSeries
: [];
const out =
new Array(
chart.length
).fill(
NaN
);
const chartSec =
macdFlipTouchTfPeriodSec(
chartTf
);
const srcSec =
macdFlipTouchTfPeriodSec(
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
macdFlipTouchUnixSec(
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
macdFlipTouchUnixSec(
source[j + 1].time
) <=
cutoff
){
j++;
}

const srcOpen =
macdFlipTouchUnixSec(
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

async function loadSourceCandles(
symbol,
sourceTf,
pages,
endMs,
loadHistory
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
hit
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
const rows =
Array.isArray(
loaded
)
? loaded
: [];

if(
!rows.length
){
throw new Error(
"нет свечей MACD ТФ"
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
 * MACD + Signal, выровненные по свечам графика (lookahead_off на младшем ТФ).
 * @param {Array} chartCandles
 * @param {object} rawSettings
 * @param {{ chartTf: string, symbol: string, loadHistory: Function }} host
 * @returns {Promise<{ macdValues: number[], signalValues: number[] }>}
 */
export async function resolveMacdFlipTouchChartMacd(
chartCandles,
rawSettings,
host
){

const settings =
normalizeMacdFlipTouchPrefs(
rawSettings
);
const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const macdTf =
String(
settings.macdTf ||
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
return {
macdValues:
[],
signalValues:
[]
};
}

if(
!macdTf ||
macdTf ===
chartTf
){
const same =
computeMacdLineSignalArrays(
chart,
settings
);
return {
macdValues:
same.macd,
signalValues:
same.signal
};
}

const chartSec =
macdFlipTouchTfPeriodSec(
chartTf
);
const srcSec =
macdFlipTouchTfPeriodSec(
macdTf
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
"некорректный ТФ MACD"
);
}

const pages =
macdFlipTouchSourcePages(
chart,
chartTf,
macdTf,
Math.max(
Number(
settings.slowLength
) ||
0,
40
)
);
const last =
macdFlipTouchUnixSec(
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
macdTf,
pages,
endMs,
host.loadHistory
);
const sourceSeries =
computeMacdLineSignalArrays(
source,
settings
);
return {
macdValues:
projectClosedSourceSeriesOntoChart(
chart,
chartTf,
source,
macdTf,
sourceSeries.macd
),
signalValues:
projectClosedSourceSeriesOntoChart(
chart,
chartTf,
source,
macdTf,
sourceSeries.signal
)
};

}
