/**
 * Barrel: реализация в js/drawings-cloud/ (фаза 3 refactor).
 * @see docs/REFACTOR_DRAWINGS.md
 */
export {
pauseDrawingsCloudSync,
runCloudOp,
registerDrawingsChartRefresh,
onDrawingsRemoteUpdate,
scheduleDrawingsCloudSync,
scheduleDrawingsCloudPush,
flushDrawingsCloudPush,
stopDrawingsFastPoll,
stopDrawingsCloudSync,
hydrateDrawingsAfterAuth,
initDrawingsCloudSync,
bumpDrawingsPullNow,
setupDrawingsRealtimeForUser,
getDirtyDrawingSymbols,
getDrawingsRestStressUntil,
setDrawingsRestStressUntil,
getLastCloudDrawingsFingerprint,
setLastCloudDrawingsFingerprint,
clearAllDrawingsFromCloud,
deleteDrawingFromCloudNow,
deleteDrawingFromCloud,
resolveDrawingsRestAuth,
reconcileLocalDrawingsWithCloud,
pullDrawingsFromCloud,
pullDrawingsFromCloudNow
} from "./drawings-cloud/sync-lifecycle.js?v=6";
