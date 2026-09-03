/**
 * Diary period analytics UI — host between status line and trade table.
 */
import {
diaryChartTimeTicks,
summarizeDiaryPeriodAnalytics
} from "./diary-period-analytics.js?v=2";

function escapeHtml(
value
){

return String(
value ??
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

function formatSignedUsd(
value
){

const n =
Number(
value
) ||
0;
const abs =
Math.abs(
n
).toLocaleString(
"en-US",
{
minimumFractionDigits:
2,
maximumFractionDigits:
2
}
);

if(
n >
0
){
return `+${abs} USD`;
}

if(
n <
0
){
return `-${abs} USD`;
}

return `${abs} USD`;

}

function formatAsOfUtc(
ms
){

const d =
new Date(
ms
);

if(
!Number.isFinite(
d.getTime()
)
){
return "";
}

const pad =
(n)=>
String(
n
).padStart(
2,
"0"
);

return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} (UTC)`;

}

function toneClass(
value
){

const n =
Number(
value
) ||
0;

if(
n >
0
){
return "is-pos";
}

if(
n <
0
){
return "is-neg";
}

return "is-flat";

}

let chartClipSeq =
0;

function buildChartSvg(
points
){

const w =
320;
const h =
128;
const padL =
8;
const padR =
8;
const padT =
10;
const padB =
4;
const innerW =
w - padL - padR;
const innerH =
h - padT - padB;
const clipId =
`diary-an-clip-${++chartClipSeq}`;

if(
!points.length
){
return `<svg class="diary-an-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"></svg>`;
}

let minV =
0;
let maxV =
0;
let minT =
points[
0
].t;
let maxT =
points[
0
].t;

for(
const p of points
){
if(
p.v <
minV
){
minV =
p.v;
}

if(
p.v >
maxV
){
maxV =
p.v;
}

if(
p.t <
minT
){
minT =
p.t;
}

if(
p.t >
maxT
){
maxT =
p.t;
}

}

if(
minV ===
maxV
){
maxV =
minV +
1;
}

const spanT =
Math.max(
1,
maxT -
minT
);
const spanV =
maxV -
minV;

function xAt(
t
){

return padL +
(
(
t -
minT
) /
spanT
) *
innerW;

}

function yAt(
v
){

return padT +
(
1 -
(
v -
minV
) /
spanV
) *
innerH;

}

const zeroY =
yAt(
0
);
const coords =
points.map(
(p)=>
`${xAt(p.t).toFixed(2)},${yAt(p.v).toFixed(2)}`
);
const line =
coords.join(
" "
);
const first =
points[
0
];
const last =
points[
points.length -
1
];
const area =
`${xAt(first.t).toFixed(2)},${zeroY.toFixed(2)} ${line} ${xAt(last.t).toFixed(2)},${zeroY.toFixed(2)}`;
const ticks =
diaryChartTimeTicks(
minT,
maxT
);
const plotBottom =
padT +
innerH;
const grid =
ticks.map(
(t)=>{
const x =
xAt(
t
).toFixed(
2
);
return `<line class="diary-an-chart-grid" x1="${x}" y1="${padT}" x2="${x}" y2="${plotBottom}"/>`;
}
).join(
""
);
const labels =
ticks.map(
(
t,
i
)=>{
const pct =
(
xAt(
t
) /
w
) *
100;
let align =
"is-mid";

if(
i ===
0
){
align =
"is-start";
}

if(
i ===
ticks.length -
1
){
align =
"is-end";
}

return `<span class="diary-an-chart-tick ${align}" style="left:${pct.toFixed(2)}%">${escapeHtml(formatChartTick(t, spanT))}</span>`;
}
).join(
""
);

return `<svg class="diary-an-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="График PnL">
${grid}
<line class="diary-an-chart-zero" x1="${padL}" y1="${zeroY.toFixed(2)}" x2="${w - padR}" y2="${zeroY.toFixed(2)}"/>
<defs>
<clipPath id="${clipId}-pos"><rect x="0" y="0" width="${w}" height="${Math.max(0, zeroY)}"/></clipPath>
<clipPath id="${clipId}-neg"><rect x="0" y="${zeroY}" width="${w}" height="${Math.max(0, h - zeroY)}"/></clipPath>
</defs>
<polygon class="diary-an-chart-fill is-pos" clip-path="url(#${clipId}-pos)" points="${area}"/>
<polygon class="diary-an-chart-fill is-neg" clip-path="url(#${clipId}-neg)" points="${area}"/>
<polyline class="diary-an-chart-line is-pos" clip-path="url(#${clipId}-pos)" points="${line}" fill="none"/>
<polyline class="diary-an-chart-line is-neg" clip-path="url(#${clipId}-neg)" points="${line}" fill="none"/>
</svg>
<div class="diary-an-chart-axis-row">${labels}</div>`;

}

function formatChartTick(
ms,
spanMs
){

const d =
new Date(
ms
);

if(
!Number.isFinite(
d.getTime()
)
){
return "";
}

const pad =
(n)=>
String(
n
).padStart(
2,
"0"
);

if(
spanMs <
36 * 60 * 60 * 1000
){
return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}`;

}

function buildRankingHtml(
ranking
){

if(
!ranking.length
){
return `<div class="diary-an-rank-empty">Нет сделок</div>`;
}

const maxAbs =
Math.max(
...ranking.map(
(row)=>
Math.abs(
row.pnl
)
),
1e-9
);

return ranking.map(
(row)=>{
const pct =
Math.max(
4,
Math.round(
Math.abs(
row.pnl
) /
maxAbs * 100
)
);
return `<div class="diary-an-rank-row">
<span class="diary-an-rank-sym">${escapeHtml(row.symbol)}</span>
<span class="diary-an-rank-bar-wrap"><span class="diary-an-rank-bar ${toneClass(row.pnl)}" style="width:${pct}%"></span></span>
<span class="diary-an-rank-val ${toneClass(row.pnl)}">${escapeHtml(formatSignedUsd(row.pnl))}</span>
</div>`;
}
).join(
""
);

}

function donutSvg(
longCount,
shortCount
){

const total =
longCount +
shortCount;

if(
!total
){
return `<svg class="diary-an-donut" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" stroke-width="4" opacity="0.2"/></svg>`;
}

const c =
2 * Math.PI * 14;
const longLen =
longCount /
total * c;

return `<svg class="diary-an-donut" viewBox="0 0 36 36" aria-hidden="true">
<circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" stroke-width="4"/>
<circle cx="18" cy="18" r="14" fill="none" stroke="#22c55e" stroke-width="4" stroke-dasharray="${longLen.toFixed(2)} ${c.toFixed(2)}" stroke-linecap="butt" transform="rotate(-90 18 18)"/>
</svg>`;

}

function isHostCollapsed(
host
){

return host.dataset.collapsed !==
"0";

}

function applyCollapsed(
host,
collapsed
){

host.dataset.collapsed =
collapsed
? "1"
: "0";
host.classList.toggle(
"is-collapsed",
collapsed
);

}

function bindHostOnce(
host
){

if(
host.dataset.diaryAnBound ===
"1"
){
return;
}

host.dataset.diaryAnBound =
"1";
host.addEventListener(
"click",
(event)=>{
const sortBtn =
event.target.closest(
"[data-diary-an-rank-sort]"
);

if(
sortBtn &&
host.contains(
sortBtn
)
){
host.dataset.rankDir =
host.dataset.rankDir ===
"asc"
? "desc"
: "asc";
paint(
host,
host._diaryAnTrades ||
[]
);
return;
}

const toggleBtn =
event.target.closest(
"[data-diary-an-toggle]"
);

if(
!toggleBtn ||
!host.contains(
toggleBtn
)
){
return;
}

const collapsed =
!isHostCollapsed(
host
);
applyCollapsed(
host,
collapsed
);
toggleBtn.setAttribute(
"aria-expanded",
collapsed
? "false"
: "true"
);
}
);

}

function paint(
host,
trades
){

const rankDir =
host.dataset.rankDir ===
"asc"
? "asc"
: "desc";
const stats =
summarizeDiaryPeriodAnalytics(
trades,
{
mode:
"positions",
rankDir
}
);
const asOf =
formatAsOfUtc(
stats.asOfMs ||
Date.now()
);

const collapsed =
isHostCollapsed(
host
);
applyCollapsed(
host,
collapsed
);
host.hidden =
false;
host.innerHTML =
`<button type="button" class="diary-an-head" data-diary-an-toggle aria-expanded="${collapsed ? "false" : "true"}">
<span class="diary-an-title-wrap">
<svg class="diary-an-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
<span class="diary-an-title">PnL</span>
</span>
<span class="diary-an-asof">Данные на ${escapeHtml(asOf)}</span>
</button>
<div class="diary-an-body">
<div class="diary-an-body-inner">
<div class="diary-an-body-pad">
<div class="diary-an-kpis">
<div class="diary-an-kpi">
<span class="diary-an-kpi-label">Итого PnL</span>
<span class="diary-an-kpi-value ${toneClass(stats.totalPnl)}">${escapeHtml(formatSignedUsd(stats.totalPnl))}</span>
</div>
<div class="diary-an-kpi">
<span class="diary-an-kpi-label">Оборот</span>
<span class="diary-an-kpi-value ${toneClass(stats.volumeUsd)}">${escapeHtml(formatSignedUsd(stats.volumeUsd))}</span>
</div>
</div>
<div class="diary-an-panels">
<section class="diary-an-card">
<h3 class="diary-an-card-title">График PnL</h3>
<div class="diary-an-chart">${buildChartSvg(stats.series)}</div>
</section>
<section class="diary-an-card">
<h3 class="diary-an-card-title">Рейтинг PnL</h3>
<div class="diary-an-rank-head"><span>Контракт</span><span></span><button type="button" class="diary-an-rank-sort${rankDir === "asc" ? " is-asc" : ""}" data-diary-an-rank-sort title="Сортировать по PnL">PnL<svg class="diary-an-rank-sort-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
<div class="diary-an-rank">${buildRankingHtml(stats.ranking)}</div>
</section>
</div>
<div class="diary-an-section-title">Закрытые позиции</div>
<div class="diary-an-metrics">
<div class="diary-an-metric">
${donutSvg(stats.longCount, stats.shortCount)}
<div>
<span class="diary-an-metric-label">Всего закрытых позиций</span>
<span class="diary-an-metric-value">${stats.count}</span>
<span class="diary-an-metric-sub"><span class="is-pos">${stats.longCount} Close Long</span> / <span class="is-neg">${stats.shortCount} Close Short</span></span>
</div>
</div>
<div class="diary-an-metric">
<div class="diary-an-gauge" style="--diary-an-win:${stats.winRatePct}" aria-hidden="true"></div>
<div>
<span class="diary-an-metric-label">Винрейт закрытых позиций</span>
<span class="diary-an-metric-value">${stats.winRatePct}%</span>
<span class="diary-an-metric-sub">${stats.wins} Win / ${stats.losses} Loss</span>
</div>
</div>
<div class="diary-an-metric">
<div>
<span class="diary-an-metric-label">PnL закрытых лонгов</span>
<span class="diary-an-metric-value ${toneClass(stats.longPnl)}">${escapeHtml(formatSignedUsd(stats.longPnl))}</span>
<span class="diary-an-metric-sub">Win Rate: ${stats.longWinRatePct}%</span>
</div>
</div>
<div class="diary-an-metric">
<div>
<span class="diary-an-metric-label">PnL закрытых шортов</span>
<span class="diary-an-metric-value ${toneClass(stats.shortPnl)}">${escapeHtml(formatSignedUsd(stats.shortPnl))}</span>
<span class="diary-an-metric-sub">Win Rate: ${stats.shortWinRatePct}%</span>
</div>
</div>
</div>
</div>
</div>
</div>`;

}

export function renderDiaryPeriodAnalytics(
host,
trades
){

if(
!host
){
return;
}

bindHostOnce(
host
);
host._diaryAnTrades =
Array.isArray(
trades
)
? trades
: [];

if(
!host._diaryAnTrades.length
){
host.hidden =
true;
host.innerHTML =
"";
applyCollapsed(
host,
true
);
return;
}

paint(
host,
host._diaryAnTrades
);

}

export function clearDiaryPeriodAnalytics(
host
){

if(
!host
){
return;
}

host.hidden =
true;
host.innerHTML =
"";
host._diaryAnTrades =
[];
applyCollapsed(
host,
true
);

}
