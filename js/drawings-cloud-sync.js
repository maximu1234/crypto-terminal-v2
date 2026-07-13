/**
 * Drawings are local-only (localStorage). Cloud sync removed — stubs keep old imports safe.
 */

const noop =
()=>{};

const noopAsync =
async()=>{};

export const pauseDrawingsCloudSync =
noop;

export const runCloudOp =
noopAsync;

export const registerDrawingsChartRefresh =
()=>noop;

export const onDrawingsRemoteUpdate =
()=>noop;

export const scheduleDrawingsCloudSync =
noop;

export const scheduleDrawingsCloudPush =
noop;

export const flushDrawingsCloudPush =
async()=>{};

export const stopDrawingsFastPoll =
noop;

export const stopDrawingsCloudSync =
noop;

export const hydrateDrawingsAfterAuth =
async()=>{};

export const initDrawingsCloudSync =
noop;

export const bumpDrawingsPullNow =
noop;

export const setupDrawingsRealtimeForUser =
async()=>{};

export const getDirtyDrawingSymbols =
()=>[];

export const getDrawingsRestStressUntil =
()=>0;

export const setDrawingsRestStressUntil =
noop;

export const getLastCloudDrawingsFingerprint =
()=>"";

export const setLastCloudDrawingsFingerprint =
noop;

export const clearAllDrawingsFromCloud =
async()=>({ ok: true });

export const deleteDrawingFromCloudNow =
async()=>({ ok: true });

export const deleteDrawingFromCloud =
async()=>{};

export const resolveDrawingsRestAuth =
async()=>null;

export const reconcileLocalDrawingsWithCloud =
async()=>0;

export const pullDrawingsFromCloud =
async()=>({});

export const pullDrawingsFromCloudNow =
async()=>({});
