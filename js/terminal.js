/**
 * Terminal page (/terminal.html) — main chart app implementation.
 *
 * Entry: terminal-page-boot.js → terminal-entry.js → this file.
 * Watchlist widgets (/watchlist.html) are watchlist.js — not this module.
 */
import {
loadMarketHistory,
loadMarketSymbols,
buildMarketLists,
peekMarketSymbolsCache,
isActiveRealtimeMarketDataset,
formatExchangeDisplayLabel,
getActiveCoinsMarkets,
getActiveExchangeMarkets,
getActiveExchangeId,
getActiveExchangeDefinition,
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=00f19708";

import {
peekHistoryCache,
putHistoryCache,
mergeCandleRows,
logicalIndexShift
} from "./market-history-cache.js?v=dedca4e1";

import {
isSlowHistoryLink,
slowHistoryPageLimit
} from "./history-link-pace.js?v=f684ac11";

import {
clearBybitNetworkIssue
} from "./bybit-network-ui.js?v=2d117b93";

import {
openChromeSurface
} from "./chrome-motion.js?v=bb1d8933";

import {
resolveUrlExchangeDeepLink
} from "./alert-deep-link-exchange.js?v=d929cf89";

import {
defaultRsiPaneSettings,
normalizeRsiPaneSettings
} from "./indicators/rsi-pane.js?v=482968f4";

import {
buildChartRsiPoints
} from "./indicators/htf-project.js?v=2d6ecf34";

import {
loadFavoritesGroups,
saveFavoritesGroups,
getFavoriteGroup,
setFavoriteGroup,
flagSortRank,
canSetBlueFlag
} from "./favorites.js?v=d5f9b002";

import {
seedWatchlistTfOnBlueFlag
} from "./storage.js?v=bc113be9";

import {
ensureCloudReady
} from "./auth-ui.js?v=02e5f877";

import {
getActiveAlerts,
isMacdAlert,
isRsiAlert
} from "./alerts.js?v=7d94ac35";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=21b0e6e9";

import {
createCandlestickChart,
createRSIChart,
applyRsiFixedPriceScale,
applyRsiSeriesColorMode,
applyChartPriceFormat,
mountChartPriceHud,
syncLinkedChartTimescales,
linkPairedChartTimeScales,
linkChartsCrosshair,
updateRsiBandLayout,
updateRsiLevelLinesLayout,
applyTabletRsiChartOptions,
applyTabletMainChartScroll,
markTabletChartBody,
mountTabletPriceScaleTouch,
getVisibleCandlesPriceRange,
positionTabletProbeCrosshair,
hideTabletProbeCrosshair,
mountAxisDoubleTapReset,
TABLET_USE_CUSTOM_TOUCH_PAN,
isTabletChartViewport,
isUserCrosshairEvent,
pulsePriceScaleAutoscale,
computeChartFutureMarginBars,
appendFutureWhitespaceBars,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing,
tfPeriodSec
} from "./chart-import.js?v=613e412b";

import {
terminalVisibleBars,
TERMINAL_VISIBLE_BARS,
TERMINAL_HISTORY_INITIAL_BARS,
TERMINAL_HISTORY_DEPTH_EVENT,
getTerminalHistoryDepth,
terminalHistoryInitialRequests,
TERMINAL_HISTORY_LAZY_BATCH_BARS
} from "./terminal-chart-history-prefs.js?v=948df10f";

import {
mountCoinsTabletController
} from "./terminal-tablet-controller.js?v=4d24960f";

import {
disconnectKlineStream
} from "./market-ws.js?v=717ade46";

import {
syncBackgroundAlertStreams,
onMacdSeriesUpdate,
onRsiSeriesUpdate
} from "./alert-monitor.js?v=640feff3";

import {
createSharedDrawUndoStack
} from "./drawings/draw-undo.js?v=4725fe9d";

import {
mountDrawToolbar,
mountDrawToolIcons
} from "./draw-ui-shared.js?v=a01caf04";
import {
mountTerminalChecklist
} from "./terminal/terminal-checklist.js?v=fdec0be2";

import {
mountTerminalDxBall
} from "./terminal/terminal-dxball.js?v=5757f8f6";

import {
mountChartSnapshot
} from "./chart-snapshot.js?v=fad34145";

import {
mountChartSymbolFullName
} from "./symbol-display-name.js?v=fe72327b";

import {
perfMark,
perfMeasure
} from "./perf-marks.js?v=6857dee5";

import {
isCoinsPaneHeightDrag,
mountCoinsLayoutResize
} from "./terminal-layout-resize.js?v=671925b0";

import {
mountQwertyKeyInput,
shouldIgnoreTypingHotkey
} from "./qwerty-key-input.js?v=7ac067d9";

import {
DRAW_TOOL_HOTKEYS
} from "./drawings/draw-tool-hotkeys.js?v=4aa435aa";

import {
isChartLayoutReady,
setChartLayoutReady
} from "./chart-layout-gate.js?v=4a8798af";

import {
runWithPreservedVisibleLogicalRange
} from "./chart-visible-range.js?v=d523062b";

import {
registerCoinsState,
coinsState,
marketMap,
coinElements,
COINS_TF_VALUES,
COINS_TF_HOTKEYS,
COINS_MARKETS,
isTerminalPage,
isTradePage
} from "./terminal/terminal-state.js?v=4747a92f";

import {
mountCoinsScaleInvertMenu
} from "./terminal/terminal-scale-menu.js?v=d785cecd";

import {
mountTerminalDrawChrome
} from "./terminal/terminal-draw-chrome.js?v=e332d80e";



import {
stopTickerStream
} from "./tickers.js?v=d4995cf9";

import {
mountCoinsListRefreshControls,
applyCoinsListRefreshInterval
} from "./terminal-list-refresh.js?v=67e17538";

import {
readCoinsPrefs,
writeCoinsPrefs,
persistCoinsPrefs,
bootstrapCoinsPageState,
resolveInitialSymbolAndTf,
resolveSymbolForExchange,
saveLastViewForExchange,
applyCoinsPrefs,
applySortForCurrentMarket,
readUrlParams,
readLastViewForExchange
} from "./terminal/terminal-prefs.js?v=727592fc";

import {
mountDesktopOpenChartHandler
} from "./desktop-open-chart.js?v=d41f8543";

import {
getCurrentSymbols,
generateMarketData,
scheduleResortPriceColumns,
primeTickerSnapshots,
startTickerStream,
startRealtime,
stopLivePriceFallbacks,
renderList,
highlightActiveSymbol,
ensureActiveCoinVisible,
getVisibleSymbolList,
setCoinsTableHooks,
syncCoinListFreezeFromFlagMenus,
getExtraCoinMarkets,
isExtraCoinMarket
} from "./terminal/terminal-table.js?v=05b3d261";

import {
createCoinsChartSwitchVeil
} from "./terminal/terminal-chart-switch-veil.js?v=a93ba7fd";

import {
registerCoinsChartLayoutContext,
buildChartDisplayCandles,
settleCoinsChartViewport,
replaceCoinsChartCandles,
syncCoinsChartLinkedViewports,
resizeCharts,
scheduleResizeCharts,
applyDefaultZoom
} from "./terminal/terminal-chart-layout.js?v=92faf1fe";

import {
isTerminalReplayActive,
mountTerminalReplay,
replayVisibleCandles
} from "./terminal/terminal-replay.js?v=1b9e6de6";

import {
placeCoinsTabletListNav
} from "./terminal/coins-tablet-list-nav.js?v=ac1c11c4";

import {
initTerminalMultiChart,
syncPrimaryTfToLayout,
isTerminalMultiChartLayout
} from "./terminal-multi-chart.js?v=b5ac610b";

import {
mountTerminalLayoutPicker
} from "./terminal-layout-picker.js?v=1aaad26b";

import {
mountChartDisplayStyleUi
} from "./terminal/chart-display-style-ui.js?v=62beb927";

import {
loadChartDisplayStyle,
saveChartDisplayStyle
} from "./chart/chart-display-style.js?v=e916eea3";

import {
createPriceSeriesHost
} from "./chart/price-series-host.js?v=933b7652";

import {
CHART_PRICE_SCALE_MODE_LOGARITHMIC,
CHART_PRICE_SCALE_MODE_REGULAR,
normalizeChartPriceScaleMode,
applyChartPriceScaleMode,
lwPriceScaleModeId
} from "./chart/price-scale-mode.js?v=7deaefee";

import {
normalizeMinVolume,
parseMinVolumeFilter,
syncMinVolumeFilterInput,
mountMinVolumeFilterInput
} from "./screener-volume-filter.js?v=2018f0b9";

import {
shouldRunScriptBackgroundJobs,
isAlgoTradingNavEnabled,
FEATURE_NAV_PREF_EVENT
} from "./desktop-feature-nav-prefs.js?v=0fd2425e";

/** @type {typeof import("./algo-trading/terminal-early-t3-list.js")|null} */
import {
loadSymbol as loadSymbolMoved,
maybeLoadOlderTerminalHistory as maybeLoadOlderTerminalHistoryMoved,
loadVisibleTerminalHistory as loadVisibleTerminalHistoryMoved,
applyMergedTerminalCandles as applyMergedTerminalCandlesMoved,
settleTerminalHistoryAfterPaint as settleTerminalHistoryAfterPaintMoved,
bindTerminalHistoryLazyLoad as bindTerminalHistoryLazyLoadMoved
} from "./terminal/terminal-history.js?v=bef01a3b";
import {
allCoinsDrawTools as allCoinsDrawToolsMoved,
scheduleCoinsDrawRedraw as scheduleCoinsDrawRedrawMoved,
coinsDrawOnSymbolChange as coinsDrawOnSymbolChangeMoved,
coinsDrawHasActiveInteraction as coinsDrawHasActiveInteractionMoved,
unbindTerminalHistoryLazyLoad as unbindTerminalHistoryLazyLoadMoved,
applyCoinsChartInversion as applyCoinsChartInversionMoved,
persistCoinsChartInversion as persistCoinsChartInversionMoved,
toggleCoinsChartInversion as toggleCoinsChartInversionMoved,
applyCoinsRsiInversion as applyCoinsRsiInversionMoved,
persistCoinsRsiInversion as persistCoinsRsiInversionMoved,
toggleCoinsRsiInversion as toggleCoinsRsiInversionMoved,
applyCoinsChartPriceScaleMode as applyCoinsChartPriceScaleModeMoved,
persistCoinsChartPriceScaleMode as persistCoinsChartPriceScaleModeMoved,
setCoinsChartPriceScaleMode as setCoinsChartPriceScaleModeMoved,
isTabletCrosshairProbeLocked as isTabletCrosshairProbeLockedMoved,
resetCoinsChartPriceScale as resetCoinsChartPriceScaleMoved,
syncRsiHudPeriod as syncRsiHudPeriodMoved,
syncRsiLevelDom as syncRsiLevelDomMoved,
onRsiSettingsChange as onRsiSettingsChangeMoved,
rsiCrosshairUnix as rsiCrosshairUnixMoved,
formatRsiHud as formatRsiHudMoved,
rsiLookupAtOrBefore as rsiLookupAtOrBeforeMoved,
setRsiHudValue as setRsiHudValueMoved,
syncCoinsFutureTimeAnchorSeries as syncCoinsFutureTimeAnchorSeriesMoved,
buildRsiDisplayPoints as buildRsiDisplayPointsMoved,
setRsiPaneActive as setRsiPaneActiveMoved,
loadRsiHtfHistory as loadRsiHtfHistoryMoved,
symbolHasMacdAlerts as symbolHasMacdAlertsMoved,
publishMacdAlertValue as publishMacdAlertValueMoved,
symbolHasRsiAlerts as symbolHasRsiAlertsMoved,
publishRsiAlertValue as publishRsiAlertValueMoved,
rebuildRsiFromCandles as rebuildRsiFromCandlesMoved,
markTerminalRsiPending as markTerminalRsiPendingMoved,
noteTerminalRsiViewportReady as noteTerminalRsiViewportReadyMoved,
revealTerminalRsiPane as revealTerminalRsiPaneMoved,
layoutRsiBand as layoutRsiBandMoved,
candleCloseAtOrBefore as candleCloseAtOrBeforeMoved,
updateRsiHudFromCrosshairTime as updateRsiHudFromCrosshairTimeMoved,
extraIndicatorCrosshairPanes as extraIndicatorCrosshairPanesMoved,
overlayStyleBarDelegateIfNeeded as overlayStyleBarDelegateIfNeededMoved,
mountSharedDrawSelectionDismiss as mountSharedDrawSelectionDismissMoved,
isVisibleDrawWrap as isVisibleDrawWrapMoved,
resolveCoinsDrawPaneFromPointer as resolveCoinsDrawPaneFromPointerMoved,
mountTerminalSharedDrawUndoKeyboard as mountTerminalSharedDrawUndoKeyboardMoved,
drawToolsForPane as drawToolsForPaneMoved,
setActiveDrawPane as setActiveDrawPaneMoved,
getRsiCandlesForDraw as getRsiCandlesForDrawMoved,
initSymbols as initSymbolsMoved,
applyInstrumentLists as applyInstrumentListsMoved,
isSelectableCoinsMarket as isSelectableCoinsMarketMoved,
coinsMarketHasSymbols as coinsMarketHasSymbolsMoved,
switchCoinsMarket as switchCoinsMarketMoved,
restoreSymbolsFromStaleCache as restoreSymbolsFromStaleCacheMoved,
reloadTerminalBybitData as reloadTerminalBybitDataMoved,
normalizeChartEventSymbol as normalizeChartEventSymbolMoved,
dispatchChartSwitchStart as dispatchChartSwitchStartMoved,
dispatchChartSwitchCandlesApply as dispatchChartSwitchCandlesApplyMoved,
dispatchChartCandlesLoaded as dispatchChartCandlesLoadedMoved,
scheduleChartLayoutSettled as scheduleChartLayoutSettledMoved,
setCoinsChartStatus as setCoinsChartStatusMoved,
formatTurnover24Label as formatTurnover24LabelMoved,
syncCoinsChartTurnover24 as syncCoinsChartTurnover24Moved,
rememberTerminalHistory as rememberTerminalHistoryMoved,
refreshTerminalHistoryTail as refreshTerminalHistoryTailMoved,
wireCoinsLinkedDrawPanRedraw as wireCoinsLinkedDrawPanRedrawMoved,
syncLinkedChartsLayout as syncLinkedChartsLayoutMoved,
applyCoinsChartDisplayStyle as applyCoinsChartDisplayStyleMoved,
startPriceHud as startPriceHudMoved,
setCoinsTimeframe as setCoinsTimeframeMoved,
bindCoinsTfHotkeys as bindCoinsTfHotkeysMoved,
bindCoinsPositionDrawHotkeys as bindCoinsPositionDrawHotkeysMoved,
closeAllCoinFlagMenus as closeAllCoinFlagMenusMoved,
applyCoinFavoriteGroup as applyCoinFavoriteGroupMoved,
updateCoinFlagButton as updateCoinFlagButtonMoved,
getCoinsChartHeaderFlagBtn as getCoinsChartHeaderFlagBtnMoved,
updateCoinsChartHeaderFlag as updateCoinsChartHeaderFlagMoved,
mountCoinsChartHeaderFlag as mountCoinsChartHeaderFlagMoved,
syncFavoriteButtonsFromStorage as syncFavoriteButtonsFromStorageMoved,
syncCoinVolumeFilterInput as syncCoinVolumeFilterInputMoved,
commitCoinVolumeFilterFromInput as commitCoinVolumeFilterFromInputMoved,
mountCoinVolumeFilter as mountCoinVolumeFilterMoved,
shouldIgnoreListKeyNav as shouldIgnoreListKeyNavMoved,
navigateCoinsList as navigateCoinsListMoved,
syncCoinsTabletListNav as syncCoinsTabletListNavMoved,
formatCoinsSymbolLabel as formatCoinsSymbolLabelMoved,
syncCoinsPageTitle as syncCoinsPageTitleMoved,
setCoinsChartSymbol as setCoinsChartSymbolMoved,
syncCoinsSymbolLabel as syncCoinsSymbolLabelMoved,
applyUrlTimeframe as applyUrlTimeframeMoved,
syncCoinsMarketFilterOptions as syncCoinsMarketFilterOptionsMoved,
handleExchangeChanged as handleExchangeChangedMoved,
refreshCoinsMarketUi as refreshCoinsMarketUiMoved,
syncTerminalAlgoEarlyT3List as syncTerminalAlgoEarlyT3ListMoved
} from "./terminal/terminal-coins-page.js?v=e616f09e";
let terminalAlgoEarlyT3ListMod =
null;

let currentDataset = "all";
let currentTF = "60";
let currentSymbol = "BTCUSDT";
let isCoinsChartInverted =
false;
let isCoinsRsiInverted =
false;
let coinsPriceScaleMode =
normalizeChartPriceScaleMode(
readCoinsPrefs().priceScaleMode
);
let drawingTools =
null;
let rsiDrawingTools =
null;
let macdDrawingTools =
null;
let aoDrawingTools =
null;
let disposeMacdAlertUi =
null;
let activeDrawPane =
"chart";

function terminalPageHost(){
if(!terminalPageHost.current){
terminalPageHost.current = {
get COINS_POSITION_DRAW_HOTKEYS(){ return COINS_POSITION_DRAW_HOTKEYS; },
get COINS_TF_HOTKEYS(){ return COINS_TF_HOTKEYS; },
get COINS_TF_VALUES(){ return COINS_TF_VALUES; },
get TERMINAL_VISIBLE_BARS(){ return TERMINAL_VISIBLE_BARS; },
get activeDrawPane(){ return activeDrawPane; },
set activeDrawPane(value){ activeDrawPane = value; },
get allBybitSymbols(){ return allBybitSymbols; },
get allListings(){ return allListings; },
get appendFutureWhitespaceBars(){ return appendFutureWhitespaceBars; },
get applyChartPriceFormat(){ return applyChartPriceFormat; },
get applyChartPriceScaleMode(){ return applyChartPriceScaleMode; },
get applyCoinsListRefreshInterval(){ return applyCoinsListRefreshInterval; },
get applyMergedTerminalCandles(){ return applyMergedTerminalCandles; },
get applyRsiFixedPriceScale(){ return applyRsiFixedPriceScale; },
get applyRsiSeriesColorMode(){ return applyRsiSeriesColorMode; },
get applySortForCurrentMarket(){ return applySortForCurrentMarket; },
get buildChartRsiPoints(){ return buildChartRsiPoints; },
get buildMarketLists(){ return buildMarketLists; },
get candleSeries(){ return candleSeries; },
get candles(){ return candles; },
get chart(){ return chart; },
get chartIndicators(){ return chartIndicators; },
get chartWrapEl(){ return chartWrapEl; },
get coinElements(){ return coinElements; },
get coinVolumeFilterMounted(){ return coinVolumeFilterMounted; },
set coinVolumeFilterMounted(value){ coinVolumeFilterMounted = value; },
get coinsFutureTimeAnchorSeries(){ return coinsFutureTimeAnchorSeries; },
get coinsPriceScaleMode(){ return coinsPriceScaleMode; },
set coinsPriceScaleMode(value){ coinsPriceScaleMode = value; },
get coinsState(){ return coinsState; },
get coinsTabletCtrl(){ return coinsTabletCtrl; },
get computeChartFutureMarginBars(){ return computeChartFutureMarginBars; },
get currentDataset(){ return currentDataset; },
set currentDataset(value){ currentDataset = value; },
get currentSymbol(){ return currentSymbol; },
set currentSymbol(value){ currentSymbol = value; },
get currentTF(){ return currentTF; },
set currentTF(value){ currentTF = value; },
get disconnectKlineStream(){ return disconnectKlineStream; },
get displaySymbol(){ return displaySymbol; },
set displaySymbol(value){ displaySymbol = value; },
get drawingTools(){ return drawingTools; },
get ensureActiveCoinVisible(){ return ensureActiveCoinVisible; },
get favorites(){ return favorites; },
set favorites(value){ favorites = value; },
get flagSortActive(){ return flagSortActive; },
get formatExchangeDisplayLabel(){ return formatExchangeDisplayLabel; },
get generateMarketData(){ return generateMarketData; },
get getActiveAlerts(){ return getActiveAlerts; },
get getActiveCoinsMarkets(){ return getActiveCoinsMarkets; },
get getActiveExchangeId(){ return getActiveExchangeId; },
get getActiveExchangeMarkets(){ return getActiveExchangeMarkets; },
get getCurrentSymbols(){ return getCurrentSymbols; },
get getExtraCoinMarkets(){ return getExtraCoinMarkets; },
get getFavoriteGroup(){ return getFavoriteGroup; },
get getTerminalHistoryDepth(){ return getTerminalHistoryDepth; },
get getVisibleSymbolList(){ return getVisibleSymbolList; },
get hasUrlSymbol(){ return hasUrlSymbol; },
set hasUrlSymbol(value){ hasUrlSymbol = value; },
get highlightActiveSymbol(){ return highlightActiveSymbol; },
get historyExhausted(){ return historyExhausted; },
get historyRangeUnsub(){ return historyRangeUnsub; },
set historyRangeUnsub(value){ historyRangeUnsub = value; },
get isActiveRealtimeMarketDataset(){ return isActiveRealtimeMarketDataset; },
get isAlgoTradingNavEnabled(){ return isAlgoTradingNavEnabled; },
get isCoinsChartInverted(){ return isCoinsChartInverted; },
set isCoinsChartInverted(value){ isCoinsChartInverted = value; },
get isCoinsRsiInverted(){ return isCoinsRsiInverted; },
set isCoinsRsiInverted(value){ isCoinsRsiInverted = value; },
get isExtraCoinMarket(){ return isExtraCoinMarket; },
get isMacdAlert(){ return isMacdAlert; },
get isRsiAlert(){ return isRsiAlert; },
get isTabletChartViewport(){ return isTabletChartViewport; },
get isTerminalPage(){ return isTerminalPage; },
get loadFavoritesGroups(){ return loadFavoritesGroups; },
get loadMarketHistory(){ return loadMarketHistory; },
get loadMarketSymbols(){ return loadMarketSymbols; },
get loadSymbol(){ return loadSymbol; },
get lwPriceScaleModeId(){ return lwPriceScaleModeId; },
get macdDrawingTools(){ return macdDrawingTools; },
get macdSetDrawTool(){ return macdSetDrawTool; },
get macdWrapEl(){ return macdWrapEl; },
get aoDrawingTools(){ return aoDrawingTools; },
get aoSetDrawTool(){ return aoSetDrawTool; },
get aoWrapEl(){ return aoWrapEl; },
get mainSetDrawTool(){ return mainSetDrawTool; },
get marketMap(){ return marketMap; },
get mergeCandleRows(){ return mergeCandleRows; },
get mountChartPriceHud(){ return mountChartPriceHud; },
get mountMinVolumeFilterInput(){ return mountMinVolumeFilterInput; },
get normalizeChartPriceScaleMode(){ return normalizeChartPriceScaleMode; },
get normalizeMinVolume(){ return normalizeMinVolume; },
get normalizeRsiPaneSettings(){ return normalizeRsiPaneSettings; },
get onMacdSeriesUpdate(){ return onMacdSeriesUpdate; },
get onRsiSeriesUpdate(){ return onRsiSeriesUpdate; },
get openChromeSurface(){ return openChromeSurface; },
get parseMinVolumeFilter(){ return parseMinVolumeFilter; },
get peekMarketSymbolsCache(){ return peekMarketSymbolsCache; },
get persistCoinsPrefs(){ return persistCoinsPrefs; },
get persistFavoritesToCloud(){ return persistFavoritesToCloud; },
get placeCoinsTabletListNav(){ return placeCoinsTabletListNav; },
get priceHudCtrl(){ return priceHudCtrl; },
set priceHudCtrl(value){ priceHudCtrl = value; },
get priceScaleTouchHooks(){ return priceScaleTouchHooks; },
get primeTickerSnapshots(){ return primeTickerSnapshots; },
get pulsePriceScaleAutoscale(){ return pulsePriceScaleAutoscale; },
get putHistoryCache(){ return putHistoryCache; },
get readCoinsPrefs(){ return readCoinsPrefs; },
get renderList(){ return renderList; },
get resizeCharts(){ return resizeCharts; },
get resolveInitialSymbolAndTf(){ return resolveInitialSymbolAndTf; },
get resolveSymbolForExchange(){ return resolveSymbolForExchange; },
get rsiChart(){ return rsiChart; },
get rsiDrawingTools(){ return rsiDrawingTools; },
get rsiHudPeriodEl(){ return rsiHudPeriodEl; },
get rsiHudValue(){ return rsiHudValue; },
get rsiPaneActive(){ return rsiPaneActive; },
set rsiPaneActive(value){ rsiPaneActive = value; },
get rsiPaneSettings(){ return rsiPaneSettings; },
set rsiPaneSettings(value){ rsiPaneSettings = value; },
get rsiPointsCache(){ return rsiPointsCache; },
set rsiPointsCache(value){ rsiPointsCache = value; },
get rsiRebuildSeq(){ return rsiRebuildSeq; },
set rsiRebuildSeq(value){ rsiRebuildSeq = value; },
get rsiSeries(){ return rsiSeries; },
get rsiSetDrawTool(){ return rsiSetDrawTool; },
get rsiWrapEl(){ return rsiWrapEl; },
get saveChartDisplayStyle(){ return saveChartDisplayStyle; },
get saveFavoritesGroups(){ return saveFavoritesGroups; },
get saveLastViewForExchange(){ return saveLastViewForExchange; },
get searchQuery(){ return searchQuery; },
set searchQuery(value){ searchQuery = value; },
get seedWatchlistTfOnBlueFlag(){ return seedWatchlistTfOnBlueFlag; },
get setChartLayoutReady(){ return setChartLayoutReady; },
get setFavoriteGroup(){ return setFavoriteGroup; },
get sharedDrawUndo(){ return sharedDrawUndo; },
get shouldIgnoreTypingHotkey(){ return shouldIgnoreTypingHotkey; },
get startTickerStream(){ return startTickerStream; },
get stopTickerStream(){ return stopTickerStream; },
get symbolLoadSeq(){ return symbolLoadSeq; },
get syncCoinListFreezeFromFlagMenus(){ return syncCoinListFreezeFromFlagMenus; },
get syncLinkedChartTimescales(){ return syncLinkedChartTimescales; },
get syncMinVolumeFilterInput(){ return syncMinVolumeFilterInput; },
get syncPrimaryTfToLayout(){ return syncPrimaryTfToLayout; },
get tabletPriceScaleCtrl(){ return tabletPriceScaleCtrl; },
get terminalAlgoEarlyT3ListMod(){ return terminalAlgoEarlyT3ListMod; },
set terminalAlgoEarlyT3ListMod(value){ terminalAlgoEarlyT3ListMod = value; },
get terminalBybitReloading(){ return terminalBybitReloading; },
set terminalBybitReloading(value){ terminalBybitReloading = value; },
get terminalHistoryInitialRequests(){ return terminalHistoryInitialRequests; },
get terminalSharedDrawUndoMounted(){ return terminalSharedDrawUndoMounted; },
set terminalSharedDrawUndoMounted(value){ terminalSharedDrawUndoMounted = value; },
get terminalVisibleBars(){ return terminalVisibleBars; },
get tfPeriodSec(){ return tfPeriodSec; },
get updateRsiBandLayout(){ return updateRsiBandLayout; },
get updateRsiLevelLinesLayout(){ return updateRsiLevelLinesLayout; },
get writeCoinsPrefs(){ return writeCoinsPrefs; }
};
}
return terminalPageHost.current;
}

function allCoinsDrawTools(){
return allCoinsDrawToolsMoved(
terminalPageHost(),
...arguments
);
}

function scheduleCoinsDrawRedraw(){
return scheduleCoinsDrawRedrawMoved(
terminalPageHost(),
...arguments
);
}

function coinsDrawOnSymbolChange(opts){
return coinsDrawOnSymbolChangeMoved(
terminalPageHost(),
...arguments
);
}

function coinsDrawHasActiveInteraction(){
return coinsDrawHasActiveInteractionMoved(
terminalPageHost(),
...arguments
);
}
const sharedDrawUndo =
createSharedDrawUndoStack();
let terminalSharedDrawUndoMounted =
false;
let chartIndicators =
null;
let terminalMultiChartApi =
null;

/** Label in #current-symbol (updated on loadSymbol / exchange switch). */
let displaySymbol =
"";

let candles = [];
let symbolLoadSeq = 0;
let historyExhausted =
false;
let historyLoadingOlder =
false;
let historyRangeUnsub =
null;
const viewportSettleRaf =
{ value: 0 };
let chartSwitchVeil =
null;
let marketData = [];


let innerSortMode = "symbol";
let sortAsc = true;
let flagSortActive = false;
let flagSortAsc = true;

let searchQuery = "";
let hasUrlSymbol = false;
let urlExchangeId = "";

let favorites =
loadFavoritesGroups();

let allListings = [];
let allBybitSymbols = [];
let usdcListings = [];
let indicesListings = [];
let newListings = [];
let innovationListings = [];
let stockListings = [];
let shareListings = [];
let etfListings = [];
let commodityListings = [];
let forexListings = [];
let currencyListings = [];

let chart = null;
let candleSeries = null;
let rsiChart = null;

registerCoinsState({

get currentDataset(){
return currentDataset;
},
set currentDataset(v){
currentDataset = v;
},

get currentTF(){
return currentTF;
},
set currentTF(v){
currentTF = v;
},

get currentSymbol(){
return currentSymbol;
},
set currentSymbol(v){
currentSymbol = v;
},

get isCoinsChartInverted(){
return isCoinsChartInverted;
},
set isCoinsChartInverted(v){
isCoinsChartInverted = v;
},

get isCoinsRsiInverted(){
return isCoinsRsiInverted;
},
set isCoinsRsiInverted(v){
isCoinsRsiInverted = v;
},

get coinsPriceScaleMode(){
return coinsPriceScaleMode;
},
set coinsPriceScaleMode(v){
coinsPriceScaleMode =
normalizeChartPriceScaleMode(
v
);
},

get displaySymbol(){
return displaySymbol;
},
set displaySymbol(v){
displaySymbol = v;
},

get candles(){
return candles;
},
set candles(v){
candles = v;
},

get symbolLoadSeq(){
return symbolLoadSeq;
},
set symbolLoadSeq(v){
symbolLoadSeq = v;
},

get marketData(){
return marketData;
},
set marketData(v){
marketData = v;
},

get innerSortMode(){
return innerSortMode;
},
set innerSortMode(v){
innerSortMode = v;
},

get sortAsc(){
return sortAsc;
},
set sortAsc(v){
sortAsc = v;
},

get flagSortActive(){
return flagSortActive;
},
set flagSortActive(v){
flagSortActive = v;
},

get flagSortAsc(){
return flagSortAsc;
},
set flagSortAsc(v){
flagSortAsc = v;
},

get searchQuery(){
return searchQuery;
},
set searchQuery(v){
searchQuery = v;
},

get hasUrlSymbol(){
return hasUrlSymbol;
},
set hasUrlSymbol(v){
hasUrlSymbol = v;
},

get urlExchangeId(){
return urlExchangeId;
},
set urlExchangeId(v){
urlExchangeId =
String(
v ||
""
);
},

get favorites(){
return favorites;
},
set favorites(v){
favorites = v;
},

get allListings(){
return allListings;
},
set allListings(v){
allListings = v;
},

get allBybitSymbols(){
return allBybitSymbols;
},
set allBybitSymbols(v){
allBybitSymbols = v;
},

get usdcListings(){
return usdcListings;
},
set usdcListings(v){
usdcListings = v;
},

get indicesListings(){
return indicesListings;
},
set indicesListings(v){
indicesListings = v;
},

get newListings(){
return newListings;
},
set newListings(v){
newListings = v;
},

get innovationListings(){
return innovationListings;
},
set innovationListings(v){
innovationListings = v;
},

get stockListings(){
return stockListings;
},
set stockListings(v){
stockListings = v;
},

get shareListings(){
return shareListings;
},
set shareListings(v){
shareListings = v;
},

get etfListings(){
return etfListings;
},
set etfListings(v){
etfListings = v;
},

get commodityListings(){
return commodityListings;
},
set commodityListings(v){
commodityListings = v;
},

get forexListings(){
return forexListings;
},
set forexListings(v){
forexListings = v;
},

get currencyListings(){
return currencyListings;
},
set currencyListings(v){
currencyListings = v;
},

get candleSeries(){
return candleSeries;
},
set candleSeries(v){
candleSeries = v;
},

get chart(){
return chart;
},
set chart(v){
chart = v;
},

get rsiChart(){
return rsiChart;
},
set rsiChart(v){
rsiChart = v;
},

get drawingTools(){
return drawingTools;
},
set drawingTools(v){
drawingTools = v;
}

});




/* =========================================================
   SYMBOLS
========================================================= */


/* =========================================================
   CHARTS
========================================================= */

const mainChart =
createCandlestickChart(
document.getElementById("chart"),
{
priceScaleMode:
normalizeChartPriceScaleMode(
readCoinsPrefs().priceScaleMode
)
}
);

chart =
mainChart.chart;

candleSeries =
createPriceSeriesHost(
chart,
mainChart.series,
loadChartDisplayStyle()
);

function unbindTerminalHistoryLazyLoad(){
return unbindTerminalHistoryLazyLoadMoved(
terminalPageHost(),
...arguments
);
}

function terminalHistoryHost(){
if(!terminalHistoryHost.current){
terminalHistoryHost.current = {
get TERMINAL_HISTORY_INITIAL_BARS(){ return TERMINAL_HISTORY_INITIAL_BARS; },
get TERMINAL_HISTORY_LAZY_BATCH_BARS(){ return TERMINAL_HISTORY_LAZY_BATCH_BARS; },
get TERMINAL_VISIBLE_BARS(){ return TERMINAL_VISIBLE_BARS; },
get applyChartPriceFormat(){ return applyChartPriceFormat; },
get applyDefaultZoom(){ return applyDefaultZoom; },
get buildChartDisplayCandles(){ return buildChartDisplayCandles; },
get candleSeries(){ return candleSeries; },
get candles(){ return candles; },
set candles(value){ candles = value; },
get chart(){ return chart; },
get chartCrosshairLink(){ return chartCrosshairLink; },
get chartIndicators(){ return chartIndicators; },
get chartSwitchVeil(){ return chartSwitchVeil; },
get clearBybitNetworkIssue(){ return clearBybitNetworkIssue; },
get coinsDrawOnSymbolChange(){ return coinsDrawOnSymbolChange; },
get coinsState(){ return coinsState; },
get currentDataset(){ return currentDataset; },
get currentSymbol(){ return currentSymbol; },
set currentSymbol(value){ currentSymbol = value; },
get currentTF(){ return currentTF; },
get disconnectKlineStream(){ return disconnectKlineStream; },
get dispatchChartCandlesLoaded(){ return dispatchChartCandlesLoaded; },
get dispatchChartSwitchCandlesApply(){ return dispatchChartSwitchCandlesApply; },
get dispatchChartSwitchStart(){ return dispatchChartSwitchStart; },
get formatCoinsSymbolLabel(){ return formatCoinsSymbolLabel; },
get getActiveExchangeDefinition(){ return getActiveExchangeDefinition; },
get getActiveExchangeId(){ return getActiveExchangeId; },
get getTerminalHistoryDepth(){ return getTerminalHistoryDepth; },
get highlightActiveSymbol(){ return highlightActiveSymbol; },
get historyExhausted(){ return historyExhausted; },
set historyExhausted(value){ historyExhausted = value; },
get historyLoadingOlder(){ return historyLoadingOlder; },
set historyLoadingOlder(value){ historyLoadingOlder = value; },
get historyRangeUnsub(){ return historyRangeUnsub; },
set historyRangeUnsub(value){ historyRangeUnsub = value; },
get isActiveRealtimeMarketDataset(){ return isActiveRealtimeMarketDataset; },
get isSlowHistoryLink(){ return isSlowHistoryLink; },
get isTradePage(){ return isTradePage; },
get loadMarketHistory(){ return loadMarketHistory; },
get logicalIndexShift(){ return logicalIndexShift; },
get mergeCandleRows(){ return mergeCandleRows; },
get peekHistoryCache(){ return peekHistoryCache; },
get persistCoinsPrefs(){ return persistCoinsPrefs; },
get putHistoryCache(){ return putHistoryCache; },
get rebuildRsiFromCandles(){ return rebuildRsiFromCandles; },
get markTerminalRsiPending(){ return markTerminalRsiPendingMoved; },
get noteTerminalRsiViewportReady(){ return noteTerminalRsiViewportReadyMoved; },
get revealTerminalRsiPane(){ return revealTerminalRsiPaneMoved; },
get refreshCoinsChartBarSpacing(){ return refreshCoinsChartBarSpacing; },
get refreshTerminalHistoryTail(){ return refreshTerminalHistoryTail; },
get rememberTerminalHistory(){ return rememberTerminalHistory; },
get replaceCoinsChartCandles(){ return replaceCoinsChartCandles; },
get resetCoinsChartPriceScale(){ return resetCoinsChartPriceScale; },
get rsiChart(){ return rsiChart; },
get scheduleChartLayoutSettled(){ return scheduleChartLayoutSettled; },
get scheduleCoinsDrawRedraw(){ return scheduleCoinsDrawRedraw; },
get setChartLayoutReady(){ return setChartLayoutReady; },
get setCoinsChartStatus(){ return setCoinsChartStatus; },
get setCoinsChartSymbol(){ return setCoinsChartSymbol; },
get settleCoinsChartViewport(){ return settleCoinsChartViewport; },
get slowHistoryPageLimit(){ return slowHistoryPageLimit; },
get startPriceHud(){ return startPriceHud; },
get startRealtime(){ return startRealtime; },
get stopLivePriceFallbacks(){ return stopLivePriceFallbacks; },
get symbolLoadSeq(){ return symbolLoadSeq; },
set symbolLoadSeq(value){ symbolLoadSeq = value; },
get syncBackgroundAlertStreams(){ return syncBackgroundAlertStreams; },
get syncCoinsChartLinkedViewports(){ return syncCoinsChartLinkedViewports; },
get syncCoinsChartTurnover24(){ return syncCoinsChartTurnover24; },
get terminalHistoryInitialRequests(){ return terminalHistoryInitialRequests; },
get terminalMultiChartApi(){ return terminalMultiChartApi; },
get unbindTerminalHistoryLazyLoad(){ return unbindTerminalHistoryLazyLoad; },
get viewportSettleRaf(){ return viewportSettleRaf; }
};
}
return terminalHistoryHost.current;
}

function bindTerminalHistoryLazyLoad(){
return bindTerminalHistoryLazyLoadMoved(
terminalHistoryHost(),
...arguments
);
}

async function maybeLoadOlderTerminalHistory(){
return maybeLoadOlderTerminalHistoryMoved(
terminalHistoryHost(),
...arguments
);
}

bindTerminalHistoryLazyLoad();

window.addEventListener(
TERMINAL_HISTORY_DEPTH_EVENT,
()=>{

if(
candles.length <
getTerminalHistoryDepth()
){
historyExhausted =
false;
}

}
);

const chartWrapEl =
document.getElementById(
"chart-wrap"
);

const chartStackPanesEl =
document.getElementById(
"charts-stack-panes"
);

chartSwitchVeil =
createCoinsChartSwitchVeil(
()=>
chartStackPanesEl,
()=>
symbolLoadSeq
);

const chartEl =
document.getElementById(
"chart"
);

const rsiChartEl =
document.getElementById(
"rsi-chart"
);

const chartTouchLayerEl =
document.getElementById(
"tablet-probe-touch-layer"
);

function applyCoinsChartInversion(inverted){
return applyCoinsChartInversionMoved(
terminalPageHost(),
...arguments
);
}

function persistCoinsChartInversion(){
return persistCoinsChartInversionMoved(
terminalPageHost(),
...arguments
);
}

function toggleCoinsChartInversion(){
return toggleCoinsChartInversionMoved(
terminalPageHost(),
...arguments
);
}

function applyCoinsRsiInversion(inverted){
return applyCoinsRsiInversionMoved(
terminalPageHost(),
...arguments
);
}

function persistCoinsRsiInversion(){
return persistCoinsRsiInversionMoved(
terminalPageHost(),
...arguments
);
}

function toggleCoinsRsiInversion(){
return toggleCoinsRsiInversionMoved(
terminalPageHost(),
...arguments
);
}

function applyCoinsChartPriceScaleMode(mode,
opts =
{}){
return applyCoinsChartPriceScaleModeMoved(
terminalPageHost(),
...arguments
);
}

function persistCoinsChartPriceScaleMode(){
return persistCoinsChartPriceScaleModeMoved(
terminalPageHost(),
...arguments
);
}

function setCoinsChartPriceScaleMode(mode){
return setCoinsChartPriceScaleModeMoved(
terminalPageHost(),
...arguments
);
}


markTabletChartBody();

let unmountCoinsScaleInvertMenu =
()=>{};

if(
isTerminalPage
){
applyCoinsChartInversion(
readCoinsPrefs().invertChart === true
);
applyCoinsChartPriceScaleMode(
readCoinsPrefs().priceScaleMode,
{
recalc:
false
}
);
unmountCoinsScaleInvertMenu =
mountCoinsScaleInvertMenu({
get chart(){ return chart; },
get chartEl(){ return chartEl; },
get chartWrapEl(){ return chartWrapEl; },
get rsiChart(){ return rsiChart; },
get coinsPriceScaleMode(){ return coinsPriceScaleMode; },
get isCoinsChartInverted(){ return isCoinsChartInverted; },
get isCoinsRsiInverted(){ return isCoinsRsiInverted; },
get shouldIgnoreListKeyNav(){ return shouldIgnoreListKeyNav; },
setCoinsChartPriceScaleMode,
toggleCoinsChartInversion,
toggleCoinsRsiInversion
})
}

let priceHudCtrl = {
stop(){},
refresh(){}
};

let unmountTabletGestures =
()=>{};

let unmountTabletCrosshair =
()=>{};

/** iPad: true пока удержание probe (блокирует sync RSI pan) */
function isTabletCrosshairProbeLocked(){
return isTabletCrosshairProbeLockedMoved(
terminalPageHost(),
...arguments
);
}

let abortTabletPan =
()=>{};

let cancelTabletPanGesture =
()=>{};

let coinsTabletCtrl =
null;

/* =========================================================
   CHART INIT (price scale, RSI)
========================================================= */

const priceScaleTouchHooks = {
getFallbackPriceRange(){
return getVisibleCandlesPriceRange(
chart,
candleSeries
);
},
onInteraction(){
priceHudCtrl.refresh?.();
},
onScaleFrame(){},
onDragStart(){},
onDragEnd(){},
onReset(){}
};

const rsiPriceScaleTouchHooks = {
fixedAutoscaleRange:{
min:0,
max:100
},
scaleMargins:{
top:0,
bottom:0
},
getFallbackPriceRange(){
return {
min:0,
max:100
};
},
onInteraction(){},
onScaleFrame(){},
onDragStart(){},
onDragEnd(){},
onReset(){}
};

let tabletPriceScaleCtrl =
mountTabletPriceScaleTouch(
chart,
document.getElementById(
"price-scale-touch-strip"
),
chartEl,
candleSeries,
priceScaleTouchHooks
);

function resetCoinsChartPriceScale(){
return resetCoinsChartPriceScaleMoved(
terminalPageHost(),
...arguments
);
}

applyTabletMainChartScroll(
chart
);

const rsi =
createRSIChart(
document.getElementById("rsi-chart")
);

rsiChart =
rsi.chart;

applyCoinsRsiInversion(
readCoinsPrefs().invertRsiChart === true
);

const rsiSeries =
rsi.series;

let coinsFutureTimeAnchorSeries =
rsiChart.addLineSeries({

color:
"rgba(0,0,0,0)",

lineWidth:
1,

lastValueVisible:
false,

priceLineVisible:
false,

crosshairMarkerVisible:
false,

autoscaleInfoProvider:
()=>({

priceRange:{

minValue:
0,

maxValue:
100

}

})

});

applyTabletRsiChartOptions(
rsiChart
);

if(
isTabletChartViewport()
){

mountTabletPriceScaleTouch(
rsiChart,
document.getElementById(
"rsi-scale-touch-strip"
),
rsiChartEl,
rsiSeries,
rsiPriceScaleTouchHooks
);

}

/*
  Кеш точек RSI: пересборка только при данных свечей;
  худ обновляется от курсора (как в TradingView).
*/
let rsiPointsCache =
[];

const rsiHudValue =
document.getElementById(
"rsi-hud-value"
);

const rsiHudPeriodEl =
document.getElementById(
"rsi-hud-period"
);

let rsiPaneSettings =
normalizeRsiPaneSettings(
defaultRsiPaneSettings()
);

function syncRsiHudPeriod(){
return syncRsiHudPeriodMoved(
terminalPageHost(),
...arguments
);
}

function syncRsiLevelDom(){
return syncRsiLevelDomMoved(
terminalPageHost(),
...arguments
);
}

function onRsiSettingsChange(next){
return onRsiSettingsChangeMoved(
terminalPageHost(),
...arguments
);
}

syncRsiHudPeriod();
syncRsiLevelDom();

function rsiCrosshairUnix(t){
return rsiCrosshairUnixMoved(
terminalPageHost(),
...arguments
);
}

function formatRsiHud(v){
return formatRsiHudMoved(
terminalPageHost(),
...arguments
);
}

function rsiLookupAtOrBefore(ts){
return rsiLookupAtOrBeforeMoved(
terminalPageHost(),
...arguments
);
}

function setRsiHudValue(v){
return setRsiHudValueMoved(
terminalPageHost(),
...arguments
);
}

function syncCoinsFutureTimeAnchorSeries(){
return syncCoinsFutureTimeAnchorSeriesMoved(
terminalPageHost(),
...arguments
);
}

function buildRsiDisplayPoints(){
return buildRsiDisplayPointsMoved(
terminalPageHost(),
...arguments
);
}

let rsiPaneActive =
true;

function setRsiPaneActive(active){
return setRsiPaneActiveMoved(
terminalPageHost(),
...arguments
);
}

let rsiRebuildSeq =
0;

function loadRsiHtfHistory(symbol,
tf,
requests){
return loadRsiHtfHistoryMoved(
terminalPageHost(),
...arguments
);
}

function symbolHasMacdAlerts(){
return symbolHasMacdAlertsMoved(
terminalPageHost(),
...arguments
);
}

function publishMacdAlertValue(){
return publishMacdAlertValueMoved(
terminalPageHost(),
...arguments
);
}

function symbolHasRsiAlerts(){
return symbolHasRsiAlertsMoved(
terminalPageHost(),
...arguments
);
}

function publishRsiAlertValue(points){
return publishRsiAlertValueMoved(
terminalPageHost(),
...arguments
);
}

async function rebuildRsiFromCandles(opts =
{}){
return rebuildRsiFromCandlesMoved(
terminalPageHost(),
...arguments
);
}

function layoutRsiBand(){
return layoutRsiBandMoved(
terminalPageHost(),
...arguments
);
}

function candleCloseAtOrBefore(ts){
return candleCloseAtOrBeforeMoved(
terminalPageHost(),
...arguments
);
}

function updateRsiHudFromCrosshairTime(time){
return updateRsiHudFromCrosshairTimeMoved(
terminalPageHost(),
...arguments
);
}

function extraIndicatorCrosshairPanes(){
return extraIndicatorCrosshairPanesMoved(
terminalPageHost(),
...arguments
);
}

const chartCrosshairLink =
linkChartsCrosshair({
mainChart:chart,
linkedChart:rsiChart,
mainSeries:candleSeries,
linkedSeries:rsiSeries,
linkedVertOverlayEl:document.getElementById(
"linked-crosshair-vert"
),
chartWrapEl,
chartEl,
linkedWrapEl:document.getElementById(
"rsi-wrap"
),
linkedChartEl:document.getElementById(
"rsi-chart"
),
crosshairTimeLabelEl:document.getElementById(
"crosshair-time-label"
),
crosshairPriceLabelEl:document.getElementById(
"crosshair-price-label"
),
onLinkedCrosshairTime:updateRsiHudFromCrosshairTime,
onLinkedCrosshairRsiValue:setRsiHudValue,
onLinkedCrosshairClear(){
const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

setRsiHudValue(
last?.value ??
null
);
},
getLinkedValueAtTime(time){
const ts =
rsiCrosshairUnix(time);

if(
ts === null
){
return null;
}

return rsiLookupAtOrBefore(ts);
},
getMainValueAtTime(time){
const ts =
rsiCrosshairUnix(time);

if(
ts === null
){
return null;
}

return candleCloseAtOrBefore(ts);
},
getExtraPanes:
extraIndicatorCrosshairPanes
});

chart.subscribeCrosshairMove(param=>{

if(
isUserCrosshairEvent(param)
){
return;
}

updateRsiHudFromCrosshairTime(param.time);

});

document.body.classList.remove(
"drawings-tablet-test-off"
);

if(
isTerminalMultiChartLayout()
){
document.body.classList.add(
"coins-multi-chart-on",
"coins-drawings-ui-off"
);
}

try{

mountDrawToolbar(
document.getElementById("draw-toolbar"),
{
showDrawingsVisibilityToggle:
true
}
);
mountDrawToolIcons(
document
);
mountTerminalDxBall();
mountTerminalChecklist();

}catch(err){

console.error("Draw toolbar mount failed:", err);

}

let mainSetDrawTool =
null;
let rsiSetDrawTool =
null;
let macdSetDrawTool =
null;
let aoSetDrawTool =
null;
const drawClearAllPeers =
{
call:
null
};

function overlayStyleBarDelegateIfNeeded(){
return overlayStyleBarDelegateIfNeededMoved(
terminalPageHost(),
...arguments
);
}

function mountSharedDrawSelectionDismiss(){
return mountSharedDrawSelectionDismissMoved(
terminalPageHost(),
...arguments
);
}

const rsiWrapEl =
document.getElementById(
"rsi-wrap"
);
const macdWrapEl =
document.getElementById(
"macd-wrap"
);
const aoWrapEl =
document.getElementById(
"ao-wrap"
);

function isVisibleDrawWrap(el){
return isVisibleDrawWrapMoved(
terminalPageHost(),
...arguments
);
}

function resolveCoinsDrawPaneFromPointer(clientY){
return resolveCoinsDrawPaneFromPointerMoved(
terminalPageHost(),
...arguments
);
}

function mountTerminalSharedDrawUndoKeyboard(){
return mountTerminalSharedDrawUndoKeyboardMoved(
terminalPageHost(),
...arguments
);
}

function drawToolsForPane(pane){
return drawToolsForPaneMoved(
terminalPageHost(),
...arguments
);
}

function setActiveDrawPane(pane){
return setActiveDrawPaneMoved(
terminalPageHost(),
...arguments
);
}

const chartsStackEl =
document.getElementById(
"charts-stack"
);

chartsStackEl?.addEventListener(
"pointermove",
e=>{

const pane =
resolveCoinsDrawPaneFromPointer(
e.clientY
);

if(
pane
){
setActiveDrawPane(
pane
);
}

},
true
);

chartWrapEl?.addEventListener(
"pointerenter",
()=>
setActiveDrawPane(
"chart"
),
true
);

rsiWrapEl?.addEventListener(
"pointerenter",
()=>
setActiveDrawPane(
"rsi"
),
true
);

macdWrapEl?.addEventListener(
"pointerenter",
()=>
setActiveDrawPane(
"macd"
),
true
);

aoWrapEl?.addEventListener(
"pointerenter",
()=>
setActiveDrawPane(
"ao"
),
true
);

function getRsiCandlesForDraw(){
return getRsiCandlesForDrawMoved(
terminalPageHost(),
...arguments
);
}


mountChartSnapshot({
getSymbol:()=>
currentSymbol,
getTf:()=>
currentTF,
getExchangeName:()=>
getActiveExchangeDefinition().name
});

registerCoinsChartLayoutContext({
getCandles:()=>
replayVisibleCandles(candles),
chart,
chartEl,
getTf:()=>
currentTF,
getChartIndicators:()=>
chartIndicators,
getRsiChart:()=>
rsiChart,
rsiPaneActive:()=>
rsiPaneActive,
layoutRsiBand,
applyCoinsChartViewport,
refreshCoinsChartBarSpacing,
getDrawingTools:()=>
drawingTools,
getLinkedDrawingTools:()=>
[
rsiDrawingTools,
macdDrawingTools,
aoDrawingTools
].filter(
Boolean
),
viewportSettleRaf
});

if(
isTabletChartViewport()
){

try{
chart.clearCrosshairPosition();
}catch{
/* ignore */
}

}

if(
TABLET_USE_CUSTOM_TOUCH_PAN &&
isTabletChartViewport()
){

void mountCoinsTabletController({
chart,
chartEl,
chartTouchLayerEl,
chartWrapEl,
rsiChart,
candleSeries,
getDrawingTools: ()=> drawingTools,
getTabletPriceScale: ()=> tabletPriceScaleCtrl,
updateRsiHudFromCrosshairTime,
getRsiHudFallbackValue(){
const last =
rsiPointsCache[
rsiPointsCache.length -
1
];

return (
last?.value ??
null
);
},
setRsiHudValue
}).then(
ctrl=>{

coinsTabletCtrl =
ctrl;

abortTabletPan =
ctrl.abortPan;

cancelTabletPanGesture =
ctrl.cancelCurrentGesture;

unmountTabletGestures =
ctrl.dispose;

unmountTabletCrosshair =
ctrl.dispose;

}
).catch(
err=>{
console.warn(
"Coins tablet controller:",
err
);
}
);

}

/* =========================================================
   SYMBOLS
========================================================= */

async function initSymbols(options = {}){
return initSymbolsMoved(
terminalPageHost(),
...arguments
);
}

function applyInstrumentLists(list){
return applyInstrumentListsMoved(
terminalPageHost(),
...arguments
);
}

function isSelectableCoinsMarket(id){
return isSelectableCoinsMarketMoved(
terminalPageHost(),
...arguments
);
}

function coinsMarketHasSymbols(market){
return coinsMarketHasSymbolsMoved(
terminalPageHost(),
...arguments
);
}

async function switchCoinsMarket(nextMarket){
return switchCoinsMarketMoved(
terminalPageHost(),
...arguments
);
}

function restoreSymbolsFromStaleCache(){
return restoreSymbolsFromStaleCacheMoved(
terminalPageHost(),
...arguments
);
}

let terminalBybitReloading = false;

async function reloadTerminalBybitData(){
return reloadTerminalBybitDataMoved(
terminalPageHost(),
...arguments
);
}

window.addEventListener(
"bybit-network-retry",
()=>{

if(
isActiveRealtimeMarketDataset(
currentDataset
)
){
void reloadTerminalBybitData();
}

}
);

window.addEventListener(
"trade-book-open-symbol",
e=>{

const symbol =
String(
e.detail?.symbol ||
""
).trim().toUpperCase();
const tf =
String(
e.detail?.tf ||
""
).trim();

if(
!symbol
){
return;
}

void loadSymbol(
symbol
);

if(
tf &&
COINS_TF_VALUES.has(
tf
)
){
void setCoinsTimeframe(
tf
);
}

}
);

window.addEventListener(
"bybit-symbols-updated",
e=>{

const symbols =
e.detail?.symbols;

if(
!Array.isArray(symbols) ||
!symbols.length
){
return;
}

applyInstrumentLists(
symbols
);

generateMarketData();
renderList();

}
);


function normalizeChartEventSymbol(symbol){
return normalizeChartEventSymbolMoved(
terminalPageHost(),
...arguments
);
}

function dispatchChartSwitchStart(symbol,
loadSeq){
return dispatchChartSwitchStartMoved(
terminalPageHost(),
...arguments
);
}

function dispatchChartSwitchCandlesApply(symbol,
loadSeq){
return dispatchChartSwitchCandlesApplyMoved(
terminalPageHost(),
...arguments
);
}

function dispatchChartCandlesLoaded(symbol,
loadSeq){
return dispatchChartCandlesLoadedMoved(
terminalPageHost(),
...arguments
);
}

function scheduleChartLayoutSettled(callback){
return scheduleChartLayoutSettledMoved(
terminalPageHost(),
...arguments
);
}

/* =========================================================
   LOAD SYMBOL
========================================================= */

function setCoinsChartStatus(text,
visible){
return setCoinsChartStatusMoved(
terminalPageHost(),
...arguments
);
}

function formatTurnover24Label(value){
return formatTurnover24LabelMoved(
terminalPageHost(),
...arguments
);
}

function syncCoinsChartTurnover24(symbol =
currentSymbol){
return syncCoinsChartTurnover24Moved(
terminalPageHost(),
...arguments
);
}

function rememberTerminalHistory(symbol,
tf){
return rememberTerminalHistoryMoved(
terminalPageHost(),
...arguments
);
}

function applyMergedTerminalCandles(merged,
loadSeq){
return applyMergedTerminalCandlesMoved(
terminalHistoryHost(),
...arguments
);
}

async function refreshTerminalHistoryTail(loadSeq){
return refreshTerminalHistoryTailMoved(
terminalPageHost(),
...arguments
);
}

async function settleTerminalHistoryAfterPaint(loadSeq){
return settleTerminalHistoryAfterPaintMoved(
terminalHistoryHost(),
...arguments
);
}

async function loadVisibleTerminalHistory(symbol,
tf,
loadSeq){
return loadVisibleTerminalHistoryMoved(
terminalHistoryHost(),
...arguments
);
}

async function loadSymbol(symbol){
return loadSymbolMoved(
terminalHistoryHost(),
...arguments
);
}

window.addEventListener(
"resize",
scheduleResizeCharts
);

const chartWrapForResize =
document.getElementById("chart-wrap");

if(
chartWrapForResize &&
typeof ResizeObserver !==
"undefined"
){

const chartResizeObserver =
new ResizeObserver(
scheduleResizeCharts
);

chartResizeObserver.observe(chartWrapForResize);

const rsiWrapEl =
document.getElementById("rsi-wrap");

if(rsiWrapEl){
chartResizeObserver.observe(rsiWrapEl);
}

const volumeWrapEl =
document.getElementById("volume-wrap");

if(volumeWrapEl){
chartResizeObserver.observe(volumeWrapEl);
}

const macdWrapForResize =
document.getElementById("macd-wrap");

if(macdWrapForResize){
chartResizeObserver.observe(macdWrapForResize);
}

}

if(
isTerminalPage
){

mountCoinsLayoutResize(
{
onLayoutChange:
scheduleResizeCharts
}
);

}

/* =========================================================
   SYNC
========================================================= */

function wireCoinsLinkedDrawPanRedraw(){
return wireCoinsLinkedDrawPanRedrawMoved(
terminalPageHost(),
...arguments
);
}

function syncLinkedChartsLayout(){
return syncLinkedChartsLayoutMoved(
terminalPageHost(),
...arguments
);
}

linkPairedChartTimeScales(
chart,
rsiChart,
syncLinkedChartsLayout,
{
isLocked:()=>
!rsiPaneActive ||
isTabletCrosshairProbeLocked() ||
!isChartLayoutReady() ||
isCoinsPaneHeightDrag(),
/* RSI setData не должен двигать main — иначе смена ТФ мигает viewport. */
linkedDrivesMain:
false
}
);

let unmountRsiTimeAxisDoubleTap =
()=>{};

if(
rsiChartEl
){

unmountRsiTimeAxisDoubleTap =
mountAxisDoubleTapReset(
rsiChartEl,
()=>{
applyDefaultZoom();
layoutRsiBand();
scheduleCoinsDrawRedraw();
}
);

}

function applyCoinsChartDisplayStyle(style){
return applyCoinsChartDisplayStyleMoved(
terminalPageHost(),
...arguments
);
}

function startPriceHud(){
return startPriceHudMoved(
terminalPageHost(),
...arguments
);
}

/* =========================================================
   TF
========================================================= */

async function setCoinsTimeframe(tf){
return setCoinsTimeframeMoved(
terminalPageHost(),
...arguments
);
}

const COINS_POSITION_DRAW_HOTKEYS =
DRAW_TOOL_HOTKEYS;

function bindCoinsTfHotkeys(){
return bindCoinsTfHotkeysMoved(
terminalPageHost(),
...arguments
);
}

function bindCoinsPositionDrawHotkeys(){
return bindCoinsPositionDrawHotkeysMoved(
terminalPageHost(),
...arguments
);
}

document
.querySelectorAll(".tf-btn")
.forEach(btn=>{

btn.addEventListener(
"mousedown",
e=>{

if(
e.button ===
0
){
e.preventDefault();
}

}
);

btn.addEventListener(
"keydown",
e=>{

if(
e.code ===
"Space" ||
e.code ===
"Enter"
){
e.preventDefault();
}

}
);

btn.onclick = async ()=>{
await setCoinsTimeframe(btn.dataset.tf);
btn.blur();
};

});

bindCoinsTfHotkeys();
bindCoinsPositionDrawHotkeys();

mountChartDisplayStyleUi({
root:
document.getElementById(
"coins-chart-type-bar"
),
getStyle:()=>
candleSeries?.getStyle?.() ||
loadChartDisplayStyle(),
onChange:
applyCoinsChartDisplayStyle
});

/* =========================================================
   FILTER
========================================================= */

const marketFilterEl =
document.getElementById(
"market-filter"
);

marketFilterEl?.addEventListener(
"change",
async e=>{

await switchCoinsMarket(
e.target.value
);
e.target.blur();

}
);

/* =========================================================
   TABLE
========================================================= */


function closeAllCoinFlagMenus(exceptWrap = null){
return closeAllCoinFlagMenusMoved(
terminalPageHost(),
...arguments
);
}

function applyCoinFavoriteGroup(symbol,
group){
return applyCoinFavoriteGroupMoved(
terminalPageHost(),
...arguments
);
}

function updateCoinFlagButton(btn, symbol){
return updateCoinFlagButtonMoved(
terminalPageHost(),
...arguments
);
}

function getCoinsChartHeaderFlagBtn(){
return getCoinsChartHeaderFlagBtnMoved(
terminalPageHost(),
...arguments
);
}

function updateCoinsChartHeaderFlag(symbol){
return updateCoinsChartHeaderFlagMoved(
terminalPageHost(),
...arguments
);
}

function mountCoinsChartHeaderFlag(){
return mountCoinsChartHeaderFlagMoved(
terminalPageHost(),
...arguments
);
}


function syncFavoriteButtonsFromStorage(){
return syncFavoriteButtonsFromStorageMoved(
terminalPageHost(),
...arguments
);
}

onFavoritesRemoteUpdate(()=>{

syncFavoriteButtonsFromStorage();

if(flagSortActive){
renderList();
}

});

window.addEventListener(
"favorites-local-changed",
()=>{
syncFavoriteButtonsFromStorage();
if(flagSortActive){
renderList();
}
}
);


/* =========================================================
   SORT
========================================================= */

document
.getElementById("table-header")
?.addEventListener("click", e=>{

const el =
e.target.closest(".sortable");

if(!el){
return;
}

const mode =
el.dataset.sort;

if(!mode){
return;
}

if(mode === "favorites"){

if(!flagSortActive){

flagSortActive = true;
flagSortAsc = true;

}else{

flagSortAsc = !flagSortAsc;

}

}else{

flagSortActive = false;

if(innerSortMode === mode){

sortAsc = !sortAsc;

}else{

innerSortMode = mode;
sortAsc = false;

}

}

persistCoinsPrefs();

renderList();

});

/* =========================================================
   KEYBOARD NAVIGATION
========================================================= */

const coinSearchEl =
document.getElementById(
"coin-search"
);

if(
coinSearchEl
){

mountQwertyKeyInput(
coinSearchEl,
{
onInput(){
searchQuery =
coinSearchEl.value;
renderList();
}
}
);

}

let coinVolumeFilterMounted =
false;

function syncCoinVolumeFilterInput(){
return syncCoinVolumeFilterInputMoved(
terminalPageHost(),
...arguments
);
}

function commitCoinVolumeFilterFromInput(){
return commitCoinVolumeFilterFromInputMoved(
terminalPageHost(),
...arguments
);
}

function mountCoinVolumeFilter(){
return mountCoinVolumeFilterMoved(
terminalPageHost(),
...arguments
);
}

function shouldIgnoreListKeyNav(e){
return shouldIgnoreListKeyNavMoved(
terminalPageHost(),
...arguments
);
}

async function navigateCoinsList(direction){
return navigateCoinsListMoved(
terminalPageHost(),
...arguments
);
}

document.addEventListener(
"keydown",
async e=>{

if(shouldIgnoreListKeyNav(e)){
return;
}

const goDown =
e.code === "ArrowDown" ||
e.code === "Space" ||
e.key === " ";

const goUp =
e.code === "ArrowUp";

if(!goDown && !goUp){
return;
}

e.preventDefault();
await navigateCoinsList(
goDown ? 1 : -1
);

});

function syncCoinsTabletListNav(){
return syncCoinsTabletListNavMoved(
terminalPageHost(),
...arguments
);
}

window.addEventListener(
"resize",
syncCoinsTabletListNav,
{
passive:true
}
);

window.addEventListener(
"trade-app-ready",
syncCoinsTabletListNav
);

/* =========================================================
   URL PARAMS
========================================================= */


function formatCoinsSymbolLabel(symbol){
return formatCoinsSymbolLabelMoved(
terminalPageHost(),
...arguments
);
}

function syncCoinsPageTitle(){
return syncCoinsPageTitleMoved(
terminalPageHost(),
...arguments
);
}

function setCoinsChartSymbol(symbol){
return setCoinsChartSymbolMoved(
terminalPageHost(),
...arguments
);
}

function syncCoinsSymbolLabel(){
return syncCoinsSymbolLabelMoved(
terminalPageHost(),
...arguments
);
}

function applyUrlTimeframe(){
return applyUrlTimeframeMoved(
terminalPageHost(),
...arguments
);
}

/* =========================================================
   START
========================================================= */

document.addEventListener("click", e=>{

if(
e.target.closest(".coin-flag-wrap")
){
return;
}

closeAllCoinFlagMenus();

});

function syncCoinsMarketFilterOptions(){
return syncCoinsMarketFilterOptionsMoved(
terminalPageHost(),
...arguments
);
}

async function handleExchangeChanged(e){
return handleExchangeChangedMoved(
terminalPageHost(),
...arguments
);
}

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
e=>{
void handleExchangeChanged(
e
);
}
);

