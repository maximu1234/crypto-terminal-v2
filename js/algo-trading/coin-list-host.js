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
} from "../terminal/terminal-prefs.js?v=004b0449";

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
} from "../terminal/terminal-table.js?v=57c20489";
