/**
 * Песочница: быстрая загрузка сделок ETH + точные времена входа/выхода.
 */
import {
closedPnlTradesToExecutions,
normalizeSymbol,
SANDBOX_SYMBOL
} from "./marker-math.js?v=8";

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
true
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

if(
!trades.length
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
!api.getTradeDiaryDetail
){
return {
ok:
true,
trades,
executions:
closedPnlTradesToExecutions(
trades,
want
),
message:
"без детализации"
};
}

const details =
await Promise.all(
trades.map(
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
trades.length;
i++
){

const trade =
trades[
i
];
const detail =
details[
i
];
const isLong =
String(
trade?.side ||
""
).toLowerCase() ===
"long";

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
trades,
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
