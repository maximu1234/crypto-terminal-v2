/**
 * Supertrend-фильтр входов (АлгоТрейдинг, панель «Данные»).
 * Общий для всех стратегий; отдельные настройки Long / Short.
 * Long: цена выше зелёной линии (uptrend).
 * Short: цена ниже красной линии (downtrend).
 */
import {
aggregateCandlesToTf
} from "../indicators/htf-loader.js?v=3";

import {
buildSupertrendChartLineData,
calculateSupertrend,
clampSupertrendAtrLength,
clampSupertrendFactor,
DEFAULT_SUPERTREND_ATR_LENGTH,
DEFAULT_SUPERTREND_FACTOR
} from "../indicators/supertrend-math.js?v=3";

export const ALGO_SUPERTREND_TF_OPTIONS =
[
{ value: "", label: "Текущий" },
{ value: "1", label: "1m" },
{ value: "5", label: "5m" },
{ value: "15", label: "15m" },
{ value: "60", label: "1h" },
{ value: "240", label: "4h" },
{ value: "D", label: "1D" }
];

const ALGO_SUPERTREND_TF_VALUES =
new Set(
ALGO_SUPERTREND_TF_OPTIONS.map(
opt=>
opt.value
)
);

export {
DEFAULT_SUPERTREND_ATR_LENGTH as DEFAULT_ALGO_SUPERTREND_ATR,
DEFAULT_SUPERTREND_FACTOR as DEFAULT_ALGO_SUPERTREND_FACTOR,
clampSupertrendAtrLength as clampAlgoSupertrendAtr,
clampSupertrendFactor as clampAlgoSupertrendFactor
};

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function normalizeAlgoSupertrendFilterEnabled(
raw
){

return raw ===
true ||
raw ===
1 ||
raw ===
"1" ||
raw ===
"true";

}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeAlgoSupertrendTf(
raw
){

const tf =
String(
raw ??
""
).trim();

return ALGO_SUPERTREND_TF_VALUES.has(
tf
)
? tf
: "";

}

/**
 * @param {Array} chartCandles
 * @param {string} bandTf
 * @param {string} [chartTf]
 * @returns {Array}
 */
export function resolveAlgoSupertrendSourceCandles(
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
normalizeAlgoSupertrendTf(
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
 * @param {Array} candles
 * @param {{
 *   atrLength?: number,
 *   factor?: number,
 *   tf?: string,
 *   chartTf?: string
 * }} opts
 * @returns {{ up: number[], down: number[], direction: number[] }}
 */
export function buildAlgoSupertrendByBar(
candles,
opts =
{}
){

const list =
Array.isArray(
candles
)
? candles
: [];
const len =
list.length;
const up =
new Array(
len
).fill(
Number.NaN
);
const down =
new Array(
len
).fill(
Number.NaN
);
const direction =
new Array(
len
).fill(
0
);

if(
!len
){
return {
up,
down,
direction
};

}

const source =
resolveAlgoSupertrendSourceCandles(
list,
opts.tf,
opts.chartTf
);
const computed =
calculateSupertrend(
source,
opts.atrLength,
opts.factor
);

if(
!source.length ||
source ===
list
){
return {
up:
computed.up.slice(),
down:
computed.down.slice(),
direction:
computed.direction.slice()
};

}

let htfIdx =
0;

for(
let i =
0;
i <
len;
i++
){

const t =
Number(
list[
i
].time
);

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
continue;
}

/* индекс в computed совпадает с source */
up[
i
] =
computed.up[
htfIdx
];
down[
i
] =
computed.down[
htfIdx
];
direction[
i
] =
computed.direction[
htfIdx
];

}

return {
up,
down,
direction
};

}

/**
 * Точки линий фильтра для отрисовки на графике.
 * @param {Array} candles
 * @param {{
 *   atrLength?: number,
 *   factor?: number,
 *   tf?: string,
 *   chartTf?: string
 * }} opts
 * @returns {{ up: Array<{time:number, value?:number}>, down: Array<{time:number, value?:number}> }}
 */
export function buildAlgoSupertrendLineData(
candles,
opts =
{}
){

const list =
Array.isArray(
candles
)
? candles
: [];

if(
!list.length
){
return {
up:
[],
down:
[]
};

}

const source =
resolveAlgoSupertrendSourceCandles(
list,
opts.tf,
opts.chartTf
);

return buildSupertrendChartLineData(
list,
source,
opts.atrLength,
opts.factor
);

}

/**
 * @param {"long"|"short"} side
 * @param {number} price
 * @param {number} up
 * @param {number} down
 * @returns {boolean}
 */
export function isAlgoSupertrendEntryValid(
side,
price,
up,
down
){

if(
!Number.isFinite(
price
)
){
return false;
}

if(
side ===
"short"
){
return Number.isFinite(
down
) &&
price <
down;
}

return Number.isFinite(
up
) &&
price >
up;

}

/**
 * @param {Array} candles
 * @param {Array} events
 * @param {object} [opts]
 * @returns {Array}
 */
export function filterEntryEventsBySupertrend(
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
const longOn =
normalizeAlgoSupertrendFilterEnabled(
opts.supertrendLongFilter
);
const shortOn =
normalizeAlgoSupertrendFilterEnabled(
opts.supertrendShortFilter
);

if(
(
!longOn &&
!shortOn
) ||
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

const longSeries =
longOn
? buildAlgoSupertrendByBar(
candles,
{
atrLength:
opts.supertrendLongAtr,
factor:
opts.supertrendLongFactor,
tf:
opts.supertrendLongTf,
chartTf
}
)
: null;

const shortSeries =
shortOn
? buildAlgoSupertrendByBar(
candles,
{
atrLength:
opts.supertrendShortAtr,
factor:
opts.supertrendShortFactor,
tf:
opts.supertrendShortTf,
chartTf
}
)
: null;

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
const side =
event.side ===
"short"
? "short"
: "long";

if(
side ===
"long"
){

if(
!longOn
){
return true;
}

return isAlgoSupertrendEntryValid(
"long",
price,
longSeries.up[
bar
],
longSeries.down[
bar
]
);

}

if(
!shortOn
){
return true;
}

return isAlgoSupertrendEntryValid(
"short",
price,
shortSeries.up[
bar
],
shortSeries.down[
bar
]
);

}
);

}
