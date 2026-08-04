/**
 * Screener Live — continuous Pattern 1-2 scan on Script page.
 * Findings go to log + system Notification only (not the widget grid).
 * Uses its own scanner instance; stops the periodic auto-scan on start.
 */
import {
createPattern12Scanner,
PATTERN_SCAN_TF_LABELS,
PATTERN_SCAN_SIDE_LABELS,
PATTERN_SCAN_DEPTH_OPTIONS,
PATTERN_SCAN_DEFAULT_LOOKBACK,
normalizePatternScanSideFilter,
patternScanTfMs
} from "./pattern-12-scanner.js?v=19";

import {
stopScriptScanBackground,
stopActivePatternScan
} from "./script-scan-background.js?v=14";

import {
fetchTickersInto
} from "./tickers.js?v=26";

import {
getActiveExchangeId,
loadMarketSymbols,
buildMarketLists
} from "./market-api.js?v=5";

export const SCRIPT_SCREENER_LIVE_EVENT =
"script-screener-live-update";

const LOG_STORAGE_PREFIX =
"script_screener_live_log_v1:";
const JOB_STORAGE_PREFIX =
"script_screener_live_job_v1:";
const LOG_LIMIT =
200;
/** После открытия свечи даём бирже чуть времени отдать историю. */
const CANDLE_OPEN_BUFFER_MS =
2_000;
/** Короткая пауза при ошибке загрузки тикеров. */
const ERROR_RETRY_MS =
5_000;

/** @type {ReturnType<typeof createPattern12Scanner>|null} */
let scanner =
null;

let active =
false;
let stopRequested =
false;
let loopGen =
0;
let exchangeBound =
false;

/** @type {{ tf: string, lookbackBars: number, sideFilter: string, minTurnover24hUsdt: number }|null} */
let criteria =
null;

/** @type {{ done: number, total: number, phase: string, pass: number }|null} */
let progress =
null;

/** @type {Map<string, string>} symbol:tf:side → bar|time */
const seenHits =
new Map();

/**
 * Mid-pass resume cursor (one-shot after page reload).
 * Symbols are NOT stored — re-fetched on resume; only done/total/pass.
 * @type {{ pass: number, done: number, total: number }|null}
 */
let pendingResume =
null;

/** @type {number|null} resume into candle-wait (epoch ms) */
let pendingWaitUntil =
null;

/** In-memory symbol list for the current pass (not persisted — too large for localStorage). */
let passSymbols =
null;

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

/**
 * @returns {ReturnType<typeof createPattern12Scanner>}
 */
function getLiveScanner(){

if(
!scanner
){
scanner =
createPattern12Scanner();
}

return scanner;

}

function logStorageKey(){

return `${LOG_STORAGE_PREFIX}${getActiveExchangeId() || "bybit"}`;

}

function jobStorageKey(){

return `${JOB_STORAGE_PREFIX}${getActiveExchangeId() || "bybit"}`;

}

/**
 * @returns {{
 *   active?: boolean,
 *   criteria?: object,
 *   seen?: Record<string, string>,
 *   pass?: number,
 *   done?: number,
 *   total?: number,
 *   phase?: string
 * }|null}
 */
function readLiveJob(){

try{
const raw =
localStorage.getItem(
jobStorageKey()
);
const parsed =
raw
? JSON.parse(
raw
)
: null;

return parsed &&
typeof parsed ===
"object"
? parsed
: null;
}catch{
return null;
}

}

/**
 * Lightweight job only — never store the full ticker universe (quota / silent fail).
 * @param {object} job
 * @returns {boolean}
 */
function writeLiveJob(
job
){

try{
localStorage.setItem(
jobStorageKey(),
JSON.stringify(
job
)
);
return true;
}catch{
try{
/* Retry without seen map if quota exceeded. */
const slim =
{
...job
};
delete slim.seen;
localStorage.setItem(
jobStorageKey(),
JSON.stringify(
slim
)
);
return true;
}catch{
return false;
}
}

}

