/**
 * MACD — как встроенный индикатор TradingView:
 * fast/slow MA(source) → MACD, signal MA(MACD), hist = MACD − signal.
 * Дефолты TV: 12 / 26 / close / 9 / EMA / EMA.
 */
import {
normalizeHtfTf
} from "./htf-project.js?v=2";

export const MACD_FAST_LENGTH =
12;

export const MACD_SLOW_LENGTH =
26;

export const MACD_SIGNAL_LENGTH =
9;

export const MACD_SOURCE =
"close";

export const MACD_OSC_MA =
"ema";

export const MACD_SIGNAL_MA =
"ema";

export const MACD_LINE_COLOR =
"#2962FF";

export const MACD_SIGNAL_COLOR =
"#FF6D00";

export const MACD_HIST_GROW_ABOVE =
"#26A69A";

export const MACD_HIST_FALL_ABOVE =
"#B2DFDB";

export const MACD_HIST_GROW_BELOW =
"#FFCDD2";

export const MACD_HIST_FALL_BELOW =
"#FF5252";

const SOURCES =
new Set(
[
"close",
"open",
"high",
"low",
"hl2",
"hlc3",
"ohlc4"
]
);

const MA_TYPES =
new Set(
[
"ema",
"sma"
]
);

export function defaultMacdSettings(){

return {
fastLength:
MACD_FAST_LENGTH,
slowLength:
MACD_SLOW_LENGTH,
signalLength:
MACD_SIGNAL_LENGTH,
source:
MACD_SOURCE,
oscillatorMa:
MACD_OSC_MA,
signalMa:
MACD_SIGNAL_MA,
tf:
""
};

}

function clampInt(
value,
min,
max,
fallback
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

export function normalizeMacdSettings(
raw
){

const base =
defaultMacdSettings();
const source =
String(
raw?.source ||
""
).toLowerCase();
const oscillatorMa =
String(
raw?.oscillatorMa ||
""
).toLowerCase();
const signalMa =
String(
raw?.signalMa ||
""
).toLowerCase();

return {
fastLength:
clampInt(
raw?.fastLength,
2,
999,
base.fastLength
),
slowLength:
clampInt(
raw?.slowLength,
2,
999,
base.slowLength
),
signalLength:
clampInt(
raw?.signalLength,
1,
999,
base.signalLength
),
source:
SOURCES.has(
source
)
? source
: base.source,
oscillatorMa:
MA_TYPES.has(
oscillatorMa
)
? oscillatorMa
: base.oscillatorMa,
signalMa:
MA_TYPES.has(
signalMa
)
? signalMa
: base.signalMa,
tf:
normalizeHtfTf(
raw?.tf
)
};

}

export function macdSourceValue(
bar,
source =
MACD_SOURCE
){

const open =
Number(
bar?.open
);
const high =
Number(
bar?.high
);
const low =
Number(
bar?.low
);
const close =
Number(
bar?.close
);

switch(
source
){
case "open":
return open;
case "high":
return high;
case "low":
return low;
case "hl2":
return (
high +
low
) /
2;
case "hlc3":
return (
high +
low +
close
) /
3;
case "ohlc4":
return (
open +
high +
low +
close
) /
4;
default:
return close;
}

}

function smaAt(
values,
period,
endIndex
){

let sum =
0;

for(
let i =
endIndex -
period +
1;
i <=
endIndex;
i++
){

const v =
values[
i
];

if(
v ==
null ||
!Number.isFinite(
v
)
){
return null;
}

sum +=
v;

}

return sum /
period;

}

function movingAverage(
values,
period,
type
){

const out =
new Array(
values.length
).fill(
null
);

if(
!Array.isArray(
values
) ||
period <
1 ||
values.length <
period
){
return out;
}

let start =
-1;

for(
let i =
0;
i <
values.length;
i++
){

if(
Number.isFinite(
values[
i
]
)
){
start =
i;
break;
}

}

if(
start <
0 ||
start +
period >
values.length
){
return out;
}

if(
type ===
"sma"
){

for(
let i =
start +
period -
1;
i <
values.length;
i++
){
out[
i
] =
smaAt(
values,
period,
i
);
}

return out;

}

let sum =
0;

for(
let i =
start;
i <
start +
period;
i++
){

const v =
values[
i
];

if(
!Number.isFinite(
v
)
){
return out;
}

sum +=
v;

}

const k =
2 /
(
period +
1
);

let ema =
sum /
period;

out[
start +
period -
1
] =
ema;

for(
let i =
start +
period;
i <
values.length;
i++
){

const v =
values[
i
];

if(
!Number.isFinite(
v
)
){
continue;
}

ema =
(
v -
ema
) *
k +
ema;
out[
i
] =
ema;

}

return out;

}

/**
 * @param {Array<{ time: number, open?: number, high?: number, low?: number, close?: number }>} candles
 * @param {ReturnType<typeof defaultMacdSettings>} [settings]
 * @returns {Array<{ time: number, macd: number|null, signal: number|null, hist: number|null }>}
 */
export function calculateMacd(
candles,
settings
){

const opts =
normalizeMacdSettings(
settings
);

if(
!candles?.length
){
return [];
}

const src =
candles.map(
bar=>
macdSourceValue(
bar,
opts.source
)
);

const fastMa =
movingAverage(
src,
opts.fastLength,
opts.oscillatorMa
);
const slowMa =
movingAverage(
src,
opts.slowLength,
opts.oscillatorMa
);
const macd =
src.map(
(_, i)=>{

const fast =
fastMa[
i
];
const slow =
slowMa[
i
];

if(
!Number.isFinite(
fast
) ||
!Number.isFinite(
slow
)
){
return null;
}

return fast -
slow;

}
);

const signal =
movingAverage(
macd,
opts.signalLength,
opts.signalMa
);

return candles.map(
(bar, i)=>{

const macdVal =
macd[
i
];
const signalVal =
signal[
i
];
const hist =
Number.isFinite(
macdVal
) &&
Number.isFinite(
signalVal
)
? macdVal -
signalVal
: null;

return {
time:
bar.time,
macd:
Number.isFinite(
macdVal
)
? macdVal
: null,
signal:
Number.isFinite(
signalVal
)
? signalVal
: null,
hist
};

}
);

}

export function macdHistColor(
hist,
prevHist
){

if(
hist ==
null ||
!Number.isFinite(
hist
)
){
return "rgba(120,123,134,0.2)";
}

const prev =
Number.isFinite(
prevHist
)
? prevHist
: hist;

if(
hist >=
0
){
return prev <
hist
? MACD_HIST_GROW_ABOVE
: MACD_HIST_FALL_ABOVE;
}

return prev <
hist
? MACD_HIST_GROW_BELOW
: MACD_HIST_FALL_BELOW;

}

export function formatMacdLegendValue(
value
){

if(
value ==
null ||
!Number.isFinite(
value
)
){
return "—";
}

const abs =
Math.abs(
value
);

if(
abs >=
100
){
return value.toFixed(
2
);
}

if(
abs >=
1
){
return value.toFixed(
4
);
}

return value.toFixed(
5
);

}
