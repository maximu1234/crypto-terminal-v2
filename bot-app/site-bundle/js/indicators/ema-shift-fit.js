/**
 * Подбор length + vertical shift (%) для EMA Shift:
 * lower — касание нижних экстремумов (support);
 * upper — касание верхних экстремумов (resistance).
 */
import {
calculateEMA
} from "./ma-math.js?v=a42e8535";

export const EMA_SHIFT_FIT_LOOKBACK_OPTIONS =
[
500,
1000,
2000
];

export const DEFAULT_EMA_SHIFT_FIT_LOOKBACK =
1000;

export const EMA_SHIFT_FIT_MIN_LENGTH =
14;

export const EMA_SHIFT_FIT_MAX_LENGTH =
200;

export const EMA_SHIFT_FIT_SIDE_LOWER =
"lower";

export const EMA_SHIFT_FIT_SIDE_UPPER =
"upper";

const PIVOT_LEFT =
2;

const PIVOT_RIGHT =
2;

const TOUCH_REL =
0.004;

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeEmaShiftFitLookback(
raw
){

const n =
Math.round(
Number(
raw
)
);

if(
EMA_SHIFT_FIT_LOOKBACK_OPTIONS.includes(
n
)
){
return n;
}

return DEFAULT_EMA_SHIFT_FIT_LOOKBACK;

}

/**
 * @param {unknown} raw
 * @returns {"lower"|"upper"}
 */
export function normalizeEmaShiftFitSide(
raw
){

return raw ===
EMA_SHIFT_FIT_SIDE_UPPER
? EMA_SHIFT_FIT_SIDE_UPPER
: EMA_SHIFT_FIT_SIDE_LOWER;

}

/**
 * @param {Array<{time:number, low?:number, high?:number, close?:number}>} candles
 * @param {"low"|"high"} field
 * @param {"min"|"max"} mode
 * @returns {Array<{index:number, time:number, price:number}>}
 */
function findPivots(
candles,
field,
mode
){

if(
!Array.isArray(
candles
) ||
candles.length <
PIVOT_LEFT +
PIVOT_RIGHT +
1
){
return [];
}

const out =
[];

for(
let i =
PIVOT_LEFT;
i <
candles.length -
PIVOT_RIGHT;
i++
){

const price =
Number(
candles[
i
]?.[
field
] ??
candles[
i
]?.close
);

if(
!Number.isFinite(
price
) ||
price <=
0
){
continue;
}

let isPivot =
true;

for(
let j =
i -
PIVOT_LEFT;
j <=
i +
PIVOT_RIGHT;
j++
){

if(
j ===
i
){
continue;
}

const other =
Number(
candles[
j
]?.[
field
] ??
candles[
j
]?.close
);

if(
!Number.isFinite(
other
)
){
isPivot =
false;
break;
}

if(
mode ===
"min" &&
other <
price
){
isPivot =
false;
break;
}

if(
mode ===
"max" &&
other >
price
){
isPivot =
false;
break;
}

}

if(
isPivot
){
out.push(
{
index:
i,
time:
candles[
i
].time,
price
}
);
}

}

return out;

}

/**
 * Локальные минимумы (pivot lows) на окне.
 * @param {Array<{time:number, low?:number, close?:number}>} candles
 * @returns {Array<{index:number, time:number, low:number}>}
 */
export function findPivotLows(
candles
){

return findPivots(
candles,
"low",
"min"
).map(
p=>({
index:
p.index,
time:
p.time,
low:
p.price
})
);

}

/**
 * Локальные максимумы (pivot highs) на окне.
 * @param {Array<{time:number, high?:number, close?:number}>} candles
 * @returns {Array<{index:number, time:number, high:number}>}
 */
export function findPivotHighs(
candles
){

return findPivots(
candles,
"high",
"max"
).map(
p=>({
index:
p.index,
time:
p.time,
high:
p.price
})
);

}

/**
 * @param {Array<{time:number, value:number}>} emaPoints
 * @returns {Map<number, number>}
 */
function emaByTimeMap(
emaPoints
){

return new Map(
emaPoints.map(
point=>[
point.time,
point.value
]
)
);

}

/**
 * EMA source → значение на времени chart-бара (как htf-ema).
 * @param {Array<{time:number}>} chartCandles
 * @param {Array<{time:number}>} sourceCandles
 * @param {Map<number, number>} emaByTime
 * @param {number} chartIndex
 * @returns {number|null}
 */
function emaAtChartIndex(
chartCandles,
sourceCandles,
emaByTime,
chartIndex
){

const bar =
chartCandles[
chartIndex
];

if(
!bar
){
return null;
}

let htfIdx =
0;

while(
htfIdx +
1 <
sourceCandles.length &&
sourceCandles[
htfIdx +
1
].time <=
bar.time
){
htfIdx++;
}

const htfTime =
sourceCandles[
htfIdx
]?.time;

if(
htfTime ==
null ||
htfTime >
bar.time
){
return null;
}

const ema =
emaByTime.get(
htfTime
);

return Number.isFinite(
ema
) &&
ema >
0
? ema
: null;

}