window.addEventListener(
"market-symbols-updated",
e=>{

const exchangeId =
String(
e?.detail?.exchangeId ||
""
).trim().toLowerCase();

if(
exchangeId &&
exchangeId !==
getActiveExchangeId()
){
return;
}

const symbols =
e?.detail?.symbols;

if(
!Array.isArray(
symbols
) ||
!symbols.length
){
return;
}

applyInstrumentLists(
symbols
);
generateMarketData();
renderList();

if(
!getCurrentSymbols().includes(
currentSymbol
)
){
resolveSymbolForExchange(
getActiveExchangeId()
);
highlightActiveSymbol();

if(
currentSymbol
){
void loadSymbol(
currentSymbol
);
}

}

}
);

window.addEventListener(
FEATURE_NAV_PREF_EVENT,
e=>{
if(
e?.detail?.feature &&
e.detail.feature !==
"algo-trading"
){
return;
}
void (async ()=>{
const viewingExtra =
isExtraCoinMarket(
currentDataset
);
await syncTerminalAlgoEarlyT3List();
const marketFilter =
document.getElementById(
"market-filter"
);
if(
marketFilter
){
marketFilter.value =
currentDataset;
}
if(
viewingExtra &&
!isExtraCoinMarket(
currentDataset
)
){
await switchCoinsMarket(
"all"
);
}else if(
isExtraCoinMarket(
currentDataset
)
){
generateMarketData();
await primeTickerSnapshots();
renderList();
highlightActiveSymbol();
}
})();
}
);

