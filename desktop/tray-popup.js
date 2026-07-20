function escapeHtml(
value
){

return String(
value ??
""
).replace(
/[&<>"']/g,
ch=>({
"&":
"&amp;",
"<":
"&lt;",
">":
"&gt;",
'"':
"&quot;",
"'":
"&#39;"
})[
ch
]
);

}

function isLongSide(
side
){

return side ===
"Buy" ||
String(
side ||
""
).toLowerCase() ===
"long";

}

function pnlClass(
value
){

const num =
Number(
value
);

if(
!Number.isFinite(
num
) ||
num ===
0
){
return "pos-pnl--zero";
}

return num >
0
? "pos-pnl--pos"
: "pos-pnl--neg";

}

function scheduleTrayPopupResize(){

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{

const root =
document.getElementById(
"root"
);

if(
!root
){
return;
}

const height =
Math.ceil(
root.getBoundingClientRect().height
);

if(
height >
0
){
window.trayPopup?.resize?.(
height
);
}

}
);
}
);

}

function render(
state
){

const root =
document.getElementById(
"root"
);

if(
!root
){
return;
}

const exchange =
escapeHtml(
state?.exchange ||
"Bybit"
);
const statusLabel =
escapeHtml(
state?.statusLabel ||
"—"
);
const balanceLabel =
escapeHtml(
state?.balanceLabel ??
"—"
);
const pnlHidden =
!!state?.pnlHidden;
const positions =
Array.isArray(
state?.positions
)
? state.positions
: [];

let html =
`
<div class="info-row">Биржа: ${exchange}</div>
<div class="info-row">Статус: ${statusLabel}</div>
<div class="info-row">Баланс USDT: ${balanceLabel}</div>
<div class="sep"></div>
<div class="section-title-row">
<div class="section-title">Открытые позиции:</div>
<button
type="button"
class="tray-pnl-eye"
data-action="toggle-pnl"
aria-label="${pnlHidden ? "Показать PnL" : "Скрыть PnL"}"
aria-pressed="${pnlHidden ? "true" : "false"}"
title="${pnlHidden ? "Показать PnL" : "Скрыть PnL"}"
>
<svg class="tray-eye-svg tray-eye-svg--open" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
<svg class="tray-eye-svg tray-eye-svg--closed" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></svg>
</button>
</div>
`;

if(
!positions.length
){

html +=
`<div class="empty">— нет открытых позиций —</div>`;

}else{

for(
const row of positions
){

if(
!String(
row?.symbol ||
""
).trim()
){
continue;
}

const ticker =
escapeHtml(
row?.ticker ||
row?.symbol ||
"—"
);
const pnlText =
pnlHidden
? "***"
: escapeHtml(
row?.pnlLabel ||
"—"
);
const dotClass =
isLongSide(
row?.side
)
? "pos-dot--long"
: "pos-dot--short";
const pnlCss =
pnlHidden
? "pos-pnl--zero"
: pnlClass(
row?.pnl
);

html +=
`<div class="pos-row">
<span class="pos-dot ${dotClass}" aria-hidden="true"></span>
<span class="pos-ticker">${ticker}</span>
<span class="pos-pnl ${pnlCss}">${pnlText}</span>
</div>`;

}

}

html +=
`
<div class="sep"></div>
<div class="action" data-action="open-app">Открыть Multichart</div>
<div class="action" data-action="quit">Выход</div>
`;

root.innerHTML =
html;

root.querySelector(
'[data-action="open-app"]'
)?.addEventListener(
"click",
()=>{
window.trayPopup?.openApp?.();
}
);

root.querySelector(
'[data-action="quit"]'
)?.addEventListener(
"click",
()=>{
window.trayPopup?.quit?.();
}
);

root.querySelector(
'[data-action="toggle-pnl"]'
)?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
window.trayPopup?.togglePnlHidden?.();
}
);

scheduleTrayPopupResize();

}

if(
window.trayPopup?.onState
){
window.trayPopup.onState(
render
);
}
