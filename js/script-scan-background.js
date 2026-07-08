/**
 * Фоновое авто-сканирование паттерна 1-2 (desktop): nextRunAt в localStorage,
 * watchdog + setTimeout на каждой странице (site-boot → resume).
 * Активный скан переживает переход между страницами (job + resume с cursor).
 */
import {
createPattern12Scanner,
PATTERN_SCAN_ALL_TFS
} from "./pattern-12-scanner.js?v=15";

import {
loadScriptPageState,
saveScriptPageState,
periodMsById
} from "./script-page-storage.js?v=9";

export const SCRIPT_SCAN_BG_EVENT =
"script-scan-bg-update";

const WATCHDOG_MS =
20_000;

const SCRIPT_SCAN_JOB_KEY =
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
let scanner =
null;
let localRunnerActive =
false;
let localRunnerGen =
0;

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

function readScanJob(){

try{
const raw =
JSON.parse(
localStorage.getItem(
SCRIPT_SCAN_JOB_KEY
) ||
"null"
);

if(
!raw ||
typeof raw !==
"object"
){
return null;
}

return raw;

}catch{
return null;
}

}

function writeScanJob(
job
){

try{

if(
!job
){
localStorage.removeItem(
SCRIPT_SCAN_JOB_KEY
);
return;
}

localStorage.setItem(
SCRIPT_SCAN_JOB_KEY,
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
"both",
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
sideFilter,
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

const rows =
await scan.run(
{
tfs:
job.tfs,
lookbackBars:
job.lookbackBars,
sideFilter:
job.sideFilter ||
"both",
startIndex:
Number(
job.done
) ||
0,
seedRows:
loadScriptPageState().rows,
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

}finally{

clearScanJob();

if(
localRunnerGen ===
gen
){
localRunnerActive =
false;
}

if(
mode ===
"auto"
){
const nextState =
loadScriptPageState();

if(
nextState.auto.active &&
!isPatternScanJobActive() &&
!getScanner().isRunning()
){
scheduleScriptScanRun(
periodMsById(
nextState.auto.periodId
)
);
}
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

const nextRunAt =
Number(
state.auto?.nextRunAt
) ||
0;

if(
nextRunAt &&
Date.now() + 500 <
nextRunAt
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
state.sideFilter ||
"both",
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

beginScanJob(
{
mode:
"full",
tfs:
PATTERN_SCAN_ALL_TFS.slice(),
lookbackBars:
lookbackBars ??
loadScriptPageState().searchDepth,
sideFilter:
sideFilter ??
loadScriptPageState().sideFilter ??
"both",
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

export function resumeScriptScanBackgroundJob(){

if(
!isDesktopShell()
){
return;
}

bindVisibilitySync();
bindPageShowSync();
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
