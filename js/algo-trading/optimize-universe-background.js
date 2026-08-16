/**
 * Фоновый «Подобрать для всех» (desktop): job в localStorage + resume на любой
 * странице (site-boot). Подбор переживает закрытие модалки и переход между
 * страницами; курсор — уже посчитанные тикеры в результатах на диске.
 */
import {
loadOptimizeUniverseResult,
saveOptimizeUniverseResult
} from "./modal-results-storage.js?v=5";

import {
pattern12SettingsCacheKey
} from "./pattern-12-settings.js?v=3";

import {
getActiveExchangeId,
EXCHANGE_CHANGED_EVENT
} from "../exchanges/context.js?v=1";

export const ALGO_OPTIMIZE_UNIVERSE_BG_EVENT =
"algo-optimize-universe-bg-update";

const JOB_KEY =
"algo_trading_optimize_universe_job_v1";

/** Джоба без прогресса дольше — считаем брошенной (краш/выход из приложения). */
const STALE_JOB_MS =
10 *
60 *
1000;

const PERSIST_THROTTLE_MS =
1500;

let localRunnerGen =
0;
let localRunnerActive =
false;
let visibilityBound =
false;
let exchangeBound =
false;
let lastPersistAt =
0;

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

/**
 * Локальная нормализация: тяжёлый модуль подбора грузим только при работе.
 * @param {unknown} value
 * @returns {"st1"|"st2"|"st3"}
 */
function normalizeStrategyId(
value
){

const id =
String(
value ||
""
).trim().toLowerCase();

return id ===
"st2" ||
id ===
"st3"
? id
: "st1";

}

function activeExchange(){

return String(
getActiveExchangeId?.() ||
"bybit"
).toLowerCase() ||
"bybit";

}

/**
 * @returns {Promise<Function>}
 */
async function loadScanner(){

const mod =
await import(
"./strategy-param-optimize-scan.js?v=8"
);

return mod.scanAlgoStrategyParamOptimizeUniverse;

}

/**
 * @param {object|null} detail
 */
function dispatchUpdate(
detail
){

window.dispatchEvent(
new CustomEvent(
ALGO_OPTIMIZE_UNIVERSE_BG_EVENT,
{
detail
}
)
);

}

/**
 * @returns {object|null}
 */
export function readAlgoOptimizeUniverseJob(){

try{
const raw =
JSON.parse(
localStorage.getItem(
JOB_KEY
) ||
"null"
);

return raw &&
typeof raw ===
"object"
? raw
: null;
}catch{
return null;
}

}

/**
 * @param {object|null} job
 */
function writeJob(
job
){

try{

if(
!job
){
localStorage.removeItem(
JOB_KEY
);
return;
}

localStorage.setItem(
JOB_KEY,
JSON.stringify(
job
)
);

}catch{
/* ignore */
}

}

/**
 * @param {object} patch
 * @returns {object|null}
 */
function patchJob(
patch
){

const job =
readAlgoOptimizeUniverseJob();

if(
!job
){
return null;
}

const next =
{
...job,
...patch
};

writeJob(
next
);
return next;

}

export function isAlgoOptimizeUniverseJobRunning(){

return readAlgoOptimizeUniverseJob()?.status ===
"running";

}

/**
 * @returns {"st1"|"st2"|"st3"|null}
 */
export function getAlgoOptimizeUniverseJobStrategy(){

const job =
readAlgoOptimizeUniverseJob();

return job?.status ===
"running"
? normalizeStrategyId(
job.strategyId
)
: null;

}

/**
 * @param {number} gen
 * @returns {boolean}
 */
function isJobCancelled(
gen
){

const job =
readAlgoOptimizeUniverseJob();

return (
!job ||
job.gen !==
gen ||
job.status !==
"running"
);

}

function discardStaleJob(){

const job =
readAlgoOptimizeUniverseJob();

if(
job?.status !==
"running"
){
return;
}

const beat =
Number(
job.beatAt
) ||
Number(
job.startedAt
) ||
0;

if(
beat &&
Date.now() -
beat >
STALE_JOB_MS
){
writeJob(
null
);
}

}

/**
 * @param {string} strategyId
 * @param {{ rows: object[], done: number, total: number, tf: string, statsMode: string, partial?: boolean }} payload
 */
function persistRows(
strategyId,
payload
){

saveOptimizeUniverseResult(
strategyId,
payload
);

}

/**
 * @param {{
 *   strategyId: string,
 *   tf: string,
 *   statsMode: string,
 *   tradeOpts: object
 * }} params
 * @returns {number} gen
 */