function clearLiveJob(){

try{
localStorage.removeItem(
jobStorageKey()
);
}catch{
/* ignore */
}

}

/**
 * @param {{ includeSeen?: boolean }} [opts]
 */
function persistLiveJob(
opts =
{}
){

if(
!active ||
!criteria
){
clearLiveJob();
return;
}

const prev =
readLiveJob();
const includeSeen =
opts.includeSeen ===
true;

const done =
Math.max(
0,
Number(
progress?.done
) ||
0
);
const total =
Math.max(
0,
Number(
progress?.total
) ||
0
);
const pass =
Math.max(
1,
Number(
progress?.pass
) ||
Number(
prev?.pass
) ||
1
);

/*
  Monotonic done within the same pass — never persist a lower cursor
  (guards against bootstrap / race overwrites).
*/
const prevPass =
Math.max(
0,
Number(
prev?.pass
) ||
0
);
const prevDone =
Math.max(
0,
Number(
prev?.done
) ||
0
);
const safeDone =
prevPass ===
pass &&
done <
prevDone
? prevDone
: done;
const safeTotal =
Math.max(
total,
Number(
prev?.total
) ||
0,
passSymbols?.length ||
0
);

writeLiveJob(
{
active:
true,
criteria,
seen:
includeSeen
? Object.fromEntries(
seenHits
)
: (
prev?.seen &&
typeof prev.seen ===
"object"
? prev.seen
: {}
),
pass,
done:
safeDone,
total:
safeTotal,
phase:
progress?.phase ||
"scanning",
nextScanAt:
Number(
progress?.nextScanAt
) ||
Number(
prev?.nextScanAt
) ||
0
}
);

}

/**
 * @param {{ done?: number, total?: number, running?: boolean, phase?: string, stopped?: boolean }} p
 */
function applyScanProgress(
p
){

/* Scanner bootstraps with { done:0, total:0, phase:"symbols" } — do not wipe resume. */
if(
p?.phase ===
"symbols"
){
return;
}

const nextTotal =
Math.max(
0,
Number(
p?.total
) ||
0
);
const nextDone =
Math.max(
0,
Number(
p?.done
) ||
0
);

if(
nextTotal <=
0
){
return;
}

const prevDone =
Math.max(
0,
Number(
progress?.done
) ||
0
);
const prevTotal =
Math.max(
0,
Number(
progress?.total
) ||
0
);

/* Never let bootstrap / stale events move the counter backwards. */
if(
prevTotal >
0 &&
nextTotal ===
prevTotal &&
nextDone <
prevDone
){
return;
}

progress =
{
done:
nextDone,
total:
nextTotal,
phase:
p?.running ===
false
? (
p?.stopped
? "stopped"
: "idle"
)
: "scanning",
pass:
Math.max(
1,
Number(
progress?.pass
) ||
1
)
};

persistLiveJob();
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);

}

function restoreSeenHits(
seen
){

seenHits.clear();

if(
!seen ||
typeof seen !==
"object"
){
return;
}

for(
const [
key,
stamp
] of Object.entries(
seen
)
){
if(
key &&
stamp !=
null
){
seenHits.set(
String(
key
),
String(
stamp
)
);
}
}

}

/**
 * Persisted Live job wants to run (even if loop not yet started in this page).
 * @returns {boolean}
 */
export function isScreenerLiveJobActive(){

if(
active
){
return true;
}

const job =
readLiveJob();

return !!(
job?.active &&
job?.criteria?.tf
);

}


/**
 * @returns {Array<{ foundAt: number, symbol: string, tf: string, side: string, bar?: number, time?: number }>}
 */
export function getScreenerLiveLog(){

try{
const raw =
localStorage.getItem(
logStorageKey()
);
const parsed =
raw
? JSON.parse(
raw
)
: [];

return Array.isArray(
parsed
)
? parsed
: [];
}catch{
return [];
}

}

/**
 * @param {Array<{ foundAt: number, symbol: string, tf: string, side: string, bar?: number, time?: number }>} rows
 */
