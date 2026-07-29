/**
 * @module page-routes
 * Единое определение «на какой странице мы» — pathname без query/hash.
 *
 * Имена страниц (2026): Скринер / Терминал / Вотчлист.
 * Legacy URL: /index → Скринер, /coins → Терминал, /terminal → Вотчлист.
 */

/** @returns {string} */
export function pagePath(){

return typeof location !==
"undefined"
? (
location.pathname ||
""
)
: "";

}

/** @param {RegExp} re */
function pathMatches(
re
){

return re.test(
pagePath()
);

}

const SCREENER_PATH_RE =
/^\/(?:screener|index)(?:\.html)?\/?$/i;

const TERMINAL_PATH_RE =
/^\/(?:terminal|coins|trade)(?:\.html)?\/?$/i;

const TERMINAL_ONLY_PATH_RE =
/^\/(?:terminal|coins)(?:\.html)?\/?$/i;

const WATCHLIST_PATH_RE =
/^\/watchlist(?:\.html)?\/?$/i;

export function isAlertsPage(){

return pathMatches(
/\/alerts(\.html)?\/?$/i
);

}

export function isScreenerPage(){

const path =
pagePath();

return (
path ===
"/" ||
path ===
"" ||
SCREENER_PATH_RE.test(
path
)
);

}

export function isTerminalPageOnly(){

return TERMINAL_ONLY_PATH_RE.test(
pagePath()
);

}

export function isTerminalPage(){

return (
isTerminalPageOnly() ||
isTradePage()
);

}

export function isWatchlistPage(){

return WATCHLIST_PATH_RE.test(
pagePath()
);

}

export function isTradePage(){

const path =
pagePath();

if(
pathMatches(
/\/trade(\.html)?\/?$/i
)
){
return true;
}

if(
!TERMINAL_ONLY_PATH_RE.test(
path
)
){
return false;
}

return !!(
typeof globalThis !==
"undefined" &&
globalThis.window?.cryptoTerminalDesktop?.isDesktop
);

}

/** @deprecated use isTerminalPage */
export function isCoinsPage(){

return isTerminalPage();

}

/** @deprecated use isTerminalPageOnly */
export function isCoinsPageOnly(){

return isTerminalPageOnly();

}

/** @deprecated use isWatchlistPage */
export function isTerminalDashboardPage(){

return isWatchlistPage();

}

export function isListingsPage(){

return pathMatches(
/\/listings(\.html)?\/?$/i
);

}

export function isTradeCalculatorPage(){

return pathMatches(
/\/trade-calculator(\.html)?\/?$/i
);

}

export function isStatisticsPage(){

return pathMatches(
/\/statistics(\.html)?\/?$/i
);

}

export function isScriptPage(){

return pathMatches(
/\/script(\.html)?\/?$/i
);

}

export function isAlgoTradingPage(){

return pathMatches(
/\/algo-trading(\.html)?\/?$/i
);

}

/**
 * Standalone Algo Bot (.app / botLite) — не полный Multichart cloud-клиент.
 * JWT + push алертов / lock / remote — да; фоновый pull реестра / favorites — нет.
 */
export function isAlgoBotLiteShell(){

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

export function isSystemAdminPage(){

return pathMatches(
/\/system(\.html)?\/?$/i
);

}

/** Страницы с canvas рисования (терминал, вотчлист, скринер). */
export function isDrawingsUiPage(){

return (
isTerminalPage() ||
isWatchlistPage() ||
isScreenerPage()
);

}
