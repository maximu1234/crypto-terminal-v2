/**
 * Supertrend (TradingView / Kivanc): ATR(RMA) + factor.
 * Зелёная и красная линии — раздельные серии (не одна линия со сменой цвета).
 */
export const DEFAULT_SUPERTREND_ATR_LENGTH =
10;

export const DEFAULT_SUPERTREND_FACTOR =
3;

export const MIN_SUPERTREND_ATR_LENGTH =
1;

export const MAX_SUPERTREND_ATR_LENGTH =
100;

export const MIN_SUPERTREND_FACTOR =
0.1;

export const MAX_SUPERTREND_FACTOR =
100;

/**
 * @param {unknown} raw
 * @param {number} [fallback]
 * @returns {number}
 */
export function clampSupertrendAtrLength(
raw,
fallback =
DEFAULT_SUPERTREND_ATR_LENGTH
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

return Math.min(
MAX_SUPERTREND_ATR_LENGTH,
Math.max(
MIN_SUPERTREND_ATR_LENGTH,
n
)
);

}

/**
 * @param {unknown} raw
 * @param {number} [fallback]
 * @returns {number}
 */
export function clampSupertrendFactor(
raw,
fallback =
DEFAULT_SUPERTREND_FACTOR
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

const rounded =
Math.round(
n *
100
) /
100;

return Math.min(
MAX_SUPERTREND_FACTOR,
Math.max(
MIN_SUPERTREND_FACTOR,
rounded
)
);

}

/**
 * Wilder RMA ATR — как ta.atr в Pine.
 * @param {Array<{ high:number, low:number, close:number }>} candles
 * @param {number} period
 * @returns {number[]}
 */
export function calculateAtrRma(
candles,
period
){

const list =
Array.isArray(
candles
)
? candles
: [];
const len =
list.length;
const out =
new Array(
len
).fill(
Number.NaN
);
const p =
clampSupertrendAtrLength(
period
);

if(
len <
p +
1
){
return out;
}

const tr =
new Array(
len
).fill(
Number.NaN
);

for(
let i =
0;
i <
len;
i++
){

const high =
Number(
list[
i
].high
);
const low =
Number(
list[
i
].low
);
const close =
Number(
list[
i
].close
);

if(
!Number.isFinite(
high
) ||
!Number.isFinite(
low
) ||
!Number.isFinite(
close
)
){
continue;
}

if(
i ===
0
){
tr[
i
] =
high -
low;
continue;
}

const prevClose =
Number(
list[
i -
1
].close
);

if(
!Number.isFinite(
prevClose
)
){
tr[
i
] =
high -
low;
continue;
}

tr[
i
] =
Math.max(
high -
low,
Math.abs(
high -
prevClose
),
Math.abs(
low -
prevClose
)
);

}

let sum =
0;
let ready =
true;

for(
let i =
1;
i <=
p;
i++
){

const v =
tr[
i
];

if(
!Number.isFinite(
v
)
){
ready =
false;
break;
}

sum +=
v;

}

if(
!ready
){
return out;
}

out[
p
] =
sum /
p;

for(
let i =
p +
1;
i <
len;
i++
){

const v =
tr[
i
];
const prev =
out[
i -
1
];

if(
!Number.isFinite(
v
) ||
!Number.isFinite(
prev
)
){
continue;
}

out[
i
] =
(
prev *
(
p -
1
) +
v
) /
p;

}

return out;

}

/**
 * @typedef {{
 *   time: number,
 *   direction: 1|-1,
 *   value: number,
 *   up: number,
 *   down: number
 * }} SupertrendBar
 */

/**
 * @param {Array<{ time:number, high:number, low:number, close:number }>} candles
 * @param {number} [atrLength]
 * @param {number} [factor]
 * @returns {{
 *   atrLength: number,
 *   factor: number,
 *   direction: number[],
 *   value: number[],
 *   up: number[],
 *   down: number[],
 *   bars: SupertrendBar[]
 * }}
 */
export function calculateSupertrend(
candles,
atrLength =
DEFAULT_SUPERTREND_ATR_LENGTH,
factor =
DEFAULT_SUPERTREND_FACTOR
){

const list =
Array.isArray(
candles
)
? candles
: [];
const len =
list.length;
const period =
clampSupertrendAtrLength(
atrLength
);
const mult =
clampSupertrendFactor(
factor
);
const atr =
calculateAtrRma(
list,
period
);
const direction =
new Array(
len
).fill(
0
);
const value =
new Array(
len
).fill(
Number.NaN
);
const upArr =
new Array(
len
).fill(
Number.NaN
);
const downArr =
new Array(
len
).fill(
Number.NaN
);
const bars =
[];

let prevUp =
Number.NaN;
let prevDn =
Number.NaN;
let trend =
1;

for(
let i =
0;
i <
len;
i++
){

const atrV =
atr[
i
];
const high =
Number(
list[
i
].high
);
const low =
Number(
list[
i
].low
);
const close =
Number(
list[
i
].close
);
const time =
Number(
list[
i
].time
);

if(
!Number.isFinite(
atrV
) ||
!Number.isFinite(
high
) ||
!Number.isFinite(
low
) ||
!Number.isFinite(
close
) ||
!Number.isFinite(
time
)
){
continue;
}

const src =
(
high +
low
) /
2;
let up =
src -
mult *
atrV;
let dn =
src +
mult *
atrV;

if(
Number.isFinite(
prevUp
)
){

const prevClose =
Number(
list[
i -
1
]?.close
);

if(
Number.isFinite(
prevClose
) &&
prevClose >
prevUp
){
up =
Math.max(
up,
prevUp
);
}

}else{
prevUp =
up;
}

if(
Number.isFinite(
prevDn
)
){

const prevClose =
Number(
list[
i -
1
]?.close
);

if(
Number.isFinite(
prevClose
) &&
prevClose <
prevDn
){
dn =
Math.min(
dn,
prevDn
);
}

}else{
prevDn =
dn;
}

if(
i ===
0 ||
!Number.isFinite(
prevUp
) ||
!Number.isFinite(
prevDn
)
){
trend =
1;
}else if(
trend ===
-1
){
trend =
close >
prevDn
? 1
: -1;
}else{
trend =
close <
prevUp
? -1
: 1;
}

const st =
trend ===
1
? up
: dn;

direction[
i
] =
trend;
value[
i
] =
st;

if(
trend ===
1
){
upArr[
i
] =
up;
}else{
downArr[
i
] =
dn;
}

bars.push(
{
time,
direction:
trend,
value:
st,
up:
trend ===
1
? up
: Number.NaN,
down:
trend ===
-1
? dn
: Number.NaN
}
);

prevUp =
up;
prevDn =
dn;

}

return {
atrLength:
period,
factor:
mult,
direction,
value,
up:
upArr,
down:
downArr,
bars
};

}