function saveScreenerLiveLog(
rows
){

try{
localStorage.setItem(
logStorageKey(),
JSON.stringify(
rows.slice(
0,
LOG_LIMIT
)
)
);
}catch{
/* ignore quota */
}

}

export function clearScreenerLiveLog(){

saveScreenerLiveLog(
[]
);
dispatchLiveUpdate(
{
type:
"log-cleared"
}
);

}

/**
 * @param {Record<string, unknown>} detail
 */
function dispatchLiveUpdate(
detail
){

try{
window.dispatchEvent(
new CustomEvent(
SCRIPT_SCREENER_LIVE_EVENT,
{
detail
}
)
);
}catch{
/* ignore */
}

}

export function isScreenerLiveActive(){

return active;

}

export function getScreenerLiveStatus(){

const job =
readLiveJob();

const jobProgress =
job?.active
? {
done:
Math.max(
0,
Number(
job.done
) ||
0
),
total:
Math.max(
0,
Number(
job.total
) ||
0
),
phase:
job.phase ||
"scanning",
pass:
Math.max(
1,
Number(
job.pass
) ||
1
),
nextScanAt:
Number(
job.nextScanAt
) ||
0
}
: null;

return {
active,
criteria:
criteria ||
job?.criteria ||
null,
progress:
progress ||
jobProgress,
logCount:
getScreenerLiveLog().length
};

}

/**
 * @param {string} title
 * @param {string} body
 * @param {string} [tag]
 */
function showLiveNotification(
title,
body,
tag
){

if(
typeof Notification ===
"undefined"
){
return;
}

if(
Notification.permission !==
"granted"
){
return;
}

try{
const n =
new Notification(
title,
{
body,
tag:
tag ||
`script-live-${Date.now()}`,
requireInteraction:
false
}
);

n.onclick =
()=>{
window.focus?.();
n.close();
};

setTimeout(
()=>
n.close(),
8000
);
}catch{
/* ignore */
}

}

async function ensureNotificationPermission(){

if(
typeof Notification ===
"undefined"
){
return;
}

if(
Notification.permission ===
"default"
){
try{
await Notification.requestPermission();
}catch{
/* ignore */
}
}

}

/**
 * @param {Map<string, { volume24?: number }>} volumeBySymbol
 * @param {string} symbol
 * @returns {number|null}
 */
function volumeForSymbol(
volumeBySymbol,
symbol
){

const raw =
String(
symbol ||
""
).trim().toUpperCase();
const bare =
raw.replace(
/\.P$/i,
""
);

for(
const key of [
raw,
bare,
`${bare}.P`
]
){
if(
volumeBySymbol.has(
key
)
){
return Number(
volumeBySymbol.get(
key
)?.volume24
) ||
0;
}
}

return null;

}

/**
 * Live universe = весь рынок биржи (lists.all), не только вкладка crypto.
 * Старый авто-скан Скрипта по-прежнему на crypto — его не трогаем.
 * @returns {Promise<string[]>}
 */
async function loadLiveUniverseSymbols(){

const instruments =
await loadMarketSymbols();
const lists =
buildMarketLists(
instruments,
getActiveExchangeId()
);
const raw =
(
Array.isArray(
lists?.all
) &&
lists.all.length
? lists.all
: lists?.crypto
) ||
[];

return raw
.map(
s=>
String(
s ||
""
).trim().toUpperCase()
)
.filter(
Boolean
);

}

/**
 * @param {number} minTurnover
 * @returns {Promise<string[]>}
 */
async function loadFilteredSymbols(
minTurnover
){

const symbols =
await loadLiveUniverseSymbols();
const snap =
new Map();

try{
await fetchTickersInto(
snap
);
}catch{
return symbols.slice();
}

const volumeBySymbol =
new Map();

snap.forEach(
(
tick,
symbol
)=>{
volumeBySymbol.set(
String(
symbol ||
""
).toUpperCase(),
{
volume24:
Number(
tick.volume24
) ||
0
}
);
}
);

if(
!(
Number.isFinite(
minTurnover
) &&
minTurnover >
0
)
){
return symbols.slice();
}

return symbols.filter(
symbol=>{
const vol =
volumeForSymbol(
volumeBySymbol,
symbol
);

if(
vol ==
null
){
return true;
}

return vol >=
minTurnover;
}
);

}

