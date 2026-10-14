/**
 * Песочница: математика маркеров (не трогает основной код).
 */

export const SANDBOX_SYMBOL =
"ETHUSDT";

/** Целевое число свечей на графике (пагинация Bybit по 1000). */
export const SANDBOX_TARGET_CANDLES =
2500;

/** Верхняя граница пагинации (защита от бесконечного цикла). */
export const SANDBOX_MAX_KLINE_BATCHES =
4;

const TF_MINUTES =
Object.freeze({
"1":
1,
"5":
5,
"15":
15,
"60":
60,
"240":
240,
"D":
24 *
60,
"W":
7 *
24 *
60
});

export function estimateChartStartSec(
tf,
barCount =
SANDBOX_TARGET_CANDLES
){

const tfMin =
TF_MINUTES[
tf
] ||
240;
const ms =
Math.max(
1,
Number(
barCount
) ||
SANDBOX_TARGET_CANDLES
) *
tfMin *
60 *
1000;

return Math.floor(
(
Date.now() -
ms
) /
1000
);

}

export function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

export function tfMinutes(
tf
){

return TF_MINUTES[
String(
tf ||
""
)
] ||
60;

}

export function candleAlignSec(
ms,
tf
){

const tfMin =
TF_MINUTES[
tf
] ||
15;
const tfSec =
tfMin *
60;
const sec =
Math.floor(
Number(
ms
) /
1000
);

return Math.floor(
sec /
tfSec
) *
tfSec;

}

export function markerForExecutionSide(
side,
timeSec,
opts =
{}
){

const isBuy =
String(
side ||
""
).toLowerCase() ===
"buy";
const focused =
!!opts.focused;

return {
time:
timeSec,
position:
isBuy
? "belowBar"
: "aboveBar",
color:
focused
? "#fbbf24"
: (
isBuy
? "#22c55e"
: "#ef4444"
),
shape:
isBuy
? "arrowUp"
: "arrowDown",
/* Diary deep-link: gold and larger, so this trade is not another green/red arrow. */
size:
focused
? 3
: 2
};

}

export function closedPnlTradesToExecutions(
trades,
symbol
){

const want =
normalizeSymbol(
symbol
);

if(
!want ||
!Array.isArray(
trades
)
){
return [];
}

const out =
[];

for(
const trade of
trades
){

if(
normalizeSymbol(
trade?.symbol
) !==
want
){
continue;
}

const openMs =
Number(
trade?.openTimeMs
);
const closeMs =
Number(
trade?.closeTimeMs
);
const isLong =
String(
trade?.side ||
""
).toLowerCase() ===
"long";
const isShort =
String(
trade?.side ||
""
).toLowerCase() ===
"short";

if(
!isLong &&
!isShort
){
continue;
}

if(
!Number.isFinite(
openMs
) ||
!Number.isFinite(
closeMs
) ||
openMs <=
0 ||
closeMs <=
0 ||
openMs ===
closeMs ||
trade?.sparse
){
continue;
}

const orderId =
String(
trade?.orderId ||
trade?.positionId ||
""
).trim();

if(
Number.isFinite(
openMs
)
){
out.push(
{
execTimeMs:
openMs,
side:
isLong
? "Buy"
: "Sell",
orderId
}
);
}

if(
Number.isFinite(
closeMs
)
){
out.push(
{
execTimeMs:
closeMs,
side:
isLong
? "Sell"
: "Buy",
orderId
}
);

}

}

return out;

}

const FOCUS_TIME_SLACK_MS =
2 *
60 *
1000;

/**
 * Diary deep-link: only this trade's entry and exit, not every fill in between.
 * @param {object} execution
 * @param {{ orderId?: string, openMs?: number, closeMs?: number } | null} focus
 */
export function executionIsDiaryFocus(
execution,
focus
){

if(
!focus
){
return false;
}

const focusOrderId =
String(
focus.orderId ||
""
).trim();
const orderId =
String(
execution?.orderId ||
execution?.positionId ||
""
).trim();

if(
focusOrderId &&
orderId
){
return orderId ===
focusOrderId;
}

const t =
Number(
execution?.execTimeMs
);

if(
!Number.isFinite(
t
) ||
t <=
0
){
return false;
}

const points =
[
focus.openMs,
focus.closeMs
]
.map(
Number
)
.filter(
ms=>
Number.isFinite(
ms
) &&
ms >
0
);

return points.some(
ms=>
Math.abs(
t -
ms
) <=
FOCUS_TIME_SLACK_MS
);

}

export function buildMarkersForCandles(
executions,
tf,
candles,
focusRangeMs =
null
){

if(
!Array.isArray(
executions
) ||
!executions.length ||
!Array.isArray(
candles
) ||
!candles.length
){
return [];
}

const sortedTimes =
candles
.map(
c=>
Number(
c?.time
)
)
.filter(
Number.isFinite
)
.sort(
(
a,
b
)=>
a -
b
);

if(
!sortedTimes.length
){
return [];
}

const timeSet =
new Set(
sortedTimes
);
const first =
sortedTimes[
0
];
const last =
sortedTimes[
sortedTimes.length -
1
];

function snapToBar(
aligned
){

if(
timeSet.has(
aligned
)
){
return aligned;
}

let best =
null;
let bestDist =
Infinity;

for(
const time of
sortedTimes
){

const dist =
Math.abs(
time -
aligned
);

if(
dist <
bestDist
){
bestDist =
dist;
best =
time;
}

}

return best;

}

const markers =
[];
const seen =
new Map();

for(
const ex of
executions
){

const execTimeMs =
Number(
ex?.execTimeMs
);

if(
!Number.isFinite(
execTimeMs
)
){
continue;
}

const aligned =
candleAlignSec(
execTimeMs,
tf
);
const time =
snapToBar(
aligned
);

if(
time ==
null ||
time <
first ||
time >
last
){
continue;
}

const side =
String(
ex?.side ||
""
).toLowerCase();
const key =
`${time}-${side}`;

const focused =
executionIsDiaryFocus(
ex,
focusRangeMs
);
const marker =
markerForExecutionSide(
ex.side,
time,
{
focused
}
);

if(
seen.has(
key
)
){
const prev =
seen.get(
key
);

if(
focused &&
!prev.focused
){
markers[
prev.index
] =
marker;
seen.set(
key,
{
index:
prev.index,
focused:
true
}
);
}

continue;
}

seen.set(
key,
{
index:
markers.length,
focused
}
);
markers.push(
marker
);

}

markers.sort(
(
a,
b
)=>
a.time -
b.time
);

return markers;

}
