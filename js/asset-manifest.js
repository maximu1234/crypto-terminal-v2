/**
 * Единый реестр cache-bust версий (?v=).
 *
 * Менять ТОЛЬКО здесь, затем:
 *   node scripts/sync-asset-versions.cjs
 *
 * Bump одного файла:
 *   node scripts/sync-asset-versions.cjs bump chart.js
 */
export const MANIFEST_V =
2;

/** @type {Readonly<Record<string, number>>} */
export const ASSETS =
Object.freeze({

"btc-dominance-test.css":
5,
"btc-d-page.css":
7,
"btc-dominance/btc-d-page.js":
4,
"btc-dominance/tv-embed.js":
3,

/* ── JS: boot / entry ── */
"asset-manifest.js":
2,
"coins-page-boot.js":
14,
"qwerty-key-input.js":
1,
"chart-page.js":
6,
"terminal.js":
312,
"coins-layout-resize.js":
4,
"coins-layout-math.js":
2,
"terminal/coins-state.js":
6,
"terminal/coins-prefs.js":
7,
"terminal/coins-table.js":
11,
"telegram-bot-public.js":
1,
"dashboard.js":
83,
"screener.js":
77,
"release-marker.js":
11,
"site-boot.js":
87,
"desktop-app-ui.js":
2,
"suppress-native-context-menu.js":
2,
"charts-lib-boot.js":
3,
"chart-import.js":
41,
"chart-widget-host.js":
11,
"tablet-gesture-policy.js":
1,
"tablet-widget-chart.js":
1,

/* ── JS: chart / drawings ── */
"chart.js":
148,
"chart/chart-options.js":
7,
"chart/chart-dom-crosshair.js":
14,
"chart/chart-factory.js":
32,
"chart-tablet-gestures.js":
17,
"coins-tablet-controller.js":
5,
"drawings.js":
233,
"drawings/init.js":
95,
"drawings/draw-edit-desktop.js":
1,
"drawings/draw-undo.js":
1,
"drawings/drawings-persist.js":
2,
"drawings/draw-style-bar.js":
3,
"drawings/draw-alerts-chart.js":
2,
"drawings/draw-price-scale.js":
3,
"drawings/draw-redraw-loop.js":
1,
"drawings/draw-chart-input.js":
1,
"drawings/draw-edit-interaction.js":
4,
"drawings/draw-placement.js":
3,
"drawings/chart-ruler.js":
8,
"drawings/draw-magnet.js":
1,
"drawings/scale-label-layout.js":
2,
"drawings/constants.js":
8,
"drawings/math.js":
1,
"drawings/fib-spec.js":
12,
"drawings/fib-portals.js":
3,
"drawings/position.js":
1,
"drawings/utils.js":
1,
"drawings/arrow-rect.js":
2,
"drawings/draw-render.js":
8,
"drawings/draw-hit.js":
8,
"drawings-cloud-sync.js":
42,
"drawings-cloud/worker-client.js":
7,
"drawings-cloud/pull-reconcile.js":
6,
"drawings-cloud/sync-lifecycle.js":
7,
"drawings-tablet-input.js":
3,
"drawings-storage.js":
7,
"drawings-storage-poller.js":
1,
"draw-color-palette.js":
6,
"draw-ui-shared.js":
23,
"draw-toolbar-icon-data.js":
11,
"draw-tools-visible.js":
1,
"dashboard-draw-ui.js":
15,
"price-alert-ui.js":
39,
"indicators.js":
3,
"storage.js":
13,
"terminal-page.js":
3,
"coins-mobile.js":
5,
"widget-favorite-flag.js":
3,

/* ── JS: market data ── */
"api.js":
27,
"bybit-fetch.js":
14,
"bybit-listings.js":
5,
"bybit-network-ui.js":
2,
"bybit-route-pref.js":
1,
"twelvedata-fetch.js":
1,

/* ── JS: btc dominance (test) ── */
"btc-dominance/fetch.js":
1,
"btc-dominance/test-page.js":
5,

"ws.js":
15,
"tickers.js":
21,

/* ── JS: cloud / auth ── */
"cloud-sync.js":
34,
"cloud-sync-throttle.js":
3,
"page-routes.js":
1,
"device-pull-gate.js":
1,
"ticker-update-batch.js":
1,
"types/chart-types.js":
1,
"supabase-client.js":
7,
"supabase-env.js":
5,
"auth-storage.js":
3,
"auth-ui.js":
27,
"alert-auth-cache.js":
7,
"favorites.js":
2,
"favorites-cloud-sync.js":
3,

/* ── JS: alerts ── */
"alerts.js":
97,
"alerts-cloud-sync.js":
110,
"alerts-cloud/debug.js":
2,
"alerts-cloud/telegram-id.js":
2,
"alerts-cloud/worker-client.js":
3,
"alerts-cloud/registry-sync.js":
3,
"alerts-cloud/polling-realtime.js":
2,
"alerts-page.js":
60,
"alert-monitor.js":
64,
"alert-worker-url.js":
1,

/* ── JS: misc ── */
"async-timeout.js":
1,
"site-css-gate.js":
1,
"site-css-ready.js":
2,
"site-mobile-nav.js":
4,
"mobile-nav-drawer.js":
1,
"mobile-recovery.js":
1,
"position-sizing.js":
1,
"symbol-autocomplete.js":
1,
"listings.js":
4,
"statistics.js":
11,
"statistics-background.js":
5,
"trade-calculator.js":
3,
"system-admin-page.js":
5,
"system-admin-drawings-purge.js":
2,
"system-admin-access.js":
3,
"supabase-usage-prefs.js":
1,
"system-admin-supabase-prefs.js":
1,

/* ── CSS ── */
"critical-shell.css":
5,
"common.css":
27,
"screener.css":
34,
"terminal.css":
138,
"dashboard.css":
42,
"coins.css":
41,
"terminal-page.css":
2,
"site-mobile-nav.css":
4,
"alerts.css":
17,
"listings.css":
4,
"statistics.css":
10,
"trade-calculator.css":
5,
"system-admin.css":
8,
"desktop-app.css":
1

});

export const CHART_BUILD_ID =
"20260609-future-timescale-v10";

export function jsVer(
name
){

const n =
ASSETS[
name
];

if(
n ==
null
){
throw new Error(
`asset-manifest: unknown js asset "${name}"`
);
}

return n;

}

export function cssVer(
name
){

return jsVer(
name
);
}

export function jsImport(
name
){

return `./${name}?v=${jsVer(name)}`;
}

export function jsUrl(
name
){

return `/js/${name}?v=${jsVer(name)}`;
}

export function cssUrl(
name
){

return `/css/${name}?v=${cssVer(name)}`;
}

/* Coins boot aliases (backward compat) */
export const CHART_JS_V =
ASSETS[
"chart.js"
];

export const CHART_IMPORT_V =
ASSETS[
"chart-import.js"
];

export const TERMINAL_JS_V =
ASSETS[
"terminal.js"
];

export const COINS_BOOT_V =
ASSETS[
"coins-page-boot.js"
];

export const CHART_PAGE_V =
ASSETS[
"chart-page.js"
];

export const TERMINAL_ENTRY =
jsUrl(
"terminal.js"
);

export const CHART_PAGE_ENTRY =
jsUrl(
"chart-page.js"
);

export const CHART_IMPORT_ENTRY =
jsUrl(
"chart-import.js"
);
