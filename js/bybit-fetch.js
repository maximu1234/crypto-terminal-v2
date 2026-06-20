import {
normalizeAlertWorkerBaseUrl
} from "./alert-worker-url.js?v=1";

import {
getBybitRouteMode,
BYBIT_ROUTE_DIRECT,
BYBIT_ROUTE_PROXY
} from "./bybit-route-pref.js?v=1";

/** Публичные REST API Bybit (зеркало — запас при блокировках DNS/региона). */
export const BYBIT_API_BASES = [
"https://api.bybit.com",
"https://api.bytick.com"
];

export const BYBIT_WS_URLS = [
"wss://stream.bybit.com/v5/public/linear",
"wss://stream.bytick.com/v5/public/linear"
];

const DIRECT_OK_KEY = "bybit_direct_ok";
const DIRECT_BAD_KEY = "bybit_direct_bad";

let activeApiBaseIndex = 0;
let activeWsIndex = 0;

let cachedWorkerProxyBase;
let workerProxyConfigPromise = null;

function sleep(ms){
return new Promise(resolve=>setTimeout(resolve, ms));
}

function backoffMs(attempt){

return Math.min(
6000,
300 * Math.pow(
2,
attempt
)
);

}

function normalizePath(pathQuery){

return pathQuery.startsWith("/")
? pathQuery
: `/${pathQuery}`;

}

/** localhost / 127.0.0.1 — dev-server.py прокси /api/bybit, не Railway. */
export function isLocalDevHost(){

if(
typeof location ===
"undefined"
){
return false;
}

if(
location.protocol ===
"multichart:"
){
return false;
}

if(
window.cryptoTerminalDesktop?.isDesktop
){
return false;
}

const host =
location.hostname;

return (
host ===
"localhost" ||
host ===
"127.0.0.1" ||
host ===
"[::1]"
);

}

function localBybitProxyUrl(
encodedPath
){

return `/api/bybit?path=${encodedPath}`;

}

function isChromiumBrowser(){

const ua =
navigator.userAgent || "";

if(
/Firefox/i.test(ua)
){
return false;
}

if(
/iPhone|iPad|iPod/i.test(ua)
){
return false;
}

return /Chrome|Chromium|CriOS|YaBrowser|Edg\/|OPR\/|Brave/i.test(ua);

}

function shouldSkipDirectBybit(){

const mode =
getBybitRouteMode();

if(
mode === BYBIT_ROUTE_DIRECT
){
return false;
}

if(
mode === BYBIT_ROUTE_PROXY
){
return true;
}

if(
!isChromiumBrowser()
){
return false;
}

try{

if(
sessionStorage.getItem(DIRECT_OK_KEY) === "1"
){
return false;
}

if(
sessionStorage.getItem(DIRECT_BAD_KEY) === "1"
){
return true;
}

}catch{
/* ignore */
}

return true;

}

function prefersBybitWorkerProxy(){

const mode =
getBybitRouteMode();

if(
mode === BYBIT_ROUTE_PROXY
){
return true;
}

if(
mode === BYBIT_ROUTE_DIRECT
){
return false;
}

return shouldSkipDirectBybit();

}

function noteDirectBybitOk(){

if(
!isChromiumBrowser()
){
return;
}

try{

sessionStorage.setItem(
DIRECT_OK_KEY,
"1"
);
sessionStorage.removeItem(DIRECT_BAD_KEY);

}catch{
/* ignore */
}

}

function noteDirectBybitBad(){

if(
!isChromiumBrowser()
){
return;
}

try{

sessionStorage.setItem(
DIRECT_BAD_KEY,
"1"
);

}catch{
/* ignore */
}

}

export function getBybitApiBase(){

return BYBIT_API_BASES[
activeApiBaseIndex
] ||
BYBIT_API_BASES[0];

}

export function getBybitWsUrl(){

return BYBIT_WS_URLS[
activeWsIndex
] ||
BYBIT_WS_URLS[0];

}

export function rotateBybitApiBase(){

activeApiBaseIndex =
(
activeApiBaseIndex + 1
) %
BYBIT_API_BASES.length;

}