async function refreshCoinsMarketUi(){
return refreshCoinsMarketUiMoved(
terminalPageHost(),
...arguments
);
}

async function syncTerminalAlgoEarlyT3List(){
return syncTerminalAlgoEarlyT3ListMoved(
terminalPageHost(),
...arguments
);
}

async function init(){

await syncTerminalAlgoEarlyT3List();

const chromeP =
mountTerminalDrawChrome({
get activeDrawPane(){ return activeDrawPane; },
set activeDrawPane(value){ activeDrawPane = value; },
get cancelTabletPanGesture(){ return cancelTabletPanGesture; },
get candleSeries(){ return candleSeries; },
get candles(){ return candles; },
get chart(){ return chart; },
get chartCrosshairLink(){ return chartCrosshairLink; },
get chartEl(){ return chartEl; },
get chartIndicators(){ return chartIndicators; },
set chartIndicators(value){ chartIndicators = value; },
get chartWrapEl(){ return chartWrapEl; },
get chartsStackEl(){ return chartsStackEl; },
get currentSymbol(){ return currentSymbol; },
get currentTF(){ return currentTF; },
get disposeMacdAlertUi(){ return disposeMacdAlertUi; },
set disposeMacdAlertUi(value){ disposeMacdAlertUi = value; },
get drawClearAllPeers(){ return drawClearAllPeers; },
get drawingTools(){ return drawingTools; },
set drawingTools(value){ drawingTools = value; },
get getRsiCandlesForDraw(){ return getRsiCandlesForDraw; },
get layoutRsiBand(){ return layoutRsiBand; },
get macdDrawingTools(){ return macdDrawingTools; },
set macdDrawingTools(value){ macdDrawingTools = value; },
get macdSetDrawTool(){ return macdSetDrawTool; },
set macdSetDrawTool(value){ macdSetDrawTool = value; },
get macdWrapEl(){ return macdWrapEl; },
get aoDrawingTools(){ return aoDrawingTools; },
set aoDrawingTools(value){ aoDrawingTools = value; },
get aoSetDrawTool(){ return aoSetDrawTool; },
set aoSetDrawTool(value){ aoSetDrawTool = value; },
get aoWrapEl(){ return aoWrapEl; },
get mainSetDrawTool(){ return mainSetDrawTool; },
set mainSetDrawTool(value){ mainSetDrawTool = value; },
get mountSharedDrawSelectionDismiss(){ return mountSharedDrawSelectionDismiss; },
get mountTerminalSharedDrawUndoKeyboard(){ return mountTerminalSharedDrawUndoKeyboard; },
get onRsiSettingsChange(){ return onRsiSettingsChange; },
get overlayStyleBarDelegateIfNeeded(){ return overlayStyleBarDelegateIfNeeded; },
get priceHudCtrl(){ return priceHudCtrl; },
get priceScaleTouchHooks(){ return priceScaleTouchHooks; },
get publishMacdAlertValue(){ return publishMacdAlertValue; },
get rsi(){ return rsi; },
get rsiChart(){ return rsiChart; },
get rsiDrawingTools(){ return rsiDrawingTools; },
set rsiDrawingTools(value){ rsiDrawingTools = value; },
get rsiPaneActive(){ return rsiPaneActive; },
get rsiPointsCache(){ return rsiPointsCache; },
get rsiPriceScaleTouchHooks(){ return rsiPriceScaleTouchHooks; },
get rsiSeries(){ return rsiSeries; },
get rsiSetDrawTool(){ return rsiSetDrawTool; },
set rsiSetDrawTool(value){ rsiSetDrawTool = value; },
get rsiWrapEl(){ return rsiWrapEl; },
get setRsiHudValue(){ return setRsiHudValue; },
get setRsiPaneActive(){ return setRsiPaneActive; },
get sharedDrawUndo(){ return sharedDrawUndo; },
get symbolHasMacdAlerts(){ return symbolHasMacdAlerts; },
get updateRsiHudFromCrosshairTime(){ return updateRsiHudFromCrosshairTime; },
get wireCoinsLinkedDrawPanRedraw(){ return wireCoinsLinkedDrawPanRedraw; }
})

void ensureCloudReady().then(()=>{
void drawingTools?.refreshDrawToolsAccessUi?.();
});

applyCoinsPrefs();
mountCoinVolumeFilter();

const urlExchangeAllowed =
await resolveUrlExchangeDeepLink({
silentSwitch:
true
});

if(
!urlExchangeAllowed
){
hasUrlSymbol =
false;
urlExchangeId =
"";
resolveInitialSymbolAndTf();
}else if(
coinsState().diaryTradeDeepLink?.history
){
const lastTf =
readLastViewForExchange(
getActiveExchangeId()
).tf;

if(
lastTf &&
COINS_TF_VALUES.has(
lastTf
)
){
currentTF =
lastTf;

try{
const params =
new URLSearchParams(
window.location.search
);

if(
params.get(
"tf"
) !==
lastTf
){
params.set(
"tf",
lastTf
);
const qs =
params.toString();
history.replaceState(
null,
"",
`${window.location.pathname || "/"}${qs ? `?${qs}` : ""}`
);
}
}catch{
/* ignore */
}
}
}

mountCoinsListRefreshControls();

mountCoinsChartHeaderFlag();

terminalMultiChartApi =
initTerminalMultiChart({
getSymbol:()=>
currentSymbol,
getPrimaryTf:()=>
currentTF,
setPrimaryTf:
setCoinsTimeframe,
scheduleResizeCharts,
setRsiPaneActive,
onMultiChartLayout:()=>{
scheduleResizeCharts();
},
onSingleChartLayout:()=>{
scheduleResizeCharts();
},
mountPicker:
mountTerminalLayoutPicker
});

if(
window.cryptoTerminalDesktop?.isDesktop ||
window.cryptoTerminalDesktop?.webTrading
){
void import(
"./script-terminal-status.js?v=a1fd753e"
).then(
m=>
m.mountScriptTerminalStatus?.()
).catch(
err=>{
console.warn(
"[terminal] script terminal status:",
err
);
}
);
}

if(
shouldRunScriptBackgroundJobs()
){
void import(
"./script-scan-background.js?v=89681682"
).then(
m=>
m.resumeScriptScanBackgroundJob?.()
).catch(
err=>{
console.warn(
"[terminal] script scan background:",
err
);
}
);
}

favorites =
loadFavoritesGroups();

const marketFilter =
document.getElementById("market-filter");

syncCoinsMarketFilterOptions();

if(marketFilter){
marketFilter.value = currentDataset;
}

if(!hasUrlSymbol){
resolveInitialSymbolAndTf();
}else if(
!COINS_TF_VALUES.has(currentTF)
){
currentTF = "60";
}

setCoinsChartSymbol(
currentSymbol || displaySymbol
);

applyUrlTimeframe();

await refreshCoinsMarketUi().catch(
err=>{
console.warn(
"Terminal market ui:",
err
);
}
);

if(
!hasUrlSymbol
){
resolveSymbolForExchange(
getActiveExchangeId()
);
}else if(
currentSymbol &&
!getCurrentSymbols().includes(
currentSymbol
)
){
hasUrlSymbol =
false;
resolveSymbolForExchange(
getActiveExchangeId()
);
}

setCoinsChartSymbol(
currentSymbol || displaySymbol
);

await loadSymbol(
currentSymbol || displaySymbol || "BTCUSDT"
);

await chromeP;

if(
candles.length
){
coinsDrawOnSymbolChange({
skipRedraw:
true
});
chartIndicators?.notifySymbolChange?.();
chartIndicators?.flushIndicatorDataRefreshNow?.();
chartIndicators?.notifyMainChartOverlaysSync?.();
scheduleCoinsDrawRedraw();
}

void drawingTools?.refreshDrawToolsAccessUi?.();

syncCoinsTabletListNav();

mountDesktopOpenChartHandler(
{
loadSymbol,
setTimeframe:
setCoinsTimeframe,
getSymbol:()=>
currentSymbol
}
);

mountTerminalReplay({
getChart:()=>
chart,
getCandles:()=>
candles,
getDrawTool:()=>
drawingTools?.tool,
applySlice(){
candleSeries?.setData(
buildChartDisplayCandles()
);
},
restoreLive(){
candleSeries?.setData(
buildChartDisplayCandles()
);
},
rebuild(){
void rebuildRsiFromCandles();
chartIndicators?.notifyCandlesUpdate?.();
scheduleCoinsDrawRedraw();
}
});

}