/**
 * @param {{ symbol: string, tf: string, side: string, bar?: number, time?: number }} row
 */
function handleNewHit(
row
){

const symbol =
String(
row?.symbol ||
""
).trim().toUpperCase();
const tf =
String(
row?.tf ||
""
);
const side =
String(
row?.side ||
""
);
const bar =
row?.bar;
const time =
row?.time;

if(
!symbol ||
!tf ||
!side
){
return;
}

const key =
`${symbol}:${tf}:${side}`;
const stamp =
`${bar ?? ""}|${time ?? ""}`;
const prev =
seenHits.get(
key
);

if(
prev ===
stamp
){
return;
}

seenHits.set(
key,
stamp
);

const foundAt =
Date.now();
const entry =
{
foundAt,
symbol,
tf,
side,
bar,
time
};

const log =
getScreenerLiveLog();
log.unshift(
entry
);
saveScreenerLiveLog(
log.slice(
0,
LOG_LIMIT
)
);

persistLiveJob(
{
includeSeen:
true
}
);

const tfLabel =
PATTERN_SCAN_TF_LABELS[
tf
] ||
tf;
const sideLabel =
PATTERN_SCAN_SIDE_LABELS[
side
] ||
side;

showLiveNotification(
"Скринер Live",
`${symbol} · ${tfLabel} · ${sideLabel}`,
`script-live-${key}`
);

dispatchLiveUpdate(
{
type:
"hit",
entry,
logCount:
Math.min(
log.length,
LOG_LIMIT
)
}
);

}

function delay(
ms
){

return new Promise(
resolve=>
setTimeout(
resolve,
ms
)
);

}

/**
 * Следующее открытие свечи выбранного ТФ (UTC-выравнивание, как у крипто-бирж).
 * @param {string} tf
 * @param {number} [nowMs]
 * @returns {number} epoch ms
 */
function nextCandleOpenAtMs(
tf,
nowMs =
Date.now()
){

const tfMs =
patternScanTfMs(
tf
);
const step =
tfMs >
0
? tfMs
: 60 *
1000;
const now =
Number(
nowMs
) ||
Date.now();
const open =
Math.floor(
now /
step
) *
step +
step;

return open +
CANDLE_OPEN_BUFFER_MS;

}

/**
 * @param {number} gen
 * @param {string} tf
 * @param {number} [untilMs]
 */
async function waitUntilCandleOpen(
gen,
tf,
untilMs
){

const at =
Number(
untilMs
) >
Date.now()
? Number(
untilMs
)
: nextCandleOpenAtMs(
tf
);

progress =
{
done:
progress?.total ||
progress?.done ||
0,
total:
progress?.total ||
0,
phase:
"wait_candle",
pass:
progress?.pass ||
1,
nextScanAt:
at
};
persistLiveJob();
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);

while(
active &&
gen ===
loopGen &&
!stopRequested
){

const left =
at -
Date.now();

if(
left <=
0
){
break;
}

await delay(
Math.min(
left,
1_000
)
);

if(
gen !==
loopGen
){
return;
}

progress =
{
...progress,
phase:
"wait_candle",
nextScanAt:
at
};
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);
}

}

