/**
 * Фоновое авто-сканирование паттерна 1-2 (desktop): nextRunAt в localStorage,
 * watchdog + setTimeout на каждой странице (site-boot → resume).
 * Активный скан переживает переход между страницами (job + resume с cursor).
 */
import {
createPattern12Scanner,
PATTERN_SCAN_ALL_TFS,
filterPatternScanRowsBySide,
normalizePatternScanSideFilter,
loadPatternScanSymbols
} from "./pattern-12-scanner.js?v=24";

import {
loadScriptPageState,
saveScriptPageState,
periodMsById
} from "./script-page-storage.js?v=15";

import {
loadScriptFavoritesForScan,
intersectFavoritesWithMarket
} from "./script-favorites-list.js?v=2";

import {
EXCHANGE_CHANGED_EVENT,
getActiveExchangeId
} from "./market-api.js?v=6";

export const SCRIPT_SCAN_BG_EVENT =
"script-scan-bg-update";

const WATCHDOG_MS =
20_000;

const SCRIPT_SCAN_JOB_KEY_PREFIX =
"script_scan_job_v1";

const SCRIPT_SCAN_JOB_LEGACY_KEY =
"script_scan_job_v1";

const STALE_JOB_MS =
3 *
60 *
60 *
1000;

let timerId =
null;
let watchdogId =
null;
let visibilityBound =
false;
let pageShowBound =
false;
let exchangeBound =
false;
let scanner =
null;
let localRunnerActive =
false;
let localRunnerGen =
0;

function normalizeExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
""
).trim().toLowerCase();

return id ===
"bingx"
? "bingx"
: "bybit";

}

function scanJobStorageKey(
exchangeId
){

return `${SCRIPT_SCAN_JOB_KEY_PREFIX}:${normalizeExchangeId(
exchangeId ||
getActiveExchangeId()
)}`;

}

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

function getScanner(){

if(
!scanner
){
scanner =
createPattern12Scanner();
}

return scanner;

}

async function resolveScanSymbols(
pageState,
sideFilter
){

if(
pageState?.favoritesOnly !==
true
){
return {
symbols:
null,
favoritesBySide:
null
};
}

const fav =
await loadScriptFavoritesForScan(
getActiveExchangeId(),
sideFilter ||
pageState.searchSide ||
"both"
);

if(
!fav.ok
){
throw new Error(
fav.message ||
"Не удалось прочитать избранные"
);
}

if(
!fav.exists
){
throw new Error(
fav.message ||
"Сначала добавьте файл избранных"
);
}

const market =
await loadPatternScanSymbols();

if(
fav.favoritesBySide
){
const long =
intersectFavoritesWithMarket(
fav.favoritesBySide.long,
market
);
const short =
intersectFavoritesWithMarket(
fav.favoritesBySide.short,
market
);

if(
!long.length &&
!short.length
){
throw new Error(
"Ни одна монета из файлов не найдена на бирже"
);
}

return {
symbols:
null,
favoritesBySide:
{
long,
short
}
};
}

const symbols =
intersectFavoritesWithMarket(
fav.symbols ||
[],
market
);

if(
!symbols.length
){
throw new Error(
"Ни одна монета из файла не найдена на бирже"
);
}

return {
symbols,
favoritesBySide:
null
};

}

function favoritesReadyForScan(
state,
sideFilter
){

if(
state?.favoritesOnly !==
true
){
return true;
}

const mode =
String(
sideFilter ||
state.searchSide ||
"both"
).trim().toLowerCase();
const longCount =
Math.max(
0,
Number(
state.favoritesLongCount
) ||
0
);
const shortCount =
Math.max(
0,
Number(
state.favoritesShortCount
) ||
0
);

if(
mode ===
"long"
){
return longCount >
0;
}

if(
mode ===
"short"
){
return shortCount >
0;
}

return longCount >
0 ||
shortCount >
0;

}

function favoritesMissingMessage(
sideFilter
){

const mode =
String(
sideFilter ||
"both"
).trim().toLowerCase();

if(
mode ===
"long"
){
return "Сначала добавьте файл Long";
}

if(
mode ===
"short"
){
return "Сначала добавьте файл Short";
}

return "Сначала добавьте файл Long или Short";

}

function dispatchUpdate(
detail
){

window.dispatchEvent(
new CustomEvent(
SCRIPT_SCAN_BG_EVENT,
{
detail
}
)
);

}

