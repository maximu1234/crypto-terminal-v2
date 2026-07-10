import {
isDesktopTradeDiaryContext
} from "./trade-diary-access.js?v=3";

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
} from "./trade-diary-format.js?v=3";

import {
closeTradeDetail,
openTradeDetail
} from "./trade-diary-detail.js?v=6";

import {
getDefaultDiaryPeriod,
mountTradeDiaryPeriodPicker
} from "./trade-diary-period.js?v=3";

import {
initTradeDiaryNav
} from "./trade-diary-nav.js?v=11";

const deniedDesktopEl =
document.getElementById(
"trade-diary-denied-desktop"
);

const panelEl =
document.getElementById(
"trade-diary-panel"
);

const statusEl =
document.getElementById(
"trade-diary-status"
);

const contentEl =
document.getElementById(
"trade-diary-content"
);

const refreshBtn =
document.getElementById(
"trade-diary-refresh"
);

const periodBtn =
document.getElementById(
"trade-diary-period-btn"
);

let weekTrades =
[];
let openTradeKey =
null;
let activePeriod =
getDefaultDiaryPeriod();
let periodPicker =
null;
const collapsedDayKeys =
new Set();

function tradeKey(
trade
){

return `${trade.symbol}-${trade.closeTimeMs}-${trade.orderId ||
""}`;

}

function tradingApi(){

return window.cryptoTerminalDesktop?.trading;

}

function showOnly(
el
){

[
deniedDesktopEl,
panelEl
].forEach(
node=>{

if(
!node
){
return;
}

node.classList.toggle(
"hidden",
node !==
el
);

}
);

}

function setStatus(
text,
{
error = false,
loading = false
} = {}
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.toggle(
"is-error",
!!error
);
statusEl.classList.toggle(
"is-loading",
!!loading &&
!error
);

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

function sumField(
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

function groupTradesByDay(
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

function renderColHead(){

return `
<div class="trade-diary-colhead trade-diary-grid" aria-hidden="true">
<span></span>
<span>Тикер</span>
<span></span>
<span>Время</span>
<span class="trade-diary-num">PnL $</span>
<span class="trade-diary-num">PnL %</span>
<span class="trade-diary-num">Com. $</span>
<span class="trade-diary-num">Long/Short</span>
</div>`;

}

function renderTradeRow(
trade
){

const key =
tradeKey(
trade
);
const isOpen =
openTradeKey ===
key;

return `
<div class="trade-diary-trade" data-trade-key="${escapeHtml(
key
)}">
<button type="button" class="trade-diary-row trade-diary-grid${isOpen
? " is-open"
: ""}" data-action="toggle-detail" aria-expanded="${isOpen
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
)}" title="Открыть в Терминале" role="link" tabindex="-1">↗</span>
<span class="trade-diary-duration">${escapeHtml(
formatDiaryDuration(
trade.durationMs
)
)}</span>
<span class="trade-diary-num ${pnlToneClass(
trade.pnlUsd
)}">${escapeHtml(
formatDiaryUsd(
trade.pnlUsd
)
)}</span>
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
</button>
<div class="trade-diary-detail${isOpen
? ""
: " hidden"}" data-detail-panel></div>
</div>`;

}

function renderDayBlock(
dayKey,
rows
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
collapsedDayKeys.has(
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
renderTradeRow
).join(
""
)}
</div>
</div>
</section>`;

}

function renderWeek(
trades,
rangeStartMs,
rangeEndMs
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
rows
)
).join(
""
)
: `<div class="trade-diary-empty">За выбранный период закрытых сделок нет.</div>`
}
</section>`;

}

function findTradeByKey(
key
){

return weekTrades.find(
trade=>
tradeKey(
trade
) ===
key
);

}

function renderDiaryContent(
trades,
rangeStartMs,
rangeEndMs
){

if(
!contentEl
){
return;
}

contentEl.innerHTML =
renderWeek(
trades,
rangeStartMs,
rangeEndMs
);

if(
openTradeKey
){

const trade =
findTradeByKey(
openTradeKey
);

if(
trade
){

const wrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
openTradeKey
)}"]`
);
const panel =
wrap?.querySelector(
"[data-detail-panel]"
);

if(
panel
){
void openTradeDetail(
panel,
trade
);
}

}else{
openTradeKey =
null;
}

}

}

async function toggleTradeDetail(
key
){

if(
!contentEl
){
return;
}

if(
openTradeKey ===
key
){
const openWrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
key
)}"]`
);
const panel =
openWrap?.querySelector(
"[data-detail-panel]"
);

closeTradeDetail(
panel
);
openTradeKey =
null;

const row =
openWrap?.querySelector(
".trade-diary-row"
);

row?.classList.remove(
"is-open"
);
row?.setAttribute(
"aria-expanded",
"false"
);
return;
}

if(
openTradeKey
){

const prevWrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
openTradeKey
)}"]`
);
const prevPanel =
prevWrap?.querySelector(
"[data-detail-panel]"
);

