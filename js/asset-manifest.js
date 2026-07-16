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

"trade-markers-sandbox/marker-math.js":
9,
"trade-markers-sandbox/trade-fetch.js":
12,

/* ── JS: boot / entry ── */
"asset-manifest.js":
2,
"market-api.js":
2,
"exchanges/context.js":
1,
"exchanges/registry.js":
1,
"exchanges/symbol.js":
1,
"exchanges/bybit/public.js":
1,
"exchanges/bybit/ping.js":
1,
"exchanges/bingx/public.js":
4,
"exchanges/bingx/fetch.js":
3,
"exchanges/bingx/markets.js":
3,
"exchanges/bingx/ws.js":
17,
"exchanges/bingx/intervals.js":
1,
"terminal-page-boot.js":
23,
"terminal-entry.js":
1,
"terminal-list-refresh.js":
1,
"trade-desktop-boot.js":
20,
"desktop-menu-bar-tray.js":
5,
"trade-diary-access.js":
3,
"trade-diary-format.js":
3,
"trade-diary-nav.js":
11,
"trade-diary-page.js":
24,
"trade-diary-period.js":
3,
"trade-diary-detail.js":
6,
"trade-diary-chart.js":
10,
"trade-positions-cache.js":
32,
"trade-position-sounds.js":
3,
"trade-positions-live.js":
1,
"trade-format.js":
1,
"trade-open-positions.js":
3,
"trade-stream-bridge.js":
17,
"exchange-trading-gate.js":
2,
"trade-exchange-settings.js":
18,
"trade-volume-presets.js":
10,
"trade-leverage-settings.js":
3,
"trade-auto-stops.js":
14,
"trade-position-open-orders.js":
4,
"trade-position-close-orders.js":
1,
"trade-market-entry.js":
30,
"trade-book-panel.js":
58,
"trade-pnl-share-modal.js":
8,
"trade-book-columns.js":
14,
"trade-chart-execution-markers.js":
2,
"trade-pnl-privacy.js":
1,
"trade-chart-overlay.js":
58,
"trade-chart-orders.js":
30,
"trade-order-plus-ui.js":
5,
"trade-widget-mount.js":
13,
"trade/exchanges/index.js":
12,
"trade/exchanges/bybit-trade-policy.js":
1,
"trade/exchanges/bingx-trade-policy.js":
10,
"qwerty-key-input.js":
1,
"chart-page.js":
6,
"terminal.js":
385,
"terminal-multi-chart.js":
11,
"terminal-screener-chart-pane.js":
13,
"terminal-layout-picker.js":
11,
"terminal/terminal-chart-layout.js":
7,
"terminal/terminal-chart-switch-veil.js":
7,
"chart-layout-gate.js":
2,
"chart-visible-range.js":
1,
"chart-indicators.js":
37,
"indicators/pattern-12.js":
5,
"indicators/pattern-12-math.js":
4,
"indicators/pattern-12-paint.js":
3,
"pattern-12-scanner.js":
16,
"pattern-scan-results.js":
1,
"script-page.js":
28,
"script-page-boot.js":
16,
"script-page-chart.js":
4,
"script-page-storage.js":
11,
"script-page-widgets.js":
5,
"script-terminal-status.js":
5,
"script-scan-background.js":
11,
"indicators/horizontal-volume.js":
9,
"indicators/rsi-pane.js":
2,
"indicators/volume-pane.js":
11,
"indicators/ao-math.js":
1,
"indicators/ao-pane.js":
8,
"indicators/indicator-pane-order.js":
1,
"indicators/indicator-pane-viewport.js":
2,
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
11,
"terminal/terminal-prefs.js":
17,
"terminal/terminal-table.js":
20,
"telegram-bot-public.js":
1,
"watchlist.js":
96,
"screener.js":
92,
"screener-widget-guard.js":
1,
"screener-pattern-prefs.js":
1,
"screener-pattern-overlay.js":
3,
"screener-widget-zoom.js":
11,
"release-marker.js":
29,
"focus-blur-after-pick.js":
3,
"site-boot.js":
103,
"site-header.js":
4,
"site-header-nav.js":
4,
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
253,
"drawings/init.js":
160,
"drawings/draw-edit-desktop.js":
9,
"drawings/draw-undo.js":
2,
"drawings/drawings-persist.js":
9,
"drawings/draw-style-bar.js":
28,
"drawings/draw-templates.js":
8,
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
10,
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
47,
"drawings-tablet-input.js":
3,
"drawings-storage.js":
7,
"drawings-storage-poller.js":
1,
"draw-color-palette.js":
6,
"draw-ui-shared.js":
31,
"draw-toolbar-icon-data.js":
29,
"draw-tools-visible.js":
2,
"watchlist-draw-ui.js":
16,
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
3,
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
45,
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
40,
"header-settings-shell.js":
3,
"app-settings-window.js":
10,
"app-settings-secret.js":
7,
"telegram-settings-panel.js":
1,
"favorites-settings-panel.js":
1,
"alert-auth-cache.js":
7,
"favorites.js":
5,
"favorites-cloud-sync.js":
7,

/* ── JS: alerts ── */
"alerts.js":
102,
"alerts-cloud-sync.js":
111,
"alerts-cloud/garbage-purge.js":
1,
"alerts-cloud/debug.js":
4,
"alerts-cloud/telegram-id.js":
2,
"alerts-cloud/worker-client.js":
5,
"alerts-cloud/registry-sync.js":
8,
"alerts-cloud/polling-realtime.js":
9,
"alerts-page.js":
65,
"alert-monitor.js":
70,
"alert-deep-link-exchange.js":
1,
"alert-deep-link-url.js":
2,
"alert-ui-prefs.js":
1,
"alert-worker-url.js":
2,

/* ── JS: misc ── */
"async-timeout.js":
2,
"site-css-gate.js":
1,
"site-css-ready.js":
3,
"position-sizing.js":
1,
"symbol-autocomplete.js":
2,
"listings.js":
5,
"statistics.js":
11,
"statistics-background.js":
5,
"trade-calculator.js":
3,
"system-admin-page.js":
10,
"system-admin-alerts-purge.js":
2,
"system-admin-worker-reload-ms.js":
4,
"system-admin-access.js":
3,
"supabase-usage-prefs.js":
5,
"system-admin-supabase-prefs.js":
4,

/* ── CSS ── */
"critical-shell.css":
9,
"common.css":
50,
"screener.css":
49,
"terminal.css":
166,
"watchlist.css":
53,
"terminal-layout.css":
96,
"script-page.css":
16,
"chart-indicators.css":
21,
"pattern-12-scanner.css":
1,
"trade-exchange-settings.css":
16,
"app-settings-window.css":
5,
"trade-volume-presets.css":
6,
"trade-leverage-settings.css":
2,
"trade-market-entry.css":
3,
"trade-book-panel.css":
49,
"trade-pnl-share-modal.css":
4,
"trade-diary.css":
20,
"trade-diary-period.css":
1,
"trade-chart-overlay.css":
16,
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
