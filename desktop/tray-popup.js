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
<div class="section-title">Открытые позиции:</div>
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

scheduleTrayPopupResize();

}

if(
window.trayPopup?.onState
){
window.trayPopup.onState(
render
);
}
