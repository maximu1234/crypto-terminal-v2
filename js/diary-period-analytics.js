/**
 * Period P&L analytics from already-loaded diary trades.
 * Exchange-agnostic: uses pnlUsd / side / symbol / qty / avgEntryPrice.
 */

export const DIARY_ANALYTICS_RANK_LIMIT =
8;

export function tradeVolumeUsd(
trade
){

const qty =
Math.abs(
Number(
trade?.qty
) ||
0
);
const entry =
Number(
trade?.avgEntryPrice
) ||
0;

if(
qty >
0 &&
entry >
0
){
return qty * entry;
}

const pnl =
Number(
trade?.pnlUsd
) ||
0;
const pct =
Number(
trade?.pnlPct
) ||
0;

if(
pct !==
0
){
return Math.abs(
pnl /
pct * 100
);
}

return 0;

}

export function tradeSide(
trade
){

const side =
String(
trade?.side ||
""
).trim().toLowerCase();

if(
side ===
"long" ||
side ===
"short"
){
return side;
}

return "";

}

export function isTradeWin(
trade
){

return Number(
trade?.pnlUsd
) >
0;

}

function positionKey(
trade
){

const positionId =
String(
trade?.positionId ||
""
).trim();

if(
positionId
){
return `p:${positionId}`;
}

const orderId =
String(
trade?.orderId ||
""
).trim();
const symbol =
String(
trade?.symbol ||
""
).trim().toUpperCase();

if(
orderId
){
return `o:${symbol}:${orderId}`;
}

return `t:${symbol}:${Number(trade?.closeTimeMs) || 0}:${tradeSide(trade)}`;

}

export function collapseDiaryPositions(
trades
){

const map =
new Map();

for(
const trade of trades ||
[]
){
const key =
positionKey(
trade
);
const prev =
map.get(
key
);

if(
!prev
){
map.set(
key,
{
...trade,
pnlUsd:
Number(
trade?.pnlUsd
) ||
0,
commissionUsd:
Number(
trade?.commissionUsd
) ||
0,
qty:
Math.abs(
Number(
trade?.qty
) ||
0
)
}
);
continue;
}

prev.pnlUsd +=
Number(
trade?.pnlUsd
) ||
0;
prev.commissionUsd +=
Number(
trade?.commissionUsd
) ||
0;
prev.qty +=
Math.abs(
Number(
trade?.qty
) ||
0
);

if(
Number(
trade?.closeTimeMs
) >
Number(
prev.closeTimeMs
)
){
prev.closeTimeMs =
trade.closeTimeMs;
}

if(
!tradeSide(
prev
) &&
tradeSide(
trade
)
){
prev.side =
trade.side;
}

}

return [
...map.values()
];

}

function sideStats(
rows
){

let pnl =
0;
let wins =
0;
let count =
0;

for(
const row of rows
){
count +=
1;
pnl +=
Number(
row.pnlUsd
) ||
0;

if(
isTradeWin(
row
)
){
wins +=
1;
}

}

return {
count,
pnl,
wins,
winRatePct:
count
? Math.round(
wins /
count * 100
)
: 0
};

}

export function cumulativePnlSeries(
trades
){

const sorted =
[
...(trades ||
[])
].slice().sort(
(
a,
b
)=>
(
Number(
a?.closeTimeMs
) ||
0
) -
(
Number(
b?.closeTimeMs
) ||
0
)
);

let sum =
0;
const points =
[];

for(
const trade of sorted
){
sum +=
Number(
trade?.pnlUsd
) ||
0;
points.push({
t:
Number(
trade?.closeTimeMs
) ||
0,
v:
sum
});
}

return points;

}

export function rankDiaryPnlBySymbol(
trades,
limit =
DIARY_ANALYTICS_RANK_LIMIT,
dir =
"desc"
){

const bySymbol =
new Map();

for(
const trade of trades ||
[]
){
const symbol =
String(
trade?.symbol ||
""
).trim().toUpperCase() ||
"—";
bySymbol.set(
symbol,
(
bySymbol.get(
symbol
) ||
0
) +
(
Number(
trade?.pnlUsd
) ||
0
)
);
}

const sign =
dir ===
"asc"
? 1
: -1;

return [
...bySymbol.entries()
].map(
([
symbol,
pnl
])=>({
symbol,
pnl
})
).sort(
(
a,
b
)=>
sign *
(
a.pnl -
b.pnl
) ||
a.symbol.localeCompare(
b.symbol
)
).slice(
0,
Math.max(
0,
limit
)
);

}