function replaceScanRows(
incoming
){

const state =
loadScriptPageState();
state.rows =
Array.isArray(
incoming
)
? incoming.slice()
: [];
saveScriptPageState(
state
);
return state.rows;

}

function readScanJob(
exchangeId
){

const key =
scanJobStorageKey(
exchangeId
);

try{
const raw =
JSON.parse(
localStorage.getItem(
key
) ||
"null"
);

if(
raw &&
typeof raw ===
"object"
){
return raw;
}

/* One-time migrate legacy unscoped job → bybit. */
if(
normalizeExchangeId(
exchangeId ||
getActiveExchangeId()
) ===
"bybit"
){

const legacy =
JSON.parse(
localStorage.getItem(
SCRIPT_SCAN_JOB_LEGACY_KEY
) ||
"null"
);

if(
legacy &&
typeof legacy ===
"object"
){
localStorage.setItem(
key,
JSON.stringify(
legacy
)
);
localStorage.removeItem(
SCRIPT_SCAN_JOB_LEGACY_KEY
);
return legacy;
}

}

return null;

}catch{
return null;
}

}

function writeScanJob(
job,
exchangeId
){

const key =
scanJobStorageKey(
exchangeId
);

try{

if(
!job
){
localStorage.removeItem(
key
);
return;
}

localStorage.setItem(
key,
JSON.stringify(
job
)
);

}catch{
/* ignore */
}

}

function clearScanJob(){

writeScanJob(
null
);

}

function patchScanJob(
patch
){

const job =
readScanJob();

if(
!job
){
return null;
}

const next = {
...job,
...patch
};

writeScanJob(
next
);
return next;

}

export function getScriptScanJobState(){

return readScanJob();

}

export function isPatternScanJobActive(){

const job =
readScanJob();

return (
job?.status ===
"running"
);

}

function isJobCancelled(
gen
){

const job =
readScanJob();

return (
!job ||
job.gen !==
gen ||
job.status !==
"running"
);

}

function discardStaleScanJob(){

const job =
readScanJob();

if(
!job ||
job.status !==
"running"
){
return;
}

const startedAt =
Number(
job.startedAt
) ||
0;

if(
startedAt &&
Date.now() -
startedAt >
STALE_JOB_MS
){
clearScanJob();
getScanner().stop();
}

}

export function getScriptScanNextRunAt(){

const state =
loadScriptPageState();
return Number(
state.auto?.nextRunAt
) ||
0;

}

export function clearScriptScanTimer(){

if(
timerId
){
clearTimeout(
timerId
);
timerId =
null;
}

}

function stopWatchdog(){

if(
watchdogId
){
clearInterval(
watchdogId
);
watchdogId =
null;
}

}

function restartWatchdog(){

stopWatchdog();

if(
!isDesktopShell()
){
return;
}

watchdogId =
setInterval(
()=>{
void tickScriptScanWatchdog();
},
WATCHDOG_MS
);

}

function bindVisibilitySync(){

if(
visibilityBound ||
typeof document ===
"undefined"
){
return;
}

visibilityBound =
true;

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState ===
"visible"
){
resumeScriptScanBackgroundJob();
}

}
);

}

function bindPageShowSync(){

if(
pageShowBound ||
typeof window ===
"undefined"
){
return;
}

pageShowBound =
true;

window.addEventListener(
"pageshow",
event=>{

if(
event.persisted
){
resumeScriptScanBackgroundJob();
}

}
);

}

function beginScanJob(
{
mode,
tfs,
lookbackBars,
sideFilter =
"all",
clearRows =
false
}
){

const gen =
Date.now();

if(
clearRows
){
replaceScanRows(
[]
);
}

writeScanJob(
{
status:
"running",
mode,
gen,
tfs:
tfs.slice(),
lookbackBars,
sideFilter:
normalizePatternScanSideFilter(
sideFilter
),
done:
0,
total:
0,
phase:
"symbols",
symbol:
null,
tf:
null,
startedAt:
gen,
finishedAt:
null,
error:
null
}
);

restartWatchdog();

dispatchUpdate(
{
type:
"started",
mode,
tf:
tfs[
0
]
}
);

void executeScanJob(
gen
);

return gen;

}