export function startAlgoOptimizeUniverseJob(
params
){

const strategyId =
normalizeStrategyId(
params?.strategyId
);
const settingsKey =
pattern12SettingsCacheKey(
params?.tradeOpts?.patternSettings
);
const gen =
Date.now();

writeJob(
{
status:
"running",
gen,
strategyId,
exchangeId:
activeExchange(),
tf:
String(
params?.tf ||
""
),
statsMode:
String(
params?.statsMode ||
"direct"
),
tradeOpts:
params?.tradeOpts &&
typeof params.tradeOpts ===
"object"
? params.tradeOpts
: {},
settingsKey,
done:
0,
total:
0,
startedAt:
gen,
beatAt:
gen,
error:
null
}
);

/* Новый запуск считает всё заново — старые строки не подмешиваем. */
persistRows(
strategyId,
{
rows:
[],
done:
0,
total:
0,
tf:
String(
params?.tf ||
""
),
statsMode:
String(
params?.statsMode ||
"direct"
),
settingsKey,
partial:
true
}
);

dispatchUpdate(
{
type:
"started",
strategyId
}
);

void executeJob(
gen
);

return gen;

}

export function stopAlgoOptimizeUniverseJob(){

const job =
readAlgoOptimizeUniverseJob();

if(
!job
){
return;
}

writeJob(
null
);
localRunnerActive =
false;
localRunnerGen =
0;

dispatchUpdate(
{
type:
"stopped",
strategyId:
normalizeStrategyId(
job.strategyId
)
}
);

}

/**
 * @param {number} gen
 */
async function executeJob(
gen
){

if(
localRunnerActive
){
return;
}

const job =
readAlgoOptimizeUniverseJob();

if(
!job ||
job.gen !==
gen ||
job.status !==
"running"
){
return;
}

/* Биржу переключили — результаты живут в другом бакете, джобу бросаем. */
if(
job.exchangeId &&
job.exchangeId !==
activeExchange()
){
writeJob(
null
);

dispatchUpdate(
{
type:
"stopped",
strategyId:
normalizeStrategyId(
job.strategyId
)
}
);

return;
}

const strategyId =
normalizeStrategyId(
job.strategyId
);
const tf =
String(
job.tf ||
""
);
const statsMode =
String(
job.statsMode ||
"direct"
);
const settingsKey =
String(
job.settingsKey ||
pattern12SettingsCacheKey(
job.tradeOpts?.patternSettings
)
);
const seedRows =
loadOptimizeUniverseResult(
strategyId,
settingsKey
)?.rows ||
[];

localRunnerGen =
gen;
localRunnerActive =
true;
lastPersistAt =
0;

/* Проверка отмены читает localStorage — троттлим, её спрашивают очень часто. */
let cancelledCache =
false;
let cancelCheckAt =
0;

const signal =
{
get cancelled(){

if(
cancelledCache
){
return true;
}

const now =
Date.now();

if(
now -
cancelCheckAt <
400
){
return false;
}

cancelCheckAt =
now;
cancelledCache =
isJobCancelled(
gen
);
return cancelledCache;

}
};

try{

const runUniverseScan =
await loadScanner();

const result =
await runUniverseScan(
{
strategyId,
tf,
statsMode,
tradeOpts:
job.tradeOpts ||
{},
signal,
seedRows,
onProgress(
{
done,
total,
rows
}
){

if(
localRunnerGen !==
gen
){
return;
}

const now =
Date.now();

patchJob(
{
done,
total,
beatAt:
now
}
);

if(
now -
lastPersistAt >=
PERSIST_THROTTLE_MS
){
lastPersistAt =
now;
persistRows(
strategyId,
{
rows,
done,
total,
tf,
statsMode,
settingsKey,
partial:
true
}
);
}

dispatchUpdate(
{
type:
"progress",
strategyId,
tf,
done,
total,
rows
}
);

}
}
);

const cancelled =
!!result.cancelled;

/* Успели перезапустить подбор — не перетираем свежие строки старым прогоном. */
if(
localRunnerGen !==
gen
){
return;
}

persistRows(
strategyId,
{
rows:
result.rows,
done:
result.done,
total:
result.total,
tf:
result.tf,
statsMode:
result.statsMode,
settingsKey,
partial:
cancelled
}
);

if(
!cancelled
){
writeJob(
null
);
}

dispatchUpdate(
{
type:
cancelled
? "stopped"
: "finished",
strategyId,
tf:
result.tf,
done:
result.done,
total:
result.total,
rows:
result.rows
}
);

}catch(
err
){

console.warn(
"[algo-optimize-universe-bg]",
err
);

if(
localRunnerGen !==
gen
){
return;
}

patchJob(
{
status:
"error",
error:
err?.message ||
String(
err
),
beatAt:
Date.now()
}
);

dispatchUpdate(
{
type:
"error",
strategyId,
message:
err?.message ||
String(
err
)
}
);

writeJob(
null
);

}finally{

if(
localRunnerGen ===
gen
){
localRunnerActive =
false;
}

}

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
resumeAlgoOptimizeUniverseJob();
}

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

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{

if(
isAlgoOptimizeUniverseJobRunning()
){
stopAlgoOptimizeUniverseJob();
}

}
);

}

export function resumeAlgoOptimizeUniverseJob(){

if(
!isDesktopShell()
){
return;
}

bindVisibilitySync();
bindExchangeSync();
discardStaleJob();

const job =
readAlgoOptimizeUniverseJob();

if(
job?.status ===
"running" &&
!localRunnerActive
){
void executeJob(
job.gen
);
}

}