/**
 * Line/whitespace точки для двух цветов.
 * Whitespace в одной LWC LineSeries не рвёт линию — valued-точки
 * соединяются сквозь дыры. Для разрывов как на TradingView вызывающий
 * код должен splitSupertrendValuedSegments и рисовать сегмент отдельной серией.
 * @param {ReturnType<typeof calculateSupertrend>} computed
 * @returns {{ up: Array<{time:number, value?:number}>, down: Array<{time:number, value?:number}> }}
 */
export function supertrendToLineData(
computed
){

const up =
[];
const down =
[];
const bars =
computed?.bars ||
[];

for(
const bar of bars
){

if(
bar.direction ===
1 &&
Number.isFinite(
bar.up
)
){
up.push(
{
time:
bar.time,
value:
bar.up
}
);
down.push(
{
time:
bar.time
}
);
}else if(
bar.direction ===
-1 &&
Number.isFinite(
bar.down
)
){
down.push(
{
time:
bar.time,
value:
bar.down
}
);
up.push(
{
time:
bar.time
}
);
}

}

return {
up,
down
};

}

/**
 * Непрерывные куски со value; точки без value — разрыв (новая линия).
 * @param {Array<{time:number, value?:number}>} points
 * @returns {Array<Array<{time:number, value:number}>>}
 */
export function splitSupertrendValuedSegments(
points
){

const segments =
[];
let cur =
[];

for(
const p of Array.isArray(
points
)
? points
: []
){

if(
Number.isFinite(
p?.value
)
){
cur.push(
{
time:
p.time,
value:
p.value
}
);
}else if(
cur.length
){
segments.push(
cur
);
cur =
[];
}

}

if(
cur.length
){
segments.push(
cur
);
}

return segments;

}

/**
 * Supertrend с HTF: значения на свечах графика (зелёная/красная раздельно).
 * @param {Array} chartCandles
 * @param {Array} sourceCandles
 * @param {number} [atrLength]
 * @param {number} [factor]
 * @returns {{ up: Array<{time:number, value?:number}>, down: Array<{time:number, value?:number}> }}
 */
export function buildSupertrendChartLineData(
chartCandles,
sourceCandles,
atrLength =
DEFAULT_SUPERTREND_ATR_LENGTH,
factor =
DEFAULT_SUPERTREND_FACTOR
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
) &&
sourceCandles.length
? sourceCandles
: chart;

if(
!chart.length
){
return {
up:
[],
down:
[]
};

}

if(
source ===
chart ||
(
source.length ===
chart.length &&
source[
0
] ===
chart[
0
]
)
){
return supertrendToLineData(
calculateSupertrend(
chart,
atrLength,
factor
)
);

}

const computed =
calculateSupertrend(
source,
atrLength,
factor
);
const up =
[];
const down =
[];
let htfIdx =
0;

for(
const bar of chart
){

const t =
Number(
bar.time
);

if(
!Number.isFinite(
t
)
){
continue;
}

while(
htfIdx +
1 <
source.length &&
Number(
source[
htfIdx +
1
].time
) <=
t
){
htfIdx++;
}

const srcTime =
Number(
source[
htfIdx
]?.time
);

if(
!Number.isFinite(
srcTime
) ||
srcTime >
t
){
up.push(
{
time:
t
}
);
down.push(
{
time:
t
}
);
continue;
}

const dir =
computed.direction[
htfIdx
];
const upV =
computed.up[
htfIdx
];
const downV =
computed.down[
htfIdx
];

if(
dir ===
1 &&
Number.isFinite(
upV
)
){
up.push(
{
time:
t,
value:
upV
}
);
down.push(
{
time:
t
}
);
}else if(
dir ===
-1 &&
Number.isFinite(
downV
)
){
down.push(
{
time:
t,
value:
downV
}
);
up.push(
{
time:
t
}
);
}else{
up.push(
{
time:
t
}
);
down.push(
{
time:
t
}
);
}

}

return {
up,
down
};

}
