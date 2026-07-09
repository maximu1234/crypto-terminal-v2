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
8,
"btc-dominance/btc-d-page.js":
4,
"btc-dominance/tv-embed.js":
3,

/* ── JS: boot / entry ── */
"asset-manifest.js":
2,
"terminal-page-boot.js":
23,
"terminal-entry.js":
1,
"terminal-list-refresh.js":
1,
"trade-desktop-boot.js":
16,
"desktop-menu-bar-tray.js":
5,
"trade-diary-access.js":
1,
"trade-diary-format.js":
3,
"trade-diary-nav.js":
9,
"trade-diary-page.js":
11,
"trade-diary-period.js":
3,
"trade-diary-detail.js":
6,
"trade-diary-chart.js":
8,
"trade-positions-cache.js":
6,
"trade-position-sounds.js":
3,
"trade-positions-live.js":
1,
"trade-format.js":
1,
"trade-open-positions.js":
3,
"trade-stream-bridge.js":
6,
"trade-exchange-settings.js":
17,
"trade-volume-presets.js":
10,
"trade-leverage-settings.js":
3,
"trade-auto-stops.js":
2,
"trade-market-entry.js":
4,
"trade-book-panel.js":
51,
"trade-pnl-share-modal.js":
5,
"trade-book-columns.js":
14,
"trade-chart-overlay.js":
31,
"trade-chart-orders.js":
18,
"trade-order-plus-ui.js":
2,
"trade-widget-mount.js":
9,
"qwerty-key-input.js":
1,
"chart-page.js":
6,
"terminal.js":
375,
"terminal-multi-chart.js":
11,
"terminal-screener-chart-pane.js":
13,
"terminal-layout-picker.js":
11,
"terminal/terminal-chart-layout.js":
6,
"terminal/terminal-chart-switch-veil.js":
7,
"chart-layout-gate.js":
2,
"chart-visible-range.js":
1,
"chart-indicators.js":
30,
"indicators/pattern-12.js":
5,
"indicators/pattern-12-math.js":
4,
"indicators/pattern-12-paint.js":
3,
"pattern-12-scanner.js":
15,
"pattern-scan-results.js":
1,
"script-page.js":
26,
"script-page-boot.js":
15,
"script-page-chart.js":
4,
"script-page-storage.js":
9,
"script-page-widgets.js":
5,
"script-terminal-status.js":
5,
"script-scan-background.js":
8,
"indicators/horizontal-volume.js":
9,
"indicators/rsi-pane.js":
2,
"indicators/volume-pane.js":
5,
"indicators/ao-math.js":
1,
"indicators/ao-pane.js":
2,
"indicators/indicator-pane-order.js":
1,
"indicators/moving-average.js":
14,
"indicators/ma-math.js":
2,
"indicators/ema-shift-ribbon.js":
6,
"indicators/indicator-color-picker-ui.js":
1,
"indicators/htf-loader.js":
2,
"indicators/htf-ema.js":
1,
"indicators/indicator-settings-dialog.js":
7,
"indicators/registry.js":
1,
"terminal-layout-resize.js":
7,
"terminal-layout-math.js":
5,
"terminal/terminal-state.js":
9,
"terminal/terminal-prefs.js":
11,
"terminal/terminal-table.js":
17,
"telegram-bot-public.js":
1,
"watchlist.js":
95,
"screener.js":
91,
"screener-widget-guard.js":
1,
"screener-pattern-prefs.js":
1,
"screener-pattern-overlay.js":
3,
"screener-widget-zoom.js":
10,
"release-marker.js":
27,
"focus-blur-after-pick.js":
3,
"site-boot.js":
103,
"site-header.js":
3,
"site-header-nav.js":
3,
"site-header-nav-web.js":
1,
"site-header-nav-desktop.js":
1,
"desktop-app-ui.js":
4,
"desktop-trade-nav.js":
1,
"suppress-native-context-menu.js":
4,
"charts-lib-boot.js":
3,
"chart-import.js":
43,
"chart-widget-host.js":
15,
"tablet-gesture-policy.js":
2,
"tablet-widget-chart.js":
2,

