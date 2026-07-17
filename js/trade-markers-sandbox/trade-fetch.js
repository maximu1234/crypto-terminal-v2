import {
closedPnlTradesToExecutions,
normalizeSymbol,
SANDBOX_SYMBOL
} from "./marker-math.js?v=10";

import {
getActiveTradeConfig
} from "../trade/module-router.js?v=4";

import {
getActiveExchangeId
} from "../market-api.js?v=2";

/** Буфер до первой свечи при запросе closed PnL. */
const CHART_START_BUFFER_MS =
2 *
60 *
60 *
1000;

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function filterSymbolTrades(
trades,
symbol
){

const want =
normalizeSymbol(
symbol
);

return (
Array.isArray(
trades
)
? trades
: []
).filter(
trade=>
normalizeSymbol(
trade?.symbol
) ===
want
);

}

function shouldFetchTradeDetails(){

const cfg =
getActiveTradeConfig();

return cfg?.fetchClosedPnlTradeDetails !==
false;

}

export async function fetchTradesForSymbol(
symbol,
chartStartSec
){

const want =
normalizeSymbol(
symbol
);

const api =
tradingApi();

if(
!api?.getClosedPnl
){
return {
ok:
false,
trades:
[],
executions:
[],
message:
"trading API недоступен"
};
}

if(
!want
){
return {
ok:
false,
trades:
[],
executions:
[],
message:
"символ не задан"
};
}

const endTime =
Date.now();
const chartStartMs =
Number.isFinite(
chartStartSec
)
? chartStartSec *
1000
: endTime -
90 *
24 *
60 *
60 *
1000;
const startTime =
Math.max(
0,
chartStartMs -
CHART_START_BUFFER_MS
);

let pnlResult;

const exchangeId =
getActiveExchangeId();
const cfg =
getActiveTradeConfig();

try{
pnlResult =
await api.getClosedPnl(
{
symbol:
want,
startTime,
endTime,
skipExecutions:
true,
parallelChunks:
true,
forceRefresh:
cfg?.closedPnlForceRefresh ===
true,
enrich:
cfg?.closedPnlEnrichOnFetch ===
true,
exchangeId
}
);
}catch(
err
){
return {
ok:
false,
trades:
[],
executions:
[],
message:
err?.message ||
String(
err
)
};
}

if(
!pnlResult?.ok
){
return {
ok:
false,
trades:
[],
executions:
[],
message:
pnlResult?.message ||
"closed PnL error"
};
}

const trades =
filterSymbolTrades(
pnlResult.trades,
want
);

const directExecutions =
Array.isArray(
pnlResult.executions
)
? pnlResult.executions.filter(
ex=>
Number.isFinite(
Number(
ex?.execTimeMs
)
) &&
Number(
ex.execTimeMs
) >
0
)
: [];

if(
directExecutions.length
){
const fromTrades =
closedPnlTradesToExecutions(
trades.filter(
trade=>{
const openMs =
Number(
trade?.openTimeMs
);
const closeMs =
Number(
trade?.closeTimeMs
);
return (
Number.isFinite(
openMs
) &&
Number.isFinite(
closeMs
) &&
openMs >
0 &&
closeMs >
0 &&
openMs !==
closeMs &&
!trade?.sparse
);
}
),
want
);
return {
ok:
true,
trades:
trades.filter(
trade=>{
const openMs =
Number(
trade?.openTimeMs
);
const closeMs =
Number(
trade?.closeTimeMs
);
return (
Number.isFinite(
openMs
) &&
Number.isFinite(
closeMs
) &&
openMs >
0 &&
closeMs >
0 &&
openMs !==
closeMs &&
!trade?.sparse
);
}
),
executions:
fromTrades.length
? fromTrades
: directExecutions,
message:
pnlResult.source
? String(
pnlResult.source
)
: ""
};
}

const usableTrades =
trades.filter(
trade=>{

const openMs =
Number(
trade?.openTimeMs
);
const closeMs =
Number(
trade?.closeTimeMs
);

if(
trade?.sparse
){
return false;
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
0
){
return false;
}

/* Entry and exit must be distinct for two triangles. */
return openMs !==
closeMs;

}
);

if(
!usableTrades.length
){
return {
ok:
true,
trades:
[],
executions:
[],
message:
"сделок нет"
};
}

if(
!api.getTradeDiaryDetail ||
!shouldFetchTradeDetails()
){
return {
ok:
true,
trades:
usableTrades,
executions:
closedPnlTradesToExecutions(
usableTrades,
want
),
message:
shouldFetchTradeDetails()
? "без детализации"
: ""
};
}

const details =
await Promise.all(
usableTrades.map(
trade=>
api.getTradeDiaryDetail(
{
symbol:
trade.symbol,
openTimeMs:
trade.openTimeMs,
closeTimeMs:
trade.closeTimeMs,
side:
trade.side,
qty:
trade.qty,
orderId:
trade.orderId,
avgEntryPrice:
trade.avgEntryPrice,
avgExitPrice:
trade.avgExitPrice
}
).catch(
()=>
null
)
)
);

const executions =
[];

for(
let i =
0;
i <
usableTrades.length;
i++
){

const trade =
usableTrades[
i
];
const detail =
details[
i
];
const isLong =
[
"long",
"buy"
].includes(
String(
trade?.side ||
""
).toLowerCase()
);

if(
detail?.ok
){

const entryMs =
detail.entries?.[
0
]?.execTimeMs ||
trade.openTimeMs;
const exitMs =
detail.exits?.length
? detail.exits[
detail.exits.length -
1
].execTimeMs
: trade.closeTimeMs;

if(
Number.isFinite(
entryMs
)
){
executions.push(
{
execTimeMs:
entryMs,
side:
isLong
? "Buy"
: "Sell"
}
);
}

if(
Number.isFinite(
exitMs
)
){
executions.push(
{
execTimeMs:
exitMs,
side:
isLong
? "Sell"
: "Buy"
}
);

}

continue;

}

executions.push(
...closedPnlTradesToExecutions(
[
trade
],
want
)
);

}

return {
ok:
true,
trades:
usableTrades,
executions,
message:
""
};

}

export async function fetchSandboxTrades(
chartStartSec
){

return fetchTradesForSymbol(
SANDBOX_SYMBOL,
chartStartSec
);

}
