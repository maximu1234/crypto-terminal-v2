/**
 * Раскладка standalone Algo Bot lite.
 * Split from js/algo-trading.js — поведение 1:1.
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

export function mountAlgoBotLiteLayout(){

if(
!isAlgoBotLiteMode()
){
return;
}

const left =
document.getElementById(
"left"
);
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

if(
!left ||
!indicatorsRoot ||
!statsPanel ||
!globalSetupCol ||
!st1Col ||
!st2Col ||
!st3Col
){
return;
}

document.body.classList.add(
"algo-bot-lite-layout"
);

if(
statsResize
){
statsResize.hidden =
true;
}

statsPanel.hidden =
true;

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

let topRow =
grid.querySelector(
".algo-bot-grid-top"
);

if(
!topRow
){
topRow =
document.createElement(
"div"
);
topRow.className =
"algo-bot-grid-top";
}

let bottomRow =
grid.querySelector(
".algo-bot-grid-bottom"
);

if(
!bottomRow
){
bottomRow =
document.createElement(
"div"
);
bottomRow.className =
"algo-bot-grid-bottom";
}

function ensureCell(
row,
selector,
className,
ariaLabel
){

let cell =
row.querySelector(
selector
);

if(
!cell
){
cell =
document.createElement(
"section"
);
cell.className =
className;
cell.setAttribute(
"aria-label",
ariaLabel
);
row.appendChild(
cell
);
}

return cell;

}

const patternCell =
ensureCell(
topRow,
".algo-bot-grid-pattern",
"algo-bot-grid-cell algo-bot-grid-pattern",
"Паттерн 1-2"
);
const globalCell =
ensureCell(
topRow,
".algo-bot-grid-global",
"algo-bot-grid-cell algo-bot-grid-global",
"Глобальные настройки"
);
const st1Cell =
ensureCell(
bottomRow,
".algo-bot-grid-st1",
"algo-bot-grid-cell algo-bot-grid-st1",
"Стратегия 1"
);
const st2Cell =
ensureCell(
bottomRow,
".algo-bot-grid-st2",
"algo-bot-grid-cell algo-bot-grid-st2",
"Стратегия 2"
);
const st3Cell =
ensureCell(
bottomRow,
".algo-bot-grid-st3",
"algo-bot-grid-cell algo-bot-grid-st3",
"Стратегия 3"
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

indicatorsRoot.classList.add(
"algo-bot-lite-indicators",
"algo-bot-lite-pattern-only"
);
patternCell.appendChild(
indicatorsRoot
);
patternCell.appendChild(
patternSettingsPane
);

globalSetupCol.classList.add(
"algo-bot-lite-global-col"
);
globalCell.appendChild(
globalSetupCol
);
st1Cell.appendChild(
st1Col
);
st2Cell.appendChild(
st2Col
);
st3Cell.appendChild(
st3Col
);

grid.append(
topRow,
bottomRow
);

if(
grid.parentElement !==
left
){
left.appendChild(
grid
);
}

const topbar =
document.getElementById(
"topbar"
);
const accountWrap =
document.getElementById(
"header-settings-wrap"
);

if(
topbar &&
accountWrap &&
accountWrap.parentElement !==
topbar
){
topbar.appendChild(
accountWrap
);
}

}