/**
 * @param {{
 *   tf: string,
 *   lookbackBars?: number,
 *   sideFilter?: string,
 *   minTurnover24hUsdt?: number
 * }} opts
 * @param {{ resume?: boolean }} [flags]
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function startScreenerLive(
opts =
{},
flags =
{}
){

if(
active
){
return {
ok:
true
};
}

const tf =
String(
opts.tf ||
""
).trim();

if(
!tf
){
return {
ok:
false,
message:
"Укажите таймфрейм"
};
}

const lookbackBars =
PATTERN_SCAN_DEPTH_OPTIONS.includes(
Number(
opts.lookbackBars
)
)
? Number(
opts.lookbackBars
)
: PATTERN_SCAN_DEFAULT_LOOKBACK;

const sideFilter =
normalizePatternScanSideFilter(
opts.sideFilter
);
const minTurnover24hUsdt =
Number(
opts.minTurnover24hUsdt
);

criteria =
{
tf,
lookbackBars,
sideFilter,
minTurnover24hUsdt:
Number.isFinite(
minTurnover24hUsdt
)
? minTurnover24hUsdt
: 0
};

await ensureNotificationPermission();

stopScriptScanBackground();
stopActivePatternScan();

active =
true;
stopRequested =
false;

if(
flags.resume
){
const job =
readLiveJob();
restoreSeenHits(
job?.seen
);

const done =
Math.max(
0,
Number(
job?.done
) ||
0
);
const total =
Math.max(
0,
Number(
job?.total
) ||
0
);
const pass =
Math.max(
1,
Number(
job?.pass
) ||
1
);

/*
  Mid-pass: continue scan.
  Wait-candle: resume countdown until next TF open.
  Otherwise: wait for next candle before a new pass.
*/
if(
done >
0 &&
(
total <=
0 ||
done <
total
) &&
job?.phase !==
"wait_candle"
){
pendingResume =
{
pass,
done,
total
};
pendingWaitUntil =
null;
progress =
{
done,
total:
total ||
0,
phase:
"scanning",
pass
};
}else{
pendingResume =
null;
passSymbols =
null;
const nextAt =
Number(
job?.nextScanAt
) >
Date.now()
? Number(
job.nextScanAt
)
: nextCandleOpenAtMs(
tf
);
pendingWaitUntil =
nextAt;
progress =
{
done:
total ||
done ||
0,
total:
total ||
0,
phase:
"wait_candle",
pass,
nextScanAt:
nextAt
};
}
}else{
seenHits.clear();
pendingResume =
null;
pendingWaitUntil =
null;
passSymbols =
null;
progress =
{
done:
0,
total:
0,
phase:
"starting",
pass:
0
};
}

persistLiveJob();
bindExchangeSync();
bindPageHidePersist();

const gen =
++loopGen;

dispatchLiveUpdate(
{
type:
"started",
criteria
}
);

void runLiveLoop(
gen
);

return {
ok:
true
};

}

export function stopScreenerLive(){

stopRequested =
true;
loopGen++;
active =
false;
getLiveScanner().stop();
progress =
null;
criteria =
null;
clearLiveJob();

dispatchLiveUpdate(
{
type:
"stopped"
}
);

}

/**
 * Resume Live after navigation (desktop). Same pattern as auto-scan bg job.
 */
export function resumeScreenerLive(){

if(
!isDesktopShell()
){
return;
}

bindExchangeSync();

if(
active
){
return;
}

const job =
readLiveJob();

if(
!(
job?.active &&
job?.criteria?.tf
)
){
return;
}

void startScreenerLive(
job.criteria,
{
resume:
true
}
);

}

function bindExchangeSync(){

if(
exchangeBound ||
typeof window ===
"undefined"
){
return;
}

exchangeBound =
true;

void import(
"./market-api.js?v=5"
).then(
(
{
EXCHANGE_CHANGED_EVENT
}
)=>{
window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{
if(
active ||
readLiveJob()?.active
){
stopScreenerLive();
}
}
);
}
).catch(
()=>{
exchangeBound =
false;
}
);

}

let pageHideBound =
false;

function bindPageHidePersist(){

if(
pageHideBound ||
typeof window ===
"undefined"
){
return;
}

pageHideBound =
true;

const flush =
()=>{
if(
active &&
criteria
){
persistLiveJob(
{
includeSeen:
true
}
);
}
};

window.addEventListener(
"pagehide",
flush
);
window.addEventListener(
"beforeunload",
flush
);

}

/**
 * @param {number} gen
 */
