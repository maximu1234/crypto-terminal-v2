/**
 * Фоновое авто-сканирование паттерна 1-2 (desktop): таймер в localStorage,
 * продолжается при переходе на другие страницы (site-boot → resume).
 */
import {
createPattern12Scanner
} from "./pattern-12-scanner.js?v=9";

import {
loadScriptPageState,
saveScriptPageState,
periodMsById
} from "./script-page-storage.js?v=7";

export const SCRIPT_SCAN_BG_EVENT =
"script-scan-bg-update";

let timerId =
null;
let scanner =
null;
let resumeStarted =
false;

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

function mergeRowsForTf(
tf,
incoming
){

const state =
loadScriptPageState();
const kept =
state.rows.filter(
row=>
row.tf !==
tf
);
state.rows =
[
...kept,
...incoming
];
saveScriptPageState(
state
);
return state.rows;

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

export function scheduleScriptScanRun(
delayMs,
{
persist =
true
} =
{}
){

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
const state =
loadScriptPageState();
state.auto.nextRunAt =
nextRunAt;
saveScriptPageState(
state
);
}

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

export async function runBackgroundAutoScan(){

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

const scan =
getScanner();

if(
scan.isRunning()
){
return null;
}

const tf =
state.auto.tf;

dispatchUpdate(
{
type:
"started",
tf
}
);

const rows =
await scan.run(
{
tfs:
[
tf
],
onHit(
_hit,
allRows
){
mergeRowsForTf(
tf,
allRows
);
dispatchUpdate(
{
type:
"hit",
tf
}
);
},
onProgress(
progress
){
dispatchUpdate(
{
type:
"progress",
progress,
tf
}
);
}
}
);

if(
rows
){
mergeRowsForTf(
tf,
rows
);
}

const nextState =
loadScriptPageState();

if(
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
tf,
rows:
nextState.rows
}
);

return rows;

}

export function triggerScriptScanNow(){

const state =
loadScriptPageState();
state.auto.nextRunAt =
Date.now();
saveScriptPageState(
state
);
clearScriptScanTimer();
void runBackgroundAutoScan();

}

export function stopScriptScanBackground(){

clearScriptScanTimer();
const state =
loadScriptPageState();
state.auto.nextRunAt =
0;
saveScriptPageState(
state
);
dispatchUpdate(
{
type:
"stopped"
}
);

}

export function resumeScriptScanBackgroundJob(){

if(
!isDesktopShell()
){
return;
}

if(
resumeStarted
){
return;
}

resumeStarted =
true;

const state =
loadScriptPageState();

if(
!state.auto.active
){
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
void runBackgroundAutoScan();
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

export function getSharedPatternScanner(){

return getScanner();

}

export function isScriptScanBackgroundRunning(){

return getScanner().isRunning();

}