const DAY_MS =
24 * 60 * 60 * 1000;

export function diaryChartTimeTicks(
minT,
maxT
){

const lo =
Number(
minT
);
const hi =
Number(
maxT
);

if(
!Number.isFinite(
lo
) ||
!Number.isFinite(
hi
)
){
return [];
}

if(
hi <=
lo
){
return [
lo
];
}

const span =
hi -
lo;
const days =
span /
DAY_MS;

if(
days <
1.5
){
const count =
5;
const ticks =
[];

for(
let i =
0;
i <
count;
i +=
1
){
ticks.push(
lo +
span *
(
i /
(
count -
1
)
)
);
}

return ticks;
}

let stepDays =
1;

if(
days >
12
){
stepDays =
2;
}

if(
days >
24
){
stepDays =
7;
}

if(
days >
70
){
stepDays =
14;
}

if(
days >
140
){
stepDays =
30;
}

const step =
stepDays *
DAY_MS;
const ticks =
[
lo
];
let t =
Math.floor(
lo /
DAY_MS
) *
DAY_MS +
DAY_MS;

while(
t <
hi
){
if(
t -
lo >=
span * 0.1 &&
hi -
t >=
span * 0.1
){
ticks.push(
t
);
}

t +=
step;

if(
ticks.length >
24
){
break;
}

}

ticks.push(
hi
);

const maxCount =
7;

if(
ticks.length <=
maxCount
){
return ticks;
}

const inner =
ticks.slice(
1,
-1
);
const keep =
maxCount -
2;
const picked =
[];

for(
let i =
0;
i <
keep;
i +=
1
){
const idx =
Math.round(
(
i +
0.5
) *
inner.length /
keep -
0.5
);
const v =
inner[
Math.min(
inner.length -
1,
Math.max(
0,
idx
)
)
];

if(
picked[
picked.length -
1
] !==
v
){
picked.push(
v
);
}

}

return [
lo,
...picked,
hi
];

}

export function summarizeDiaryPeriodAnalytics(
trades,
{
mode =
"orders",
rankDir =
"desc"
} = {}
){

const source =
Array.isArray(
trades
)
? trades
: [];
const rows =
mode ===
"positions"
? collapseDiaryPositions(
source
)
: source;

let totalPnl =
0;
let volumeUsd =
0;
let wins =
0;
let longRows =
[];
let shortRows =
[];
let asOfMs =
0;

for(
const row of rows
){
const pnl =
Number(
row?.pnlUsd
) ||
0;
totalPnl +=
pnl;
volumeUsd +=
tradeVolumeUsd(
row
);

if(
isTradeWin(
row
)
){
wins +=
1;
}

const closeMs =
Number(
row?.closeTimeMs
) ||
0;

if(
closeMs >
asOfMs
){
asOfMs =
closeMs;
}

const side =
tradeSide(
row
);

if(
side ===
"long"
){
longRows.push(
row
);
}else if(
side ===
"short"
){
shortRows.push(
row
);
}

}

const count =
rows.length;
const long =
sideStats(
longRows
);
const short =
sideStats(
shortRows
);

return {
mode,
count,
totalPnl,
volumeUsd,
wins,
losses:
count -
wins,
winRatePct:
count
? Math.round(
wins /
count * 100
)
: 0,
longCount:
long.count,
shortCount:
short.count,
longPnl:
long.pnl,
shortPnl:
short.pnl,
longWinRatePct:
long.winRatePct,
shortWinRatePct:
short.winRatePct,
asOfMs,
series:
cumulativePnlSeries(
rows
),
ranking:
rankDiaryPnlBySymbol(
rows,
DIARY_ANALYTICS_RANK_LIMIT,
rankDir
)
};

}