async function runLiveLoop(
gen
){

const liveScanner =
getLiveScanner();
let needInitialWait =
pendingWaitUntil !=
null;

while(
active &&
gen ===
loopGen &&
!stopRequested
){

if(
needInitialWait
){
const until =
pendingWaitUntil;
pendingWaitUntil =
null;
needInitialWait =
false;
await waitUntilCandleOpen(
gen,
criteria.tf,
until
);

if(
!active ||
gen !==
loopGen ||
stopRequested
){
break;
}
}

let symbols =
[];
let startIndex =
0;
let resume =
pendingResume;
pendingResume =
null;

if(
!resume
){
const job =
readLiveJob();
const done =
Math.max(
0,
Number(
job?.done
) ||
0
);
const total =
Math.max(
0,
Number(
job?.total
) ||
0
);

if(
done >
0 &&
(
total <=
0 ||
done <
total
)
){
resume =
{
pass:
Math.max(
1,
Number(
job?.pass
) ||
1
),
done,
total
};
}
}

const isMidPassResume =
!!(
resume &&
resume.done >
0 &&
(
!resume.total ||
resume.done <
resume.total
)
);

const prevPass =
progress?.pass ||
resume?.pass ||
0;

if(
isMidPassResume
){
progress =
{
done:
resume.done,
total:
resume.total ||
0,
phase:
"symbols",
pass:
resume.pass ||
1
};
}else{
progress =
{
done:
0,
total:
0,
phase:
"symbols",
pass:
prevPass +
1
};
}

passSymbols =
null;
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);

try{
symbols =
await loadFilteredSymbols(
criteria?.minTurnover24hUsdt ||
0
);
}catch(
err
){
dispatchLiveUpdate(
{
type:
"error",
message:
err?.message ||
String(
err
)
}
);
await delay(
ERROR_RETRY_MS
);
continue;
}

if(
!active ||
gen !==
loopGen ||
stopRequested
){
break;
}

if(
!symbols.length
){
progress =
{
...progress,
phase:
"empty",
done:
0,
total:
0
};
passSymbols =
[];
persistLiveJob();
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);
await delay(
ERROR_RETRY_MS
);
continue;
}

if(
isMidPassResume
){
startIndex =
Math.min(
resume.done,
symbols.length
);
progress =
{
done:
startIndex,
total:
symbols.length,
phase:
"scanning",
pass:
resume.pass ||
1
};
}else{
startIndex =
0;
progress =
{
...progress,
done:
0,
total:
symbols.length,
phase:
"scanning"
};
}

passSymbols =
symbols;
persistLiveJob();
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);

await liveScanner.run(
{
tfs: [
criteria.tf
],
lookbackBars:
criteria.lookbackBars,
sideFilter:
criteria.sideFilter,
symbols,
startIndex,
onHit(
row
){
if(
!active ||
gen !==
loopGen ||
stopRequested
){
return;
}

handleNewHit(
row
);
},
onProgress(
p
){
if(
gen !==
loopGen
){
return;
}

applyScanProgress(
p
);
}
}
);

if(
!active ||
gen !==
loopGen ||
stopRequested
){
break;
}

/*
  Pass finished — next scan only on the next candle open of this TF.
*/
passSymbols =
null;
progress =
{
...progress,
done:
progress?.total ||
progress?.done ||
0,
phase:
"wait_candle",
nextScanAt:
nextCandleOpenAtMs(
criteria.tf
)
};
persistLiveJob();
dispatchLiveUpdate(
{
type:
"progress",
progress
}
);

await waitUntilCandleOpen(
gen,
criteria.tf,
progress.nextScanAt
);

}

/* Only the current generation may clear in-memory state. */
if(
gen !==
loopGen
){
return;
}

const job =
readLiveJob();

if(
job?.active &&
job?.criteria?.tf &&
!stopRequested
){
active =
false;
progress =
null;
void startScreenerLive(
job.criteria,
{
resume:
true
}
);
return;
}

active =
false;
progress =
null;
clearLiveJob();
dispatchLiveUpdate(
{
type:
"stopped"
}
);

}
