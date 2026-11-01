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
} from "../terminal/terminal-prefs.js?v=a4c00768";

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
} from "../terminal/terminal-table.js?v=4a6cb9f0";
