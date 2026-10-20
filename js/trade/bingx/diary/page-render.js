import {
diaryDayKeyLocal,
formatDiaryDayLabel,
formatDiaryDuration,
formatDiaryPct,
formatDiaryTime,
formatDiaryUsd,
formatDiaryWeekRange,
pnlToneClass,
sideLabel,
sideToneClass
} from "../../../trade-diary-format.js?v=e2a1aeff";

import {
PNL_SHARE_CONTROL_HTML
} from "../pnl-share-modal.js?v=c1972da3";

import {
DIARY_COMMENT_MAX_LEN,
diaryTradeIdentityKey,
getDiaryJournalComment
} from "../../../trade-diary-journal.js?v=7b94619e";

export function tradeKey(
trade
){

/* Stable across enrich: keep income listCloseTimeMs, not rewritten close. */
const closeMs =
trade?.listCloseTimeMs ??
trade?.closeTimeMs;

return `${trade.symbol}-${closeMs}-${trade.orderId ||
""}`;

}

export function tradeIdentityKey(
trade
){

return diaryTradeIdentityKey(
trade
);

}

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

export function sumField(
rows,
key
){

return rows.reduce(
(
acc,
row
)=>
acc +
(
Number(
row[
key
]
) ||
0
),
0
);

}

export function groupTradesByDay(
trades
){

const map =
new Map();

for(
const trade of
trades
){

const key =
diaryDayKeyLocal(
trade.closeTimeMs
);

if(
!map.has(
key
)
){
map.set(
key,
[]
);
}

map.get(
key
).push(
trade
);

}

return [
...map.entries()
].sort(
(
a,
b
)=>
b[
0
].localeCompare(
a[
0
]
)
);

}

export function renderColHead(){

return `
<div class="trade-diary-colhead trade-diary-grid" aria-hidden="true">
<span></span>
<span>Тикер</span>
<span></span>
<span>Время</span>
<span class="trade-diary-num">PnL $</span>
<span class="trade-diary-share-col" aria-hidden="true"></span>
<span class="trade-diary-num">PnL %</span>
<span class="trade-diary-num">Com. $</span>
<span class="trade-diary-num">Long/Short</span>
<span>Коммент</span>
</div>`;

}

export function renderTradeRow(
trade,
state
){

const key =
tradeKey(
trade
);
const identity =
tradeIdentityKey(
trade
);
const isOpen =
state.openTradeKey ===
key;
const comment =
escapeHtml(
getDiaryJournalComment(
state.exchangeId,
identity
)
);

return `
<div class="trade-diary-trade" data-trade-key="${escapeHtml(
key
)}" data-trade-id="${escapeHtml(
identity
)}">
<div class="trade-diary-row trade-diary-grid${isOpen
? " is-open"
: ""}" data-action="toggle-detail" role="button" tabindex="0" aria-expanded="${isOpen
? "true"
: "false"}">
<span class="trade-diary-time">
<svg class="trade-diary-time-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
${escapeHtml(
formatDiaryTime(
trade.closeTimeMs
)
)}
</span>
<span class="trade-diary-symbol">${escapeHtml(
trade.symbol
)}</span>
<span class="trade-diary-chart-link" data-action="open-terminal" data-symbol="${escapeHtml(
trade.symbol
)}" data-open-ms="${escapeHtml(
String(
Number(
trade.openTimeMs
) ||
""
)
)}" data-close-ms="${escapeHtml(
String(
Number(
trade.closeTimeMs ||
trade.listCloseTimeMs
) ||
""
)
)}" data-order-id="${escapeHtml(
String(
trade.orderId ||
trade.positionId ||
""
)
)}" title="Открыть сделку в Терминале" role="link" tabindex="-1">↗</span>
<span class="trade-diary-duration">${escapeHtml(
formatDiaryDuration(
trade.durationMs
)
)}</span>
<span class="trade-diary-pnl-wrap trade-diary-num ${pnlToneClass(
trade.pnlUsd
)}">
<span class="trade-diary-pnl-value">${escapeHtml(
formatDiaryUsd(
trade.pnlUsd
)
)}</span>
</span>
<span class="trade-diary-share-col">${PNL_SHARE_CONTROL_HTML}</span>
<span class="trade-diary-num ${pnlToneClass(
trade.pnlPct
)}">${escapeHtml(
formatDiaryPct(
trade.pnlPct
)
)}</span>
<span class="trade-diary-num trade-diary-muted">${escapeHtml(
formatDiaryUsd(
trade.commissionUsd
)
)}</span>
<span class="trade-diary-side ${sideToneClass(
trade.side
)}">${escapeHtml(
sideLabel(
trade.side
)
)}</span>
<span class="trade-diary-comment-cell" data-action="comment-cell">
<input type="text" class="trade-diary-comment-input" maxlength="${DIARY_COMMENT_MAX_LEN}" data-trade-id="${escapeHtml(
identity
)}" value="${comment}" placeholder="Коммент" aria-label="Комментарий к сделке"/>
</span>
</div>
<div class="trade-diary-detail${isOpen
? ""
: " hidden"}" data-detail-panel></div>
</div>`;

}