/* ── JS: chart / drawings ── */
"chart.js":
153,
"chart/chart-options.js":
7,
"chart/chart-dom-crosshair.js":
15,
"chart/chart-factory.js":
40,
"chart-tablet-gestures.js":
19,
"terminal-tablet-controller.js":
6,
"drawings.js":
248,
"drawings/init.js":
144,
"drawings/draw-edit-desktop.js":
8,
"drawings/draw-undo.js":
2,
"drawings/drawings-persist.js":
7,
"drawings/draw-style-bar.js":
16,
"drawings/draw-templates.js":
4,
"drawings/draw-alerts-chart.js":
3,
"drawings/draw-price-scale.js":
7,
"drawings/draw-redraw-loop.js":
7,
"drawings/draw-chart-input.js":
1,
"drawings/draw-edit-interaction.js":
12,
"drawings/draw-placement.js":
8,
"drawings/chart-ruler.js":
8,
"drawings/draw-magnet.js":
1,
"drawings/scale-label-layout.js":
2,
"drawings/constants.js":
9,
"drawings/math.js":
1,
"drawings/fib-spec.js":
13,
"drawings/fib-portals.js":
3,
"drawings/position.js":
2,
"drawings/utils.js":
1,
"drawings/arrow-rect.js":
2,
"drawings/brush.js":
2,
"drawings/brush-placement.js":
3,
"drawings/draw-render.js":
13,
"drawings/draw-hit.js":
9,
"drawings-cloud-sync.js":
46,
"drawings-cloud/worker-client.js":
8,
"drawings-cloud/pull-reconcile.js":
12,
"drawings-cloud/sync-lifecycle.js":
10,
"drawings-tablet-input.js":
3,
"drawings-storage.js":
7,
"drawings-storage-poller.js":
1,
"draw-color-palette.js":
6,
"draw-ui-shared.js":
29,
"draw-toolbar-icon-data.js":
29,
"draw-tools-visible.js":
2,
"watchlist-draw-ui.js":
15,
"price-alert-ui.js":
45,
"indicators.js":
3,
"storage.js":
13,
"watchlist-page.js":
4,
"widget-favorite-flag.js":
6,

/* ── JS: market data ── */
"api.js":
29,
"bybit-fetch.js":
17,
"bybit-listings.js":
5,
"bybit-network-ui.js":
2,
"bybit-route-pref.js":
2,
"twelvedata-fetch.js":
1,

/* ── JS: btc dominance (test) ── */
"btc-dominance/fetch.js":
1,
"btc-dominance/test-page.js":
5,

"ws.js":
17,
"tickers.js":
23,

/* ── JS: cloud / auth ── */
"cloud-sync.js":
42,
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
4,
"auth-ui.js":
39,
"header-settings-shell.js":
3,
"app-settings-window.js":
9,
"app-settings-secret.js":
6,
"telegram-settings-panel.js":
1,
"favorites-settings-panel.js":
1,
"alert-auth-cache.js":
7,
"favorites.js":
4,
"favorites-cloud-sync.js":
6,

/* ── JS: alerts ── */
"alerts.js":
100,
"alerts-cloud-sync.js":
111,
"alerts-cloud/garbage-purge.js":
1,
"alerts-cloud/debug.js":
4,
"alerts-cloud/telegram-id.js":
2,
"alerts-cloud/worker-client.js":
4,
"alerts-cloud/registry-sync.js":
5,
"alerts-cloud/polling-realtime.js":
7,
"alerts-page.js":
64,
"alert-monitor.js":
65,
"alert-worker-url.js":
2,

/* ── JS: misc ── */
"async-timeout.js":
1,
"site-css-gate.js":
1,
"site-css-ready.js":
3,
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
9,
"system-admin-drawings-purge.js":
2,
"system-admin-alerts-purge.js":
2,
"system-admin-worker-reload-ms.js":
3,
"system-admin-access.js":
3,
"supabase-usage-prefs.js":
4,
"system-admin-supabase-prefs.js":
2,

/* ── CSS ── */
"critical-shell.css":
9,
"common.css":
49,
"screener.css":
48,
"terminal.css":
163,
"watchlist.css":
52,
"terminal-layout.css":
96,
"script-page.css":
15,
"chart-indicators.css":
21,
"pattern-12-scanner.css":
1,
"trade-exchange-settings.css":
16,
"app-settings-window.css":
4,
"trade-volume-presets.css":
6,
"trade-leverage-settings.css":
2,
"trade-market-entry.css":
2,
"trade-book-panel.css":
49,
"trade-pnl-share-modal.css":
2,
"trade-diary.css":
16,
"trade-diary-period.css":
1,
"trade-chart-overlay.css":
13,
"trade-order-plus-ui.css":
4,
"trade-widget-compact.css":
3,
"watchlist-page.css":
3,
"alerts.css":
20,
"listings.css":
5,
"statistics.css":
11,
"trade-calculator.css":
6,
"system-admin.css":
10,
"desktop-app.css":
2,

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

export const TERMINAL_BOOT_V =
ASSETS[
"terminal-page-boot.js"
];

export const CHART_PAGE_V =
ASSETS[
"chart-page.js"
];

export const TERMINAL_ENTRY =
jsUrl(
"terminal-entry.js"
);

/** @deprecated use TERMINAL_ENTRY */
export const COINS_PAGE_ENTRY =
TERMINAL_ENTRY;

export const CHART_PAGE_ENTRY =
jsUrl(
"chart-page.js"
);

export const CHART_IMPORT_ENTRY =
jsUrl(
"chart-import.js"
);