export function rotateBybitWsEndpoint(){

activeWsIndex =
(
activeWsIndex + 1
) %
BYBIT_WS_URLS.length;

}

export function resetBybitEndpoints(){

activeApiBaseIndex = 0;
activeWsIndex = 0;

try{
sessionStorage.removeItem(DIRECT_BAD_KEY);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
"bybit-ws-reset"
)
);

}

function loadWorkerProxyBaseFromEnv(){

return import("./supabase-env.js?v=5")
.then(env=>{
return normalizeAlertWorkerBaseUrl(
env.ALERT_WORKER_URL
);
})
.catch(()=>"");

}

/** Старт загрузки ALERT_WORKER_URL до первого fetchBybit. */
export function preloadBybitProxyConfig(){

if(
!workerProxyConfigPromise
){
workerProxyConfigPromise =
loadWorkerProxyBaseFromEnv();
}

return workerProxyConfigPromise;

}

/** Прогрев TLS/DNS к Railway (после preload). */
export function warmBybitWorkerProxy(){

if(
isLocalDevHost() ||
!prefersBybitWorkerProxy()
){
return;
}

void preloadBybitProxyConfig().then(base=>{

if(
!base
){
return;
}

const path =
encodeURIComponent("/v5/market/time");

fetch(
`${base}/bybit?path=${path}`,
{
cache: "no-store",
priority: "low"
}
).catch(()=>{});

});

}

function isRetryableBybitResponse(
res,
json
){

if(
res?.status === 429 ||
(
res?.status >= 500 &&
res?.status < 600
)
){
return true;
}

const code =
Number(json?.retCode);

return (
code === 10006 ||
code === 10016
);

}

function isRetryableFetchError(err){

if(!err){
return false;
}

return true;

}

function isNetworkFetchError(
err
){

const msg =
String(
err?.message ||
err ||
""
).toLowerCase();

return (
err?.name === "TypeError" ||
err?.name === "AbortError" ||
msg.includes("failed to fetch") ||
msg.includes("networkerror") ||
msg.includes("load failed") ||
msg.includes("network request failed") ||
msg.includes("timed_out") ||
msg.includes("timeout")
);

}

async function getWorkerProxyBase(){

if(
cachedWorkerProxyBase !==
undefined
){
return cachedWorkerProxyBase;
}

if(
isLocalDevHost()
){
cachedWorkerProxyBase =
"";
return "";
}

cachedWorkerProxyBase =
await preloadBybitProxyConfig();

return cachedWorkerProxyBase;

}

async function parseBybitResponse(
res
){

const text =
await res.text();

try{

return JSON.parse(text);

}catch{

const err =
new Error(
res.ok
? "ответ не JSON"
: `HTTP ${res.status}`
);

err.httpStatus = res.status;
throw err;

}

}

async function fetchOneBybitProxyUrl(
url,
pathQuery,
timeoutMs,
label
){

const controller =
new AbortController();
const timer =
setTimeout(
()=>controller.abort(),
timeoutMs
);

try{

const res =
await fetch(
url,
{
signal: controller.signal,
cache: "no-store"
}
);

clearTimeout(timer);

const json =
await parseBybitResponse(res);

if(
json.retCode === 0
){
markBybitSuccess(0);
return {
res,
json,
base: label,
proxied: true
};
}

const err =
new Error(
`Bybit ${json.retCode}: ${json.retMsg || res.status}`
);

err.retryable =
isRetryableBybitResponse(
res,
json
);

throw err;

}catch(err){

clearTimeout(timer);
throw err;

}

}

async function fetchBybitViaProxies(
pathQuery,
timeoutMs
){

const path =
normalizePath(pathQuery);
const encoded =
encodeURIComponent(path);
let lastErr = null;

if(
isLocalDevHost()
){

return fetchOneBybitProxyUrl(
localBybitProxyUrl(
encoded
),
path,
timeoutMs,
"local-dev-proxy"
);

}

const workerBase =
await getWorkerProxyBase();

if(
workerBase
){

try{

return await fetchOneBybitProxyUrl(
`${workerBase}/bybit?path=${encoded}`,
path,
timeoutMs,
"worker-proxy"
);

}catch(err){

lastErr = err;

}

}

try{

return await fetchOneBybitProxyUrl(
`/api/bybit?path=${encoded}`,
path,
timeoutMs,
"vercel-proxy"
);

}catch(err){

throw (
lastErr ||
err
);

}

}