export function renderDayBlock(
dayKey,
rows,
state
){

const dayMs =
new Date(
`${dayKey}T12:00:00`
).getTime();
const dayPnl =
sumField(
rows,
"pnlUsd"
);
const dayCom =
sumField(
rows,
"commissionUsd"
);

const sorted =
[
...rows
].sort(
(
a,
b
)=>
b.closeTimeMs -
a.closeTimeMs
);
const isCollapsed =
state.collapsedDayKeys.has(
dayKey
);

return `
<section class="trade-diary-day${isCollapsed
? " is-collapsed"
: ""}" data-day-key="${escapeHtml(
dayKey
)}">
<button type="button" class="trade-diary-day-head trade-diary-grid" data-action="toggle-day" aria-expanded="${isCollapsed
? "false"
: "true"}">
<span class="trade-diary-day-label">
<svg class="trade-diary-day-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
${escapeHtml(
formatDiaryDayLabel(
dayMs
)
)}
</span>
<span class="trade-diary-day-pnl ${pnlToneClass(
dayPnl
)}">${escapeHtml(
formatDiaryUsd(
dayPnl
)
)}</span>
<span class="trade-diary-day-com trade-diary-muted">${escapeHtml(
formatDiaryUsd(
dayCom
)
)}</span>
</button>
<div class="trade-diary-day-trades">
<div class="trade-diary-day-trades-inner">
${sorted.map(
(
trade
)=>
renderTradeRow(
trade,
state
)
).join(
""
)}
</div>
</div>
</section>`;

}

export function renderWeek(
trades,
rangeStartMs,
rangeEndMs,
state
){

const weekPnl =
sumField(
trades,
"pnlUsd"
);
const weekCom =
sumField(
trades,
"commissionUsd"
);
const days =
groupTradesByDay(
trades
);

return `
<section class="trade-diary-week">
<div class="trade-diary-week-head trade-diary-grid">
<span class="trade-diary-week-range">${escapeHtml(
formatDiaryWeekRange(
rangeStartMs,
rangeEndMs
)
)}</span>
<span class="trade-diary-week-pnl ${pnlToneClass(
weekPnl
)}">${escapeHtml(
formatDiaryUsd(
weekPnl
)
)}</span>
<span class="trade-diary-week-com trade-diary-muted">${escapeHtml(
formatDiaryUsd(
weekCom
)
)}</span>
</div>
${renderColHead()}
${
days.length
? days.map(
([
dayKey,
rows
])=>
renderDayBlock(
dayKey,
rows,
state
)
).join(
""
)
: `<div class="trade-diary-empty">За выбранный период закрытых сделок нет.</div>`
}
</section>`;

}

export function findTradeByKey(
key,
weekTrades
){

return weekTrades.find(
trade=>
tradeKey(
trade
) ===
key
);

}