async function executeScanJob(
gen
){

discardStaleScanJob();

const job =
readScanJob();

if(
!job ||
job.gen !==
gen ||
job.status !==
"running"
){
return;
}

if(
localRunnerActive &&
localRunnerGen ===
gen
){
return;
}

if(
localRunnerActive &&
localRunnerGen !==
gen
){
return;
}

localRunnerGen =
gen;
localRunnerActive =
true;

const scan =
getScanner();
const mode =
job.mode;
const tf =
job.tfs[
0
];

try{

const pageState =
loadScriptPageState();
const sideFilter =
job.sideFilter ||
"both";
const resolved =
await resolveScanSymbols(
pageState,
sideFilter
);

const rows =
await scan.run(
{
tfs:
job.tfs,
lookbackBars:
job.lookbackBars,
sideFilter,
startIndex:
Number(
job.done
) ||
0,
seedRows:
filterPatternScanRowsBySide(
loadScriptPageState().rows,
sideFilter
),
...(
resolved.favoritesBySide
? {
favoritesBySide:
resolved.favoritesBySide
}
: resolved.symbols
? {
symbols:
resolved.symbols
}
: {}
),
onHit(
_hit,
allRows
){
replaceScanRows(
allRows
);
dispatchUpdate(
{
type:
"hit",
mode,
tf
}
);
},
onProgress(
progress
){
patchScanJob(
{
done:
Number(
progress.done
) ||
0,
total:
Number(
progress.total
) ||
0,
phase:
progress.phase ||
"scan",
symbol:
progress.symbol ||
null,
tf:
progress.tf ||
null
}
);

dispatchUpdate(
{
type:
"progress",
progress,
mode,
tf
}
);
}
}
);

if(
isJobCancelled(
gen
)
){
return;
}

if(
rows
){
replaceScanRows(
rows
);
}

patchScanJob(
{
status:
"done",
finishedAt:
Date.now(),
error:
null
}
);

const nextState =
loadScriptPageState();

if(
mode ===
"auto" &&
nextState.auto.active
){
nextState.auto.lastScanAt =
Date.now();
saveScriptPageState(
nextState
);
scheduleScriptScanRun(
periodMsById(
nextState.auto.periodId
)
);
}

dispatchUpdate(
{
type:
"finished",
mode,
tf,
rows:
loadScriptPageState().rows
}
);

}catch(
err
){

console.error(
"[script-scan-bg]",
err
);

if(
isJobCancelled(
gen
)
){
return;
}

patchScanJob(
{
status:
"error",
finishedAt:
Date.now(),
error:
err?.message ||
String(
err
)
}
);

dispatchUpdate(
{
type:
"error",
mode,
tf,
message:
err?.message ||
String(
err
)
}
);

if(
mode ===
"auto"
){
const errState =
loadScriptPageState();

if(
errState.auto.active
){
scheduleScriptScanRun(
periodMsById(
errState.auto.periodId
)
);
}
}

}finally{

clearScanJob();

if(
localRunnerGen ===
gen
){
localRunnerActive =
false;
}

}

}

function syncScriptScanTimer(){

if(
!isDesktopShell()
){
return;
}

const state =
loadScriptPageState();

if(
!state.auto.active
){
clearScriptScanTimer();

if(
!isPatternScanJobActive()
){
stopWatchdog();
}

return;
}

restartWatchdog();

if(
isPatternScanJobActive()
){
const job =
readScanJob();

if(
job
){
void executeScanJob(
job.gen
);
}

return;
}

const nextRunAt =
getScriptScanNextRunAt();
const remaining =
nextRunAt -
Date.now();

if(
!nextRunAt
){
scheduleScriptScanRun(
periodMsById(
state.auto.periodId
)
);
return;
}

if(
remaining <=
0
){

if(
!getScanner().isRunning()
){
void runBackgroundAutoScan();
}

return;
}

scheduleScriptScanRun(
remaining,
{
persist:
false
}
);

}

async function tickScriptScanWatchdog(){

if(
!isDesktopShell()
){
return;
}

const state =
loadScriptPageState();

if(
!state.auto.active &&
!isPatternScanJobActive()
){
return;
}

if(
isPatternScanJobActive()
){
const job =
readScanJob();

if(
job &&
!getScanner().isRunning() &&
!localRunnerActive
){
void executeScanJob(
job.gen
);
}

return;
}

if(
!state.auto.active
){
return;
}

const scan =
getScanner();

if(
scan.isRunning()
){
return;
}

const nextRunAt =
getScriptScanNextRunAt();

if(
!nextRunAt
){
syncScriptScanTimer();
return;
}

if(
Date.now() >=
nextRunAt
){
await runBackgroundAutoScan();
}

}

