/**
 * Thin host for the algo coin list.
 * Isolates algo-trading-list from direct terminal-table / prefs imports
 * so the plugin boundary stays one module (swap/adapt here later).
 */
export {
coinsState,
coinElements
} from "../terminal/terminal-state.js?v=4747a92f";

export {
applyCoinsPrefs,
persistCoinsPrefs,
applySortForCurrentMarket,
readCoinsPrefs
} from "../terminal/terminal-prefs.js?v=f86c753b";

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
} from "../terminal/terminal-table.js?v=7bb9827b";
