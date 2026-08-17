/**
 * EMA Shift-фильтр входов (АлгоТрейдинг, панель «Данные» + сканер).
 * Два независимых фильтра со сдвигом % и ТФ (как EMA Shift Ribbon).
 * Long валиден, если цена входа выше каждой включённой линии;
 * short — если ниже каждой. Нет значения линии — вход отбраковывается.
 * HTF считается только агрегацией свечей графика, без догрузки с биржи.
 */
import {
calculateShiftedEmaSeries
} from "../indicators/htf-ema.js?v=1";

import {
aggregateCandlesToTf
} from "../indicators/htf-loader.js?v=3";

export const DEFAULT_ALGO_EMA_PERIOD =
200;

export const DEFAULT_ALGO_EMA_PERIOD_2 =
50;

export const DEFAULT_ALGO_EMA_SHIFT =
0;

export const MIN_ALGO_EMA_PERIOD =
1;

export const MAX_ALGO_EMA_PERIOD =
1000;

export const MIN_ALGO_EMA_SHIFT =
-99;

export const MAX_ALGO_EMA_SHIFT =
500;

/** Как у EMA Shift Ribbon: "" = текущий ТФ графика. */
export const ALGO_EMA_SHIFT_TF_OPTIONS =
[
{
value:
"",
label:
"Текущий"
},
{
value:
"1",
label:
"1m"
},
{
value:
"5",
label:
"5m"
},
{
value:
"15",
label:
"15m"
},
{
value:
"60",
label:
"1h"
},
{
value:
"240",
label:
"4h"
},
{
value:
"D",
label:
"1D"
}
];

const ALGO_EMA_SHIFT_TF_VALUES =
new Set(
ALGO_EMA_SHIFT_TF_OPTIONS.map(
opt=>
opt.value
)
);

/**
 * @param {unknown} raw
 * @param {number} [fallback]
 * @returns {number}
 */
export function clampAlgoEmaPeriod(
raw,
fallback =
DEFAULT_ALGO_EMA_PERIOD
){

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

if(
n <
MIN_ALGO_EMA_PERIOD
){
return MIN_ALGO_EMA_PERIOD;
}

return Math.min(
MAX_ALGO_EMA_PERIOD,
n
);

}

/**
 * @param {unknown} raw
 * @param {number} [fallback]
 * @returns {number}
 */
export function clampAlgoEmaShift(
raw,
fallback =
DEFAULT_ALGO_EMA_SHIFT
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
return fallback;
}

return Math.min(
MAX_ALGO_EMA_SHIFT,
Math.max(
MIN_ALGO_EMA_SHIFT,
n
)
);

}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeAlgoEmaTf(
raw
){

const tf =
String(
raw ??
""
).trim();

return ALGO_EMA_SHIFT_TF_VALUES.has(
tf
)
? tf
: "";

}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function normalizeAlgoEmaFilterEnabled(
raw
){

return raw ===
true ||
raw ===
"true" ||
raw ===
1;

}

/**
 * @param {Array} chartCandles
 * @param {string} bandTf
 * @param {string} [chartTf]
 * @returns {Array}
 */
export function resolveAlgoEmaSourceCandles(
chartCandles,
bandTf,
chartTf =
""
){

const list =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const selected =
normalizeAlgoEmaTf(
bandTf
);

if(
!selected
){
return list;
}

return aggregateCandlesToTf(
list,
selected,
chartTf
);

}

/**
 * Сдвинутая EMA, выровненная по индексам свечей графика.
 *
 * @param {Array} candles
 * @param {{
 *   period: number,
 *   shift?: number,
 *   tf?: string,
 *   chartTf?: string
 * }} line
 * @returns {number[]}
 */
export function buildAlgoEmaByBar(
candles,
line =
{}
){

const list =
Array.isArray(
candles
)
? candles
: [];
const out =
new Array(
list.length
).fill(
Number.NaN
);
const period =
clampAlgoEmaPeriod(
line.period
);
const shift =
clampAlgoEmaShift(
line.shift
);
const source =
resolveAlgoEmaSourceCandles(
list,
line.tf,
line.chartTf
);

if(
source.length <
period
){
return out;
}

const points =
calculateShiftedEmaSeries(
list,
source,
period,
shift
);

if(
!points.length
){
return out;
}

const byTime =
new Map(
points.map(
point=>[
point.time,
point.value
]
)
);

for(
let i =
0;
i <
list.length;
i++
){

const value =
byTime.get(
list[
i
]?.time
);

if(
Number.isFinite(
value
)
){
out[
i
] =
value;
}

}

return out;

}