/**
 * @param {"lower"|"upper"} side
 * @param {Array<{index:number, price:number}>} pivots
 * @returns {{ length:number, shift:number, score:number, touches:number, pivotsUsed:number }|null}
 */
function scoreLength(
side,
length,
chartWindow,
sourceCandles,
pivots
){

const emaPoints =
calculateEMA(
sourceCandles,
length
);

if(
emaPoints.length <
2
){
return null;
}

const emaByTime =
emaByTimeMap(
emaPoints
);
const idealShifts =
[];
const paired =
[];

for(
const pivot of pivots
){

const ema =
emaAtChartIndex(
chartWindow,
sourceCandles,
emaByTime,
pivot.index
);

if(
ema ==
null
){
continue;
}

const ideal =
(
pivot.price /
ema -
1
) *
100;

if(
!Number.isFinite(
ideal
)
){
continue;
}

idealShifts.push(
ideal
);
paired.push(
{
price:
pivot.price,
ema
}
);

}

if(
paired.length <
2
){
return null;
}

const shift =
side ===
EMA_SHIFT_FIT_SIDE_UPPER
? Math.max(
...idealShifts
)
: Math.min(
...idealShifts
);
const multiplier =
1 +
shift /
100;

let gapSum =
0;
let touches =
0;

for(
const row of paired
){

const shifted =
row.ema *
multiplier;
const gap =
side ===
EMA_SHIFT_FIT_SIDE_UPPER
? (
shifted -
row.price
) /
row.price
: (
row.price -
shifted
) /
row.price;

if(
!Number.isFinite(
gap
) ||
gap <
-1e-6
){
return null;
}

gapSum +=
gap;

if(
gap <=
TOUCH_REL
){
touches++;
}

}

const score =
gapSum /
paired.length;

return {
length,
shift:
Math.round(
shift *
10
) /
10,
score,
touches,
pivotsUsed:
paired.length
};

}

/**
 * @param {{
 *   side?: "lower"|"upper",
 *   chartCandles: Array<object>,
 *   sourceCandles?: Array<object>,
 *   lookback?: number,
 *   minLength?: number,
 *   maxLength?: number
 * }} opts
 * @returns {{ length:number, shift:number, score:number, touches:number, pivotsUsed:number, lookback:number, side:string }|null}
 */
export function fitEmaShiftToExtremes(
opts =
{}
){

const side =
normalizeEmaShiftFitSide(
opts.side
);
const chartCandles =
Array.isArray(
opts.chartCandles
)
? opts.chartCandles
: [];
const sourceCandles =
Array.isArray(
opts.sourceCandles
) &&
opts.sourceCandles.length
? opts.sourceCandles
: chartCandles;
const lookback =
normalizeEmaShiftFitLookback(
opts.lookback
);
const minLength =
Math.max(
1,
Math.round(
Number(
opts.minLength
) ||
EMA_SHIFT_FIT_MIN_LENGTH
)
);
const maxLength =
Math.max(
minLength,
Math.round(
Number(
opts.maxLength
) ||
EMA_SHIFT_FIT_MAX_LENGTH
)
);

if(
chartCandles.length <
PIVOT_LEFT +
PIVOT_RIGHT +
8
){
return null;
}

const windowStart =
Math.max(
0,
chartCandles.length -
lookback
);
const chartWindow =
chartCandles.slice(
windowStart
);
const pivots =
(
side ===
EMA_SHIFT_FIT_SIDE_UPPER
? findPivotHighs(
chartWindow
)
: findPivotLows(
chartWindow
)
).map(
p=>({
index:
p.index,
price:
p.high ??
p.low
})
);

if(
pivots.length <
2
){
return null;
}

let best =
null;

for(
let length =
minLength;
length <=
maxLength;
length++
){

const candidate =
scoreLength(
side,
length,
chartWindow,
sourceCandles,
pivots
);

if(
!candidate
){
continue;
}

/* Больше касаний важнее узкого gap; при равенстве — более длинная EMA. */
if(
!best ||
candidate.touches >
best.touches ||
(
candidate.touches ===
best.touches &&
(
candidate.score <
best.score -
1e-9 ||
(
Math.abs(
candidate.score -
best.score
) <=
1e-9 &&
candidate.length >
best.length
)
)
)
){
best =
candidate;
}

}

if(
!best
){
return null;
}

return {
...best,
lookback,
side
};

}

/**
 * @param {object} [opts]
 */
export function fitEmaShiftToLowerExtremes(
opts =
{}
){

return fitEmaShiftToExtremes(
{
...opts,
side:
EMA_SHIFT_FIT_SIDE_LOWER
}
);

}

/**
 * @param {object} [opts]
 */
export function fitEmaShiftToUpperExtremes(
opts =
{}
){

return fitEmaShiftToExtremes(
{
...opts,
side:
EMA_SHIFT_FIT_SIDE_UPPER
}
);

}
