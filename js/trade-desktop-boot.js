/**
 * Desktop-only trade layer — /terminal (график) и /watchlist (виджеты).
 */
import {
cssUrl
} from "./asset-manifest.js?v=c3d3f6ca";

import {
isWatchlistPage
} from "./page-routes.js?v=4dc7f350";

import {
initTradeExchangeSettings
} from "./trade-exchange-settings.js?v=6c6da46f";

import {
initTradeVolumePresets
} from "./trade-volume-presets.js?v=3f8f44bc";

import {
initTradeLeverageSettings
} from "./trade-leverage-settings.js?v=11228454";

import {
initTradeMarketEntry
} from "./trade-market-entry.js?v=d467300e";

import {
initTradeBookPanel
} from "./trade-book-panel.js?v=3628b27b";

import {
loadTradeExchangeModules
} from "./trade/module-router.js?v=f9d37714";

import {
getActiveExchangeId
} from "./market-api.js?v=00f19708";

const TRADE_CSS =
[
"trade-exchange-settings.css",
"trade-volume-presets.css",
"trade-leverage-settings.css",
"trade-market-entry.css",
"trade-book-panel.css",
"trade-pnl-share-modal.css",
"trade-chart-overlay.css",
"trade-order-plus-ui.css",
"trade-widget-compact.css"
];

export function isDesktopTradeMode(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

export function isWatchlistTradeMode(){

return (
isDesktopTradeMode() &&
isWatchlistPage()
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
"terminal";

if(
!enableTradeDesktopMode()
){
return;
}

if(
mode ===
"watchlist"
){
if(
!isWatchlistPage()
){
return;
}

initTradeExchangeSettings();
await loadTradeExchangeModules(
getActiveExchangeId()
);

const {
initExchangeTradingGate
} =
await import(
"./exchange-trading-gate.js?v=4a599334"
);

await initExchangeTradingGate();
return;
}

initTradeExchangeSettings();

await loadTradeExchangeModules(
getActiveExchangeId()
);
initTradeVolumePresets();
initTradeLeverageSettings();
initTradeMarketEntry();

const {
initExchangeTradingGate
} =
await import(
"./exchange-trading-gate.js?v=4a599334"
);

await initExchangeTradingGate();

const {
initTradePositionSounds
} =
await import(
"./trade-position-sounds.js?v=2db7043e"
);

initTradePositionSounds();

const {
initTradePositionsLive
} =
await import(
"./trade-positions-live.js?v=f157c61d"
);

initTradePositionsLive();

/* Book panel after first chart paint — see initTradeDesktopAfterChart */

const {
initDesktopMenuBarTray
} =
await import(
"./desktop-menu-bar-tray.js?v=ea5f485f"
);

initDesktopMenuBarTray();

const {
initTradeDiaryNav
} =
await import(
"./trade-diary-nav.js?v=d304920d"
);

void initTradeDiaryNav();

const {
initTradeOpenPositions
} =
await import(
"./trade-open-positions.js?v=0200da43"
);

initTradeOpenPositions();

}

export async function initTradeDesktopAfterChart(
options =
{}
){

const mode =
options.mode ||
"terminal";

if(
!isDesktopTradeMode()
){
return;
}

if(
mode ===
"watchlist"
){
const {
initTradePositionsCache
} =
await import(
"./trade-positions-cache.js?v=cd271402"
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

/* Wait for deferred drawings/indicators host before overlay/orders mount. */
await new Promise(
resolve=>{

if(
window.__tradeChartHost
){
resolve();
return;
}

const t =
window.setTimeout(
resolve,
8000
);

window.addEventListener(
"trade-chart-host-ready",
()=>{
window.clearTimeout(
t
);
resolve();
},
{
once:
true
}
);

}
);

const {
initTradeChartOverlay
} =
await import(
"./trade-chart-overlay.js?v=fa328f69"
);

initTradeChartOverlay();

const {
initTradeChartOrders
} =
await import(
"./trade-chart-orders.js?v=6bc8ec53"
);

initTradeChartOrders();

const {
initTradeChartExecutionMarkers
} =
await import(
"./trade-chart-execution-markers.js?v=f73f4f57"
);

initTradeChartExecutionMarkers();

initTradeBookPanel();

window.__tradeAppReady =
true;

window.dispatchEvent(
new CustomEvent(
"trade-app-ready"
)
);

}