/**
 * Точки для отрисовки линии фильтра на графике.
 *
 * @param {Array} candles
 * @param {object} line
 * @returns {Array<{time: number, value: number}>}
 */
export function buildAlgoEmaLinePoints(
candles,
line =
{}
){

const list =
Array.isArray(
candles
)
? candles
: [];
const period =
clampAlgoEmaPeriod(
line.period
);
const shift =
clampAlgoEmaShift(
line.shift
);
const source =
resolveAlgoEmaSourceCandles(
list,
line.tf,
line.chartTf
);

if(
source.length <
period
){
return [];
}

return calculateShiftedEmaSeries(
list,
source,
period,
shift
);

}

/**
 * @param {"long"|"short"} side
 * @param {number} price
 * @param {number} ema
 * @returns {boolean}
 */
export function isAlgoEmaEntryValid(
side,
price,
ema
){

if(
!Number.isFinite(
price
) ||
!Number.isFinite(
ema
)
){
return false;
}

if(
side ===
"short"
){
return price <
ema;
}

return price >
ema;

}

/**
 * @typedef {{
 *   period: number,
 *   shift: number,
 *   tf: string
 * }} AlgoEmaFilterLine
 */

/**
 * Включённые линии фильтра.
 *
 * @param {object} [opts]
 * @returns {AlgoEmaFilterLine[]}
 */
export function collectActiveAlgoEmaLines(
opts =
{}
){

const lines =
[];

if(
normalizeAlgoEmaFilterEnabled(
opts.emaFilter
)
){
lines.push(
{
period:
clampAlgoEmaPeriod(
opts.emaPeriod
),
shift:
clampAlgoEmaShift(
opts.emaShift
),
tf:
normalizeAlgoEmaTf(
opts.emaTf
)
}
);
}

if(
normalizeAlgoEmaFilterEnabled(
opts.emaFilter2
)
){
lines.push(
{
period:
clampAlgoEmaPeriod(
opts.emaPeriod2,
DEFAULT_ALGO_EMA_PERIOD_2
),
shift:
clampAlgoEmaShift(
opts.emaShift2
),
tf:
normalizeAlgoEmaTf(
opts.emaTf2
)
}
);
}

const seen =
new Set();
const unique =
[];

for(
const line of lines
){

const key =
`${line.period}|${line.shift}|${line.tf}`;

if(
seen.has(
key
)
){
continue;
}

seen.add(
key
);
unique.push(
line
);

}

return unique;

}

/** @deprecated use collectActiveAlgoEmaLines */
export function collectActiveAlgoEmaPeriods(
opts =
{}
){

return collectActiveAlgoEmaLines(
opts
).map(
line=>
line.period
);

}

/**
 * Убирает события входа, не прошедшие все включённые сдвинутые EMA.
 *
 * @param {Array} candles
 * @param {Array} events
 * @param {object} [opts]
 * @returns {Array}
 */
export function filterEntryEventsByEma(
candles,
events,
opts =
{}
){

const list =
Array.isArray(
events
)
? events
: [];
const lines =
collectActiveAlgoEmaLines(
opts
);

if(
!lines.length ||
!list.length
){
return list;
}

const bars =
Array.isArray(
candles
)
? candles.length
: 0;
const chartTf =
String(
opts.chartTf ||
""
).trim();
const series =
lines.map(
line=>
buildAlgoEmaByBar(
candles,
{
...line,
chartTf
}
)
);

return list.filter(
event=>{

if(
event?.type !==
"entry"
){
return true;
}

const bar =
Number(
event.bar
);

if(
!Number.isInteger(
bar
) ||
bar <
0 ||
bar >=
bars
){
return false;
}

const price =
Number(
event.price
);

return series.every(
ema=>
isAlgoEmaEntryValid(
event.side,
price,
ema[
bar
]
)
);

}
);

}
