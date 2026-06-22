/**
 * Desktop-only trade layer — /coins и /terminal (виджеты).
 */
import {
cssUrl
} from "./asset-manifest.js?v=2";

import {
isTerminalDashboardPage
} from "./page-routes.js?v=1";

import {
initTradeExchangeSettings
} from "./trade-exchange-settings.js?v=11";

import {
initTradeVolumePresets
} from "./trade-volume-presets.js?v=8";

import {
initTradeMarketEntry
} from "./trade-market-entry.js?v=3";

import {
initTradeBookPanel
} from "./trade-book-panel.js?v=5";

const TRADE_CSS =
[
"trade-exchange-settings.css",
"trade-volume-presets.css",
"trade-market-entry.css",
"trade-book-panel.css",
"trade-chart-overlay.css",
"trade-order-plus-ui.css",
"trade-widget-compact.css"
];

export function isDesktopTradeMode(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

export function isDashboardTradeMode(){

return (
isDesktopTradeMode() &&
isTerminalDashboardPage()
);

}

export function enableTradeDesktopMode(){

if(
!isDesktopTradeMode()
){
return false;
}

for(
const name of
TRADE_CSS
){
const href =
cssUrl(
name
);

if(
!document.querySelector(
`link[rel="preload"][href="${href}"]`
)
){
const preload =
document.createElement(
"link"
);
preload.rel =
"preload";
preload.as =
"style";
preload.href =
href;
document.head.appendChild(
preload
);
}

}

document.body.classList.add(
"trade-page"
);

for(
const name of TRADE_CSS
){
const href =
cssUrl(
name
);
const prefix =
`/css/${name}`;

document.querySelectorAll(
`link[rel="stylesheet"][href^="${prefix}"]`
).forEach(
el=>{
el.remove();
}
);

const link =
document.createElement(
"link"
);
link.rel =
"stylesheet";
link.href =
href;
document.head.appendChild(
link
);
}

return true;

}

export async function initTradeDesktopBeforeChart(
options =
{}
){

const mode =
options.mode ||
"coins";

if(
!enableTradeDesktopMode()
){
return;
}

if(
mode ===
"terminal"
){
if(
!isTerminalDashboardPage()
){
return;
}

initTradeExchangeSettings();
return;
}

initTradeExchangeSettings();
initTradeVolumePresets();
initTradeMarketEntry();
initTradeBookPanel();

const {
initTradeDiaryNav
} =
await import(
"./trade-diary-nav.js?v=3"
);

void initTradeDiaryNav();

const {
initTradeOpenPositions
} =
await import(
"./trade-open-positions.js?v=2"
);

initTradeOpenPositions();

}

export async function initTradeDesktopAfterChart(
options =
{}
){

const mode =
options.mode ||
"coins";

if(
!isDesktopTradeMode()
){
return;
}

if(
mode ===
"terminal"
){
const {
initTradePositionsCache
} =
await import(
"./trade-positions-cache.js?v=1"
);

initTradePositionsCache();

window.__tradeAppReady =
true;

window.dispatchEvent(
new CustomEvent(
"trade-app-ready"
)
);
return;
}

const {
initTradeChartOverlay
} =
await import(
"./trade-chart-overlay.js?v=22"
);

initTradeChartOverlay();

const {
initTradeChartOrders
} =
await import(
"./trade-chart-orders.js?v=11"
);

initTradeChartOrders();

window.__tradeAppReady =
true;

window.dispatchEvent(
new CustomEvent(
"trade-app-ready"
)
);

}
