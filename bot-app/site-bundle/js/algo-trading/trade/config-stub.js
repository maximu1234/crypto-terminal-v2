/**
 * Algo trade config (isolated; Bybit-only defaults).
 */
export function getTradeConfig(){

return {
id:
"bybit-algo",
positionsSyncIntervalMs:
5000,
skipSyncPositionAfterClose:
false,
skipSyncPositionAfterStopCancel:
false,
skipSyncPositionAfterStopAmend:
false,
verifyEmptyPositionViaList:
false,
streamMissClearsCache:
false,
softKeepCachedOnEmptyGetPosition:
true,
mergePositionStopsFromPrev:
true,
recentlyClosedMs:
5000
};

}

export default getTradeConfig();
