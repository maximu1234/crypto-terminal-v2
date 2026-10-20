import {
executionSideLabel,
executionSideTone,
formatDiaryFeePct,
formatDiaryPrice,
formatDiaryQty,
formatDiaryDateTime,
formatDiaryUsd
} from "./trade-diary-format.js?v=e2a1aeff";

export function escapeHtml(
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

export function renderDetailShell(
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