export function scheduleScriptScanRun(
delayMs,
{
persist =
true
} =
{}
){

if(
!isDesktopShell()
){
return;
}

const state =
loadScriptPageState();

if(
!state.auto.active
){
clearScriptScanTimer();
return;
}

clearScriptScanTimer();

const wait =
Math.max(
0,
delayMs
);
const nextRunAt =
Date.now() +
wait;

if(
persist
){
state.auto.nextRunAt =
nextRunAt;
saveScriptPageState(
state
);
}

restartWatchdog();

timerId =
setTimeout(
()=>{
timerId =
null;
void runBackgroundAutoScan();
},
wait
);

dispatchUpdate(
{
type:
"scheduled",
nextRunAt
}
);

}

export function runBackgroundAutoScan(){

if(
!isDesktopShell()
){
return null;
}

const state =
loadScriptPageState();

if(
!state.auto.active
){
return null;
}

if(
isPatternScanJobActive() ||
getScanner().isRunning()
){
const job =
readScanJob();

if(
job
){
void executeScanJob(
job.gen
);
}

return null;
}

const tf =
state.auto.tf;

if(
!favoritesReadyForScan(
state,
state.searchSide
)
){
dispatchUpdate(
{
type:
"error",
mode:
"auto",
tf,
message:
favoritesMissingMessage(
state.searchSide
)
}
);
return null;
}

beginScanJob(
{
mode:
"auto",
tfs:
[
tf
],
lookbackBars:
state.searchDepth,
sideFilter:
state.searchSide,
clearRows:
true
}
);

return true;

}

export function startFullPatternScan(
{
lookbackBars,
sideFilter
} =
{}
){

if(
!isDesktopShell()
){
return null;
}

stopActivePatternScan();

const state =
loadScriptPageState();
const resolvedSide =
sideFilter ??
state.searchSide;

if(
!favoritesReadyForScan(
state,
resolvedSide
)
){
dispatchUpdate(
{
type:
"error",
mode:
"full",
tf:
null,
message:
favoritesMissingMessage(
resolvedSide
)
}
);
return null;
}

beginScanJob(
{
mode:
"full",
tfs:
PATTERN_SCAN_ALL_TFS.slice(),
lookbackBars:
lookbackBars ??
state.searchDepth,
sideFilter:
resolvedSide,
clearRows:
true
}
);

return true;

}

export function stopActivePatternScan(){

const scan =
getScanner();
const job =
readScanJob();

if(
job?.status ===
"running"
){
writeScanJob(
{
...job,
status:
"cancelled",
finishedAt:
Date.now()
}
);
}

scan.stop();
clearScanJob();
localRunnerActive =
false;
localRunnerGen =
0;

dispatchUpdate(
{
type:
"stopped"
}
);

}

export function triggerScriptScanNow(){

const state =
loadScriptPageState();

if(
!state.auto.active
){
return;
}

state.auto.nextRunAt =
Date.now();
saveScriptPageState(
state
);
clearScriptScanTimer();
restartWatchdog();
runBackgroundAutoScan();

}

export function stopScriptScanBackground(){

stopActivePatternScan();
clearScriptScanTimer();
stopWatchdog();

const state =
loadScriptPageState();
state.auto.nextRunAt =
0;
saveScriptPageState(
state
);

}

function onExchangeChanged(){

localRunnerGen++;
stopActivePatternScan();
clearScriptScanTimer();

dispatchUpdate(
{
type:
"exchange-changed",
exchangeId:
getActiveExchangeId()
}
);

const state =
loadScriptPageState();

if(
state.auto.active
){
/* Reschedule against the new exchange's results/job bucket. */
scheduleScriptScanRun(
periodMsById(
state.auto.periodId
)
);
}

}

function bindExchangeSync(){

if(
exchangeBound
){
return;
}

exchangeBound =
true;
window.addEventListener(
EXCHANGE_CHANGED_EVENT,
onExchangeChanged
);

}

export function resumeScriptScanBackgroundJob(){

if(
!isDesktopShell()
){
return;
}

bindVisibilitySync();
bindPageShowSync();
bindExchangeSync();
discardStaleScanJob();

const job =
readScanJob();

if(
job?.status ===
"running"
){
void executeScanJob(
job.gen
);
}

syncScriptScanTimer();

}

export function getSharedPatternScanner(){

return getScanner();

}

export function isScriptScanBackgroundRunning(){

return (
getScanner().isRunning() ||
isPatternScanJobActive()
);

}
