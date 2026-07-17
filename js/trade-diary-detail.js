import {
destroyDiaryTradeChart,
mountDiaryTradeChart
} from "./trade-diary-chart.js?v=14";

import {
executionSideLabel,
executionSideTone,
formatDiaryDuration,
formatDiaryFeePct,
formatDiaryPrice,
formatDiaryQty,
formatDiaryDateTime,
formatDiaryUsd,
sideLabel,
sideToneClass
} from "./trade-diary-format.js?v=6";

import {
getLoadedTradeExchangeModules,
loadTradeExchangeModules
} from "./trade/module-router.js?v=11";

function diaryMod() {
  return getLoadedTradeExchangeModules();
}

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function escapeHtml(
raw
){

return String(
raw ||
""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

function renderExecutionRows(
executions
){

if(
!executions?.length
){
return `<div class="trade-diary-detail-empty">Исполнения не определены для этой сделки.</div>`;
}

const sorted =
[
...executions
].sort(
(
a,
b
)=>
Number(
a?.execTimeMs
) -
Number(
b?.execTimeMs
)
);

const rows =
sorted.map(
ex=>`
<tr>
<td class="trade-diary-exec-time">${escapeHtml(
formatDiaryDateTime(
ex.execTimeMs
)
)}</td>
<td class="${executionSideTone(
ex.side
)}">${escapeHtml(
executionSideLabel(
ex.side
)
)}</td>
<td class="trade-diary-num">${escapeHtml(
formatDiaryPrice(
ex.execPrice
)
)}</td>
<td class="trade-diary-num">${escapeHtml(
formatDiaryQty(
ex.execQty
)
)}</td>
<td class="trade-diary-num trade-diary-muted">${escapeHtml(
formatDiaryFeePct(
ex.feeRate
)
)}</td>
<td class="trade-diary-num trade-diary-muted">${escapeHtml(
formatDiaryUsd(
ex.execFee
)
)}</td>
<td class="trade-diary-num">${escapeHtml(
formatDiaryUsd(
ex.execValue
)
)}</td>
</tr>`
).join(
""
);

return `
<table class="trade-diary-exec-table">
<thead>
<tr>
<th>Время</th>
<th>Тип</th>
<th class="trade-diary-num">Цена $</th>
<th class="trade-diary-num">Кол-во</th>
<th class="trade-diary-num">Ком. %</th>
<th class="trade-diary-num">Ком. $</th>
<th class="trade-diary-num">Сумма $</th>
</tr>
</thead>
<tbody>${rows}</tbody>
</table>`;

}

function renderDetailShell(
trade,
detail
){

const sideRaw =
String(
detail.side ||
trade.side ||
""
).toLowerCase();
const entryPrice =
Number(
detail.avgEntryPrice
) >
0
? detail.avgEntryPrice
: trade.avgEntryPrice;
const exitPrice =
Number(
detail.avgExitPrice
) >
0
? detail.avgExitPrice
: trade.avgExitPrice;

/* Side must be explicit long|short — never default empty → Long. */
const isLong =
sideRaw ===
"long";
const isShort =
sideRaw ===
"short";
const entryTone =
isLong
? executionSideTone(
"buy"
)
: isShort
? executionSideTone(
"sell"
)
: "trade-diary-muted";
const exitTone =
isLong
? executionSideTone(
"sell"
)
: isShort
? executionSideTone(
"buy"
)
: "trade-diary-muted";

return `
<div class="trade-diary-detail-split">
<div class="trade-diary-detail-chart" data-diary-chart></div>
<div class="trade-diary-detail-side">
<div class="trade-diary-detail-prices">
<span class="trade-diary-detail-entry"><span class="${entryTone}">Вход:</span> ${escapeHtml(
formatDiaryPrice(
entryPrice
)
)}</span>
<span class="trade-diary-detail-exit"><span class="${exitTone}">Выход:</span> ${escapeHtml(
formatDiaryPrice(
exitPrice
)
)}</span>
</div>
<div class="trade-diary-detail-table-wrap">
${renderExecutionRows(
detail.executions
)}
</div>
</div>
</div>`;

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