function markBybitSuccess(baseIndex){

activeApiBaseIndex =
baseIndex;

void import("./bybit-network-ui.js?v=2").then(m=>{
m.clearBybitNetworkIssue();
});

}

function markBybitFailure(err){

void import("./bybit-network-ui.js?v=2").then(m=>{
m.showBybitNetworkIssue(err);
});

}

async function fetchOneBybitUrl(
url,
baseIndex,
timeoutMs
){

const controller =
new AbortController();
const timer =
setTimeout(
()=>controller.abort(),
timeoutMs
);

try{

const res =
await fetch(
url,
{
signal: controller.signal,
cache: "no-store"
}
);

clearTimeout(timer);

const json =
await parseBybitResponse(res);

if(
json.retCode === 0
){
noteDirectBybitOk();
markBybitSuccess(baseIndex);
return {
res,
json,
base: BYBIT_API_BASES[baseIndex]
};
}

const err =
new Error(
`Bybit ${json.retCode}: ${json.retMsg || res.status}`
);

err.retryable =
isRetryableBybitResponse(
res,
json
);

throw err;

}catch(err){

clearTimeout(timer);

if(
isNetworkFetchError(err)
){
noteDirectBybitBad();
}

throw err;

}

}

async function buildBybitRaceTasks(
path,
timeoutMs,
options = {}
){

const encoded =
encodeURIComponent(path);

if(
isLocalDevHost()
){

const tasks = [
fetchOneBybitProxyUrl(
localBybitProxyUrl(
encoded
),
path,
timeoutMs,
"local-dev-proxy"
)
];

BYBIT_API_BASES.forEach(
(base, index)=>{
tasks.push(
fetchOneBybitUrl(
`${base}${path}`,
index,
timeoutMs
)
);
}
);

return tasks;

}

const workerBase =
await getWorkerProxyBase();

const proxyOnly =
options.proxyOnly === true ||
(
workerBase &&
prefersBybitWorkerProxy()
);

if(
proxyOnly &&
workerBase
){

return [
fetchOneBybitProxyUrl(
`${workerBase}/bybit?path=${encoded}`,
path,
timeoutMs,
"worker-proxy"
)
];

}

const useWorker =
workerBase &&
prefersBybitWorkerProxy();

const tasks = [];

if(
useWorker
){

tasks.push(
fetchOneBybitProxyUrl(
`${workerBase}/bybit?path=${encoded}`,
path,
timeoutMs,
"worker-proxy"
)
);

}

const directTimeoutMs =
useWorker
? Math.min(
1800,
timeoutMs
)
: timeoutMs;

BYBIT_API_BASES.forEach(
(base, index)=>{
tasks.push(
fetchOneBybitUrl(
`${base}${path}`,
index,
directTimeoutMs
)
);
}
);

return tasks;

}

async function fetchBybitRace(
pathQuery,
options = {}
){

const path =
normalizePath(pathQuery);
const timeoutMs =
options.timeoutMs ??
10000;

const tasks =
await buildBybitRaceTasks(
path,
timeoutMs,
options
);

try{

return await Promise.any(tasks);

}catch(err){

const lastErr =
err?.errors?.[
err.errors.length - 1
] ||
err;

const tryProxies =
isNetworkFetchError(
lastErr
) ||
(
isLocalDevHost() &&
Number(
lastErr?.httpStatus
) >=
400
);

if(
tryProxies
){
try{
return await fetchBybitViaProxies(
path,
timeoutMs
);
}catch(proxyErr){
markBybitFailure(proxyErr);
throw proxyErr;
}
}

markBybitFailure(lastErr);

throw (
lastErr ||
new Error(
"Bybit API недоступен"
)
);

}

}

