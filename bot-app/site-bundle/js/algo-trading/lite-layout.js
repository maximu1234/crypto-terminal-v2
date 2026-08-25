/**
 * Раскладка standalone Algo Bot lite.
 * Графика нет: панели и настройки тех же трёх ботов, что на Multichart.
 */
export function isAlgoBotLiteMode(){

if(
typeof document !==
"undefined" &&
document.body?.classList?.contains(
"algo-bot-lite-layout"
)
){
return true;
}

if(
typeof location !==
"undefined" &&
/\bbotLite=1\b/i.test(
location.search ||
""
)
){
return true;
}

const desktop =
typeof window !==
"undefined"
? window.cryptoTerminalDesktop
: null;

if(
desktop &&
/algo-bot/i.test(
String(
desktop.appId ||
desktop.productName ||
""
)
)
){
return true;
}

return false;

}

function ensureChild(
parent,
selector,
tag,
className,
ariaLabel
){

let el =
parent.querySelector(
selector
);

if(
!el
){
el =
document.createElement(
tag
);
el.className =
className;

if(
ariaLabel
){
el.setAttribute(
"aria-label",
ariaLabel
);
}

parent.appendChild(
el
);
}

return el;

}

export function mountAlgoBotLiteLayout(){

if(
!isAlgoBotLiteMode()
){
return;
}

document.body.classList.add(
"algo-bot-lite-layout"
);

const left =
document.getElementById(
"left"
);

if(
!left
){
return;
}

const indicatorsRoot =
document.getElementById(
"chart-indicators-wrap"
);
const statsPanel =
document.getElementById(
"algo-stats-panel"
);
const statsResize =
document.getElementById(
"algo-stats-resize"
);
const globalSetupCol =
document.querySelector(
'.algo-stats-col[data-algo-strategy="global-setup"]'
);
const st1Col =
document.querySelector(
'.algo-stats-col[data-algo-strategy="fixed-tp"]'
);
const st2Col =
document.querySelector(
'.algo-stats-col[data-algo-strategy="partial-tp"]'
);
const st3Col =
document.querySelector(
'.algo-stats-col[data-algo-strategy="partial-tp-y"]'
);
const rsiColumns =
document.querySelector(
'.algo-stats-columns[data-algo-analysis-bot="rsi-touch-flip"]'
);

if(
statsResize
){
statsResize.hidden =
true;
}

if(
statsPanel
){
statsPanel.hidden =
true;
}

let grid =
document.getElementById(
"algo-bot-main-grid"
);

if(
!grid
){
grid =
document.createElement(
"div"
);
grid.id =
"algo-bot-main-grid";
grid.className =
"algo-bot-main-grid";
}

const topRow =
ensureChild(
grid,
".algo-bot-grid-top",
"div",
"algo-bot-grid-top"
);
const bottomRow =
ensureChild(
grid,
".algo-bot-grid-bottom",
"div",
"algo-bot-grid-bottom"
);

const patternCell =
ensureChild(
topRow,
".algo-bot-grid-pattern",
"section",
"algo-bot-grid-cell algo-bot-grid-pattern",
"Паттерн 1-2"
);
const globalCell =
ensureChild(
topRow,
".algo-bot-grid-global",
"section",
"algo-bot-grid-cell algo-bot-grid-global",
"Глобальные настройки"
);
const st1Cell =
ensureChild(
bottomRow,
".algo-bot-grid-st1",
"section",
"algo-bot-grid-cell algo-bot-grid-st1",
"Стратегия 1"
);
const st2Cell =
ensureChild(
bottomRow,
".algo-bot-grid-st2",
"section",
"algo-bot-grid-cell algo-bot-grid-st2",
"Стратегия 2"
);
const st3Cell =
ensureChild(
bottomRow,
".algo-bot-grid-st3",
"section",
"algo-bot-grid-cell algo-bot-grid-st3",
"Стратегия 3"
);

const rsiCell =
ensureChild(
grid,
".algo-bot-grid-rsi",
"section",
"algo-bot-grid-cell algo-bot-grid-alt algo-bot-grid-rsi",
"RSI Touch Flip"
);
const earlyCell =
ensureChild(
grid,
".algo-bot-grid-early",
"section",
"algo-bot-grid-cell algo-bot-grid-alt algo-bot-grid-early",
"1-2 Early T3"
);
const emptyCell =
ensureChild(
grid,
".algo-bot-grid-empty",
"section",
"algo-bot-grid-cell algo-bot-grid-alt algo-bot-grid-empty",
"Бот не выбран"
);

let patternSettingsPane =
document.getElementById(
"algo-bot-lite-pattern-settings"
);

if(
!patternSettingsPane
){
patternSettingsPane =
document.createElement(
"section"
);
patternSettingsPane.id =
"algo-bot-lite-pattern-settings";
patternSettingsPane.className =
"algo-bot-lite-pattern-settings";
patternSettingsPane.setAttribute(
"aria-label",
"Настройки Паттерн 1-2"
);
}

if(
indicatorsRoot
){
indicatorsRoot.classList.add(
"algo-bot-lite-indicators",
"algo-bot-lite-pattern-only"
);
patternCell.appendChild(
indicatorsRoot
);
}

patternCell.appendChild(
patternSettingsPane
);

if(
globalSetupCol
){
globalSetupCol.classList.add(
"algo-bot-lite-global-col"
);
globalCell.appendChild(
globalSetupCol
);
}

if(
st1Col
){
st1Cell.appendChild(
st1Col
);
}

if(
st2Col
){
st2Cell.appendChild(
st2Col
);
}

if(
st3Col
){
st3Cell.appendChild(
st3Col
);
}

if(
rsiColumns
){
rsiCell.appendChild(
rsiColumns
);
}

if(
!earlyCell.querySelector(
".algo-bot-lite-alt-note"
)
){
const note =
document.createElement(
"p"
);
note.className =
"algo-bot-lite-alt-note";
note.textContent =
"1-2 Early T3: параметры в «Настройки». Запуск — кнопка «Запустить».";
earlyCell.appendChild(
note
);
}

if(
!emptyCell.querySelector(
".algo-bot-lite-alt-note"
)
){
const note =
document.createElement(
"p"
);
note.className =
"algo-bot-lite-alt-note";
note.textContent =
"Выберите бота в меню «Боты».";
emptyCell.appendChild(
note
);
}

if(
grid.parentElement !==
left
){
left.appendChild(
grid
);
}

relocateHeaderSettingsToTopbar();

[
0,
120,
350,
500
].forEach(
ms=>{
setTimeout(
relocateHeaderSettingsToTopbar,
ms
);
}
);

}

function relocateHeaderSettingsToTopbar(){

if(
!isAlgoBotLiteMode()
){
return;
}

const topbar =
document.getElementById(
"topbar"
);

if(
!topbar
){
return;
}

const wraps =
[
...document.querySelectorAll(
"#header-settings-wrap"
)
];

if(
!wraps.length
){
return;
}

const preferred =
wraps.find(
w=>
w.parentElement ===
topbar
) ||
wraps.find(
w=>
w.querySelector(
".cloud-auth-wrap"
)
) ||
wraps[
0
];

if(
preferred.parentElement !==
topbar
){
topbar.appendChild(
preferred
);
}

for(
const extra of
wraps
){
if(
extra !==
preferred
){
extra.remove();
}
}

}
