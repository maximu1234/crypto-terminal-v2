import {
destroyDiaryTradeChart,
mountDiaryTradeChart
} from "./trade-diary-chart.js?v=10";

import {
executionSideLabel,
executionSideTone,
formatDiaryFeePct,
formatDiaryPrice,
formatDiaryQty,
formatDiaryTime,
formatDiaryUsd
} from "./trade-diary-format.js?v=3";

import {
getActiveExchangeId
} from "./market-api.js?v=2";

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
return `<div class="trade-diary-detail-empty">Исполнения не найдены.</div>`;
}

const rows =
executions.map(
ex=>`
<tr>
<td class="trade-diary-exec-time">${escapeHtml(
formatDiaryTime(
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
const isLong =
trade.side ===
"long";
const entryTone =
executionSideTone(
isLong
? "buy"
: "sell"
);
const exitTone =
executionSideTone(
isLong
? "sell"
: "buy"
);

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

const result =
await api.getTradeDiaryDetail({
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
positionId:
trade.positionId ||
trade.orderId,
avgEntryPrice:
trade.avgEntryPrice,
avgExitPrice:
trade.avgExitPrice,
sparse:
!!trade.sparse,
exchangeId:
getActiveExchangeId()
});

if(
result?.ok
){
detail =
result;
}else{
detailEl.innerHTML =
`<div class="trade-diary-detail-error">${escapeHtml(
result?.message ||
"Не удалось загрузить исполнения"
)}</div>`;
return;
}

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