async function fetchBybitSequential(
pathQuery,
options = {}
){

const retries =
options.retries ??
2;
const timeoutMs =
options.timeoutMs ??
10000;
const path =
normalizePath(pathQuery);

let lastErr = null;

if(
isLocalDevHost()
){

try{

const tasks =
await buildBybitRaceTasks(
path,
timeoutMs,
options
);

return await Promise.any(
tasks
);

}catch(
err
){

lastErr =
err?.errors?.[
err.errors.length - 1
] ||
err;

}

}

if(
prefersBybitWorkerProxy() &&
!isLocalDevHost()
){

const workerBase =
await getWorkerProxyBase();

if(
workerBase
){

try{

return await fetchOneBybitProxyUrl(
`${workerBase}/bybit?path=${encodeURIComponent(path)}`,
path,
timeoutMs,
"worker-proxy"
);

}catch(err){

lastErr = err;

}

}

try{
return await fetchBybitViaProxies(
path,
timeoutMs
);
}catch(proxyErr){
markBybitFailure(proxyErr);
throw proxyErr;
}

}

for(
let basePass = 0;
basePass <
BYBIT_API_BASES.length;
basePass++
){

const baseIndex =
activeApiBaseIndex;
const url =
`${getBybitApiBase()}${path}`;

for(
let attempt = 0;
attempt < retries;
attempt++
){

try{

return await fetchOneBybitUrl(
url,
baseIndex,
timeoutMs
);

}catch(err){

lastErr = err;

if(
err?.retryable &&
attempt <
retries - 1
){
await sleep(
backoffMs(attempt)
);
continue;
}

if(
isRetryableFetchError(err) &&
attempt <
retries - 1
){
await sleep(
backoffMs(attempt)
);
continue;
}

break;

}

}

rotateBybitApiBase();

}

if(
isNetworkFetchError(lastErr)
){
try{
return await fetchBybitViaProxies(
path,
timeoutMs
);
}catch(proxyErr){
markBybitFailure(proxyErr);
throw proxyErr;
}
}

markBybitFailure(lastErr);

throw (
lastErr ||
new Error(
"Bybit API недоступен"
)
);

}

/**
 * Один HTTP-запрос на path — для массовой статистики (без Promise.any / triple race).
 */
export async function fetchBybitBulk(
pathQuery,
options = {}
){

const timeoutMs =
options.timeoutMs ??
12000;
const path =
normalizePath(
pathQuery
);
const encoded =
encodeURIComponent(
path
);

let lastErr =
null;

if(
isLocalDevHost()
){

return fetchOneBybitProxyUrl(
localBybitProxyUrl(
encoded
),
path,
timeoutMs,
"local-dev-proxy"
);

}

try{

return await fetchOneBybitProxyUrl(
`/api/bybit?path=${encoded}`,
path,
timeoutMs,
"vercel-proxy"
);

}catch(
err
){

lastErr =
err;

}

if(
!shouldSkipDirectBybit()
){

for(
let attempt =
0;
attempt <
2;
attempt++
){

try{

return await fetchOneBybitUrl(
`${getBybitApiBase()}${path}`,
activeApiBaseIndex,
timeoutMs
);

}catch(
err
){

lastErr =
err;

if(
attempt <
1
){
await sleep(
250
);
}

}

}

}

const workerBase =
await getWorkerProxyBase();

if(
workerBase
){

try{

return await fetchOneBybitProxyUrl(
`${workerBase}/bybit?path=${encoded}`,
path,
timeoutMs,
"worker-proxy"
);

}catch(
err
){

lastErr =
err;

}

}

throw (
lastErr ||
new Error(
"Bybit API недоступен"
)
);

}

export async function fetchBybit(
pathQuery,
options = {}
){

if(
options.sequential === true
){
return fetchBybitSequential(
pathQuery,
options
);
}

return fetchBybitRace(
pathQuery,
options
);

}

if(
typeof window !== "undefined"
){

window.addEventListener(
"bybit-route-changed",
()=>{
resetBybitEndpoints();
}
);

}
