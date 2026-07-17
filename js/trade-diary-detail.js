import {
destroyDiaryTradeChart,
mountDiaryTradeChart
} from "./trade-diary-chart.js?v=13";

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

const result =
await api.getTradeDiaryDetail({
symbol:
trade.symbol,
openTimeMs:
trade.openTimeMs,
closeTimeMs:
trade.closeTimeMs,
/* Sparse list rows often cache a wrong Long — detail resolves side itself. */
side:
trade.sparse
? ""
: trade.side,
qty:
trade.qty,
orderId:
trade.orderId,
positionId:
trade.positionId ||
trade.orderId,
avgEntryPrice:
trade.sparse
? 0
: trade.avgEntryPrice,
avgExitPrice:
trade.sparse
? 0
: trade.avgExitPrice,
sparse:
!!trade.sparse ||
Number(
trade.openTimeMs
) ===
Number(
trade.closeTimeMs
),
exchangeId:
getActiveExchangeId()
});

if(
result?.ok
){
detail =
result;
if(
Number.isFinite(
Number(
detail.openTimeMs
)
) &&
Number.isFinite(
Number(
detail.closeTimeMs
)
) &&
Number(
detail.closeTimeMs
) >
Number(
detail.openTimeMs
)
){
trade.openTimeMs =
Number(
detail.openTimeMs
);
trade.closeTimeMs =
Number(
detail.closeTimeMs
);
trade.durationMs =
Number.isFinite(
Number(
detail.durationMs
)
)
? Number(
detail.durationMs
)
: trade.closeTimeMs -
trade.openTimeMs;
trade.sparse =
false;
}
/* Always apply resolved side — including "" to clear poisoned Long. */
trade.side =
detail.side ||
"";
if(
Number(
detail.avgEntryPrice
) >
0
){
trade.avgEntryPrice =
detail.avgEntryPrice;
}
if(
Number(
detail.avgExitPrice
) >
0
){
trade.avgExitPrice =
detail.avgExitPrice;
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
rowDuration
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
rowSide
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
