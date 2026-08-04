/**
 * Thin host for the algo coin list.
 * Isolates algo-trading-list from direct terminal-table / prefs imports
 * so the plugin boundary stays one module (swap/adapt here later).
 */
export {
coinsState,
coinElements
} from "../terminal/terminal-state.js?v=12";

export {
applyCoinsPrefs,
persistCoinsPrefs,
applySortForCurrentMarket,
readCoinsPrefs
} from "../terminal/terminal-prefs.js?v=20";

export {
generateMarketData,
primeTickerSnapshots,
startTickerStream,
startRealtime,
renderList,
highlightActiveSymbol,
ensureActiveCoinVisible,
setCoinsTableHooks,
syncCoinListFreezeFromFlagMenus,
getCurrentSymbols,
getVisibleSymbolList,
setCoinOpenPositionChecker
} from "../terminal/terminal-table.js?v=29";
