/**
 * Desktop-only trade layer on /coins — styles + module init.
 */
import {
cssUrl
} from "./asset-manifest.js?v=2";

import {
initTradeExchangeSettings
} from "./trade-exchange-settings.js?v=6";

import {
initTradeVolumePresets
} from "./trade-volume-presets.js?v=2";

import {
initTradeMarketEntry
} from "./trade-market-entry.js?v=2";

import {
initTradeBookPanel
} from "./trade-book-panel.js?v=4";

const TRADE_CSS =
[
"trade-exchange-settings.css",
"trade-volume-presets.css",
"trade-market-entry.css",
"trade-book-panel.css",
"trade-chart-overlay.css",
"trade-order-plus-ui.css"
];

export function isDesktopTradeMode(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

export function enableTradeDesktopMode(){

if(
!isDesktopTradeMode()
){
return false;
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
const exists =
document.querySelector(
`link[rel="stylesheet"][href^="/css/${name}"]`
) ||
document.querySelector(
`link[rel="stylesheet"][href="${href}"]`
);

if(
exists
){
continue;
}

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

export async function initTradeDesktopBeforeChart(){

if(
!enableTradeDesktopMode()
){
return;
}

initTradeExchangeSettings();
initTradeVolumePresets();
initTradeMarketEntry();
initTradeBookPanel();

const {
initTradeOpenPositions
} =
await import(
"./trade-open-positions.js?v=1"
);

initTradeOpenPositions();

}

export async function initTradeDesktopAfterChart(){

if(
!isDesktopTradeMode()
){
return;
}

const {
initTradeChartOverlay
} =
await import(
"./trade-chart-overlay.js?v=13"
);

initTradeChartOverlay();

const {
initTradeChartOrders
} =
await import(
"./trade-chart-orders.js?v=2"
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
