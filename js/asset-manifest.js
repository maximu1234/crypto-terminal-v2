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
1;

/** @type {Readonly<Record<string, number>>} */
export const ASSETS =
Object.freeze({

/* ── JS: boot / entry ── */
"asset-manifest.js":
1,
"coins-page-boot.js":
10,
"chart-page.js":
5,
"terminal.js":
265,
"terminal/coins-state.js":
2,
"terminal/coins-prefs.js":
2,
"terminal/coins-table.js":
3,
"telegram-bot-public.js":
1,
"dashboard.js":
73,
"screener.js":
64,
"site-boot.js":
80,
"charts-lib-boot.js":
3,
"chart-import.js":
13,
"chart-widget-host.js":
2,
"tablet-gesture-policy.js":
1,
"tablet-widget-chart.js":
1,

/* ── JS: chart / drawings ── */
"chart.js":
115,
"chart/chart-options.js":
3,
"chart/chart-dom-crosshair.js":
7,
"chart/chart-factory.js":
2,
"chart-tablet-gestures.js":
17,
"coins-tablet-controller.js":
4,
"drawings.js":
195,
"drawings/init.js":
21,
"drawings/constants.js":
3,
"drawings/math.js":
1,
"drawings/fib-spec.js":
7,
"drawings/fib-portals.js":
2,
"drawings/position.js":
1,
"drawings/utils.js":
1,
"drawings/draw-render.js":
2,
"drawings/draw-hit.js":
3,
"drawings-cloud-sync.js":
36,
"drawings-cloud/worker-client.js":
1,
"drawings-cloud/pull-reconcile.js":
1,
"drawings-cloud/sync-lifecycle.js":
1,
"drawings-tablet-input.js":
1,
"drawings-storage.js":
6,
"drawings-storage-poller.js":
1,
"draw-ui-shared.js":
7,
"draw-toolbar-icon-data.js":
1,
"draw-tools-visible.js":
1,
"dashboard-draw-ui.js":
14,
"price-alert-ui.js":
35,
"indicators.js":
3,
"storage.js":
12,
"terminal-page.js":
3,
"coins-mobile.js":
4,
"widget-favorite-flag.js":
2,

/* ── JS: market data ── */
"api.js":
25,
"bybit-fetch.js":
10,
"bybit-listings.js":
2,
"bybit-network-ui.js":
2,
"bybit-route-pref.js":
1,
"twelvedata-fetch.js":
1,
"ws.js":
15,
"tickers.js":
21,

/* ── JS: cloud / auth ── */
"cloud-sync.js":
33,
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
1,
"favorites-cloud-sync.js":
2,

/* ── JS: alerts ── */
"alerts.js":
97,
"alerts-cloud-sync.js":
105,
"alerts-cloud/debug.js":
1,
"alerts-cloud/telegram-id.js":
1,
"alerts-cloud/worker-client.js":
1,
"alerts-cloud/registry-sync.js":
1,
"alerts-cloud/polling-realtime.js":
1,
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
"trade-calculator.js":
3,
"system-admin-page.js":
3,
"system-admin-access.js":
3,

/* ── CSS ── */
"critical-shell.css":
2,
"common.css":
21,
"screener.css":
21,
"terminal.css":
99,
"dashboard.css":
16,
"coins.css":
19,
"terminal-page.css":
1,
"site-mobile-nav.css":
3,
"alerts.css":
15,
"listings.css":
2,
"trade-calculator.css":
3,
"system-admin.css":
2

});

export const CHART_BUILD_ID =
"20260529-probe-horiz-future";

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
