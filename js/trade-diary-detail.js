import {
destroyDiaryTradeChart,
mountDiaryTradeChart
} from "./trade-diary-chart.js?v=6bd1c1c0";

import {
formatDiaryDuration,
sideLabel,
sideToneClass
} from "./trade-diary-format.js?v=e2a1aeff";

import {
escapeHtml,
renderDetailShell
} from "./trade-diary-detail-view.js?v=1";

import {
getLoadedTradeExchangeModules,
loadTradeExchangeModules
} from "./trade/module-router.js?v=0e50d613";

function diaryMod() {
  return getLoadedTradeExchangeModules();
}

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}


export async function openTradeDetail(
detailEl,
trade
){

if(
!detailEl ||
!trade
){
return;
}

detailEl.classList.remove(
"hidden"
);
detailEl.innerHTML =
`<div class="trade-diary-detail-loading">Загрузка…</div>`;

const api =
tradingApi();
let detail =
{
executions:
[],
avgEntryPrice:
trade.avgEntryPrice,
avgExitPrice:
trade.avgExitPrice
};

if(
api?.getTradeDiaryDetail
){

await loadTradeExchangeModules();

const request =
typeof diaryMod()?.diaryBuildDetailRequest ===
"function"
? diaryMod().diaryBuildDetailRequest(
trade
)
: {
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
};

const result =
await api.getTradeDiaryDetail(
request
);

const interpreted =
typeof diaryMod()?.diaryInterpretDetailResult ===
"function"
? diaryMod().diaryInterpretDetailResult(
result
)
: (
result?.ok ===
false
? {
ok:
false,
failMessage:
result?.message ||
"Не удалось загрузить исполнения"
}
: {
ok:
true,
detail:
result?.ok
? result
: null
}
);

if(
!interpreted?.ok
){
detailEl.innerHTML =
`<div class="trade-diary-detail-error">${escapeHtml(
interpreted?.failMessage ||
result?.message ||
"Не удалось загрузить исполнения"
)}</div>`;
return;
}

if(
interpreted.detail
){
detail =
interpreted.detail;

if(
typeof diaryMod()?.diaryApplyDetailToTrade ===
"function"
){
diaryMod().diaryApplyDetailToTrade(
trade,
detail
);
}

const rowDuration =
detailEl
.closest(
"[data-trade-key]"
)
?.querySelector(
".trade-diary-duration"
);
if(
rowDuration &&
Number(
trade.durationMs
) >
0
){
rowDuration.textContent =
formatDiaryDuration(
trade.durationMs
);
}
const rowSide =
detailEl
.closest(
"[data-trade-key]"
)
?.querySelector(
".trade-diary-side"
);
if(
rowSide &&
(
trade.side ===
"long" ||
trade.side ===
"short"
)
){
rowSide.textContent =
sideLabel(
trade.side
);
rowSide.className =
`trade-diary-side ${sideToneClass(
trade.side
)}`;
}

diaryMod()?.diaryAfterDetailSuccess?.(
trade,
detail
);
}

detailEl.innerHTML =
renderDetailShell(
trade,
detail
);

const chartHost =
detailEl.querySelector(
"[data-diary-chart]"
);

if(
chartHost
){
try{
await mountDiaryTradeChart(
chartHost,
trade,
detail
);
}catch(
err
){
chartHost.textContent =
err?.message ||
"Ошибка графика";
}
}

}

}

export function closeTradeDetail(
detailEl
){

if(
!detailEl
){
return;
}

const chartHost =
detailEl.querySelector(
"[data-diary-chart]"
);

if(
chartHost
){
destroyDiaryTradeChart(
chartHost
);
}

detailEl.classList.add(
"hidden"
);
detailEl.innerHTML =
"";

}