function flushCoinsPrefs(){

commitCoinVolumeFilterFromInput();

/* Do not write lastViewByExchange here: on exchange switch the page reloads
 * after activeExchangeId already flipped, while currentSymbol is still the
 * previous exchange ticker — that would poison the destination exchange. */
persistCoinsPrefs({
persistExchangeView:
false
});

}

window.addEventListener(
"alert-streams-sync",
()=>{
syncBackgroundAlertStreams(
currentSymbol,
currentTF
);
}
);

window.addEventListener(
"beforeunload",
flushCoinsPrefs
);

window.addEventListener(
"pagehide",
flushCoinsPrefs
);

document.addEventListener(
"visibilitychange",
()=>{

if(document.visibilityState === "hidden"){
flushCoinsPrefs();
}

}
);

bootstrapCoinsPageState();
syncCoinVolumeFilterInput();

window.__coinsChartDebug =
function(){

const lastIdx =
Math.max(
0,
(candles?.length ||
1) -
1
);

const lastBarX =
chart?.timeScale?.()?.logicalToCoordinate?.(
lastIdx
);

const chartW =
chartEl?.clientWidth ||
0;

const plotW =
chart?.timeScale?.()?.width?.() ||
0;

const rsiPlotW =
rsiChart?.timeScale?.()?.width?.() ||
0;

const rsiLastBarX =
rsiChart?.timeScale?.()?.logicalToCoordinate?.(
lastIdx
);

return {
build:
"20260609-future-timescale-v10",
priceScaleMode:
chart?.priceScale?.(
"right"
)?.options?.()?.mode,
priceScaleInvert:
chart?.priceScale?.(
"right"
)?.options?.()?.invertScale,
candles:
candles?.length ||
0,
mainRange:
chart?.timeScale?.()?.getVisibleLogicalRange?.(),
rsiRange:
rsiChart?.timeScale?.()?.getVisibleLogicalRange?.(),
mainRightOffset:
chart?.timeScale?.()?.options?.()?.rightOffset,
rsiRightOffset:
rsiChart?.timeScale?.()?.options?.()?.rightOffset,
mainBarSpacing:
chart?.timeScale?.()?.options?.()?.barSpacing,
lastBarX,
chartW,
plotW,
mainFutureGapPx:
Number.isFinite(
lastBarX
) &&
Number.isFinite(
plotW
) &&
plotW >
0
? plotW -
lastBarX
: (
Number.isFinite(
lastBarX
) &&
Number.isFinite(
chartW
)
? chartW -
lastBarX
: null
),
rsiFutureGapPx:
Number.isFinite(
rsiLastBarX
) &&
Number.isFinite(
rsiPlotW
)
? rsiPlotW -
rsiLastBarX
: null
};

};

setCoinsTableHooks({
setCoinsChartSymbol,
loadSymbol,
closeAllCoinFlagMenus,
applyCoinFavoriteGroup,
updateCoinFlagButton,
rebuildRsiFromCandles,
onTickerTick(
item
){
if(
!item ||
item.symbol !==
currentSymbol
){
return;
}

syncCoinsChartTurnover24(
item.symbol
);
},
applyChartLiveCandle(
bar
){
if(isTerminalReplayActive()){
return;
}
try{
candleSeries.update(
bar
);
}catch{
runWithPreservedVisibleLogicalRange(
chart,
()=>{

try{
candleSeries.setData(
buildChartDisplayCandles()
);
}catch{
try{
candleSeries.setData(
candles
);
}catch{
/* ignore */
}
}

}
);
}
applyChartPriceFormat(
candleSeries,
bar?.close ??
candles[
candles.length -
1
]?.close ??
1
);
chartIndicators?.notifyMainChartOverlaysSync?.();
}
});

setCoinsChartSymbol(
currentSymbol
);

applyUrlTimeframe();

init();