closeTradeDetail(
prevPanel
);
prevWrap?.querySelector(
".trade-diary-row"
)?.classList.remove(
"is-open"
);
}

openTradeKey =
key;

const wrap =
contentEl.querySelector(
`[data-trade-key="${CSS.escape(
key
)}"]`
);
const panel =
wrap?.querySelector(
"[data-detail-panel]"
);
const row =
wrap?.querySelector(
".trade-diary-row"
);
const trade =
findTradeByKey(
key
);

row?.classList.add(
"is-open"
);
row?.setAttribute(
"aria-expanded",
"true"
);

if(
trade &&
panel
){
await openTradeDetail(
panel,
trade
);
}

}

function toggleDayCollapse(
dayKey
){

if(
!contentEl ||
!dayKey
){
return;
}

const section =
contentEl.querySelector(
`[data-day-key="${CSS.escape(
dayKey
)}"]`
);

if(
!section
){
return;
}

const willCollapse =
!section.classList.contains(
"is-collapsed"
);

section.classList.toggle(
"is-collapsed",
willCollapse
);

if(
willCollapse
){
collapsedDayKeys.add(
dayKey
);
}else{
collapsedDayKeys.delete(
dayKey
);
}

const btn =
section.querySelector(
"[data-action='toggle-day']"
);

btn?.setAttribute(
"aria-expanded",
willCollapse
? "false"
: "true"
);

if(
willCollapse &&
openTradeKey
){

const trade =
findTradeByKey(
openTradeKey
);

if(
trade &&
diaryDayKeyLocal(
trade.closeTimeMs
) ===
dayKey
){
void toggleTradeDetail(
openTradeKey
);
}

}

}

function bindDiaryInteractions(){

if(
!contentEl ||
contentEl.dataset.bound ===
"1"
){
return;
}

contentEl.dataset.bound =
"1";

contentEl.addEventListener(
"click",
event=>{

const chartLink =
event.target.closest(
"[data-action='open-terminal']"
);

if(
chartLink
){

event.preventDefault();
event.stopPropagation();

const symbol =
String(
chartLink.dataset.symbol ||
""
).trim();

if(
symbol
){
window.location.href =
`/terminal.html?symbol=${encodeURIComponent(
symbol
)}&tf=60`;
}

return;

}

const dayBtn =
event.target.closest(
"[data-action='toggle-day']"
);

if(
dayBtn
){

const section =
dayBtn.closest(
"[data-day-key]"
);
const dayKey =
section?.dataset.dayKey;

if(
dayKey
){
toggleDayCollapse(
dayKey
);
}

return;

}

const row =
event.target.closest(
"[data-action='toggle-detail']"
);

if(
!row
){
return;
}

const wrap =
row.closest(
"[data-trade-key]"
);
const key =
wrap?.dataset.tradeKey;

if(
!key
){
return;
}

void toggleTradeDetail(
key
);

}
);

}

async function loadTradesForPeriod(
period
){

const api =
tradingApi();

if(
!api?.getClosedPnl
){
return {
ok:
false,
message:
"Торговый API недоступен"
};
}

return api.getClosedPnl({
startTime:
period.startMs,
endTime:
period.endMs
});

}

async function refreshDiary(){

if(
!contentEl
){
return;
}

setStatus(
"Идет загрузка сделок ...",
{
loading:
true
}
);
contentEl.innerHTML =
"";
openTradeKey =
null;
refreshBtn &&
(refreshBtn.disabled =
true);

try{

const result =
await loadTradesForPeriod(
activePeriod
);

if(
!result?.ok
){
setStatus(
result?.message ||
"Не удалось загрузить сделки",
{
error:
true
}
);
contentEl.innerHTML =
"";
return;
}

const trades =
Array.isArray(
result.trades
)
? result.trades
: [];

weekTrades =
trades;

collapsedDayKeys.clear();

for(
const [
dayKey
] of
groupTradesByDay(
trades
)
){
collapsedDayKeys.add(
dayKey
);
}

renderDiaryContent(
trades,
activePeriod.startMs,
activePeriod.endMs
);

setStatus(
trades.length
? `Сделок за период: ${trades.length}`
: ""
);

}catch(
err
){

setStatus(
err?.message ||
"Ошибка загрузки",
{
error:
true
}
);
contentEl.innerHTML =
"";

}finally{
refreshBtn &&
(refreshBtn.disabled =
false);
}

}

async function boot(){

if(
!isDesktopTradeDiaryContext()
){
showOnly(
deniedDesktopEl
);
return;
}

showOnly(
panelEl
);

void initTradeDiaryNav();

periodPicker =
mountTradeDiaryPeriodPicker(
periodBtn,
{
initialPeriod:
activePeriod,
onApply(
period
){
activePeriod =
period;
void refreshDiary();
}
}
);

bindDiaryInteractions();

refreshBtn?.addEventListener(
"click",
()=>{
void refreshDiary();
}
);

await refreshDiary();

}

void boot();
