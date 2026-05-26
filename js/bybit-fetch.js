import {
normalizeAlertWorkerBaseUrl
} from "./alert-worker-url.js?v=1";

/** Публичные REST API Bybit (зеркало — запас при блокировках DNS/региона). */
export const BYBIT_API_BASES = [
"https://api.bybit.com",
"https://api.bytick.com"
];

export const BYBIT_WS_URLS = [
"wss://stream.bybit.com/v5/public/linear",
"wss://stream.bytick.com/v5/public/linear"
];

let activeApiBaseIndex = 0;
let activeWsIndex = 0;

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

window.dispatchEvent(
new CustomEvent(
"bybit-ws-reset"
)
);

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
msg.includes("network request failed")
);

}

let cachedWorkerProxyBase;

async function getWorkerProxyBase(){

if(
cachedWorkerProxyBase !== undefined
){
return cachedWorkerProxyBase;
}

try{

const env =
await import("./supabase-env.js?v=4");
cachedWorkerProxyBase =
normalizeAlertWorkerBaseUrl(
env.ALERT_WORKER_URL
);

}catch{

cachedWorkerProxyBase = "";

}

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

/**
 * Запасной путь: Railway worker (тот же, что для алертов), затем Vercel /api/bybit.
 * Vercel часто в регионе, где Bybit отдаёт 403 CloudFront.
 */
async function fetchBybitViaProxies(
pathQuery,
timeoutMs
){

const path =
normalizePath(pathQuery);
const encoded =
encodeURIComponent(path);
let lastErr = null;

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
await res.json();

if(
json.retCode === 0
){
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
throw err;

}

}

/**
 * Параллельно на всех хостах — кто быстрее ответил (как у биржи после «паузы»).
 */
async function fetchBybitRace(
pathQuery,
options = {}
){

const path =
normalizePath(pathQuery);
const timeoutMs =
options.timeoutMs ??
12000;

const tasks =
BYBIT_API_BASES.map(
(base, index)=>
fetchOneBybitUrl(
`${base}${path}`,
index,
timeoutMs
)
);

try{

return await Promise.any(tasks);

}catch(err){

const lastErr =
err?.errors?.[
err.errors.length - 1
] ||
err;

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

}

/**
 * По очереди — для kline, чтобы не дублировать rate limit на всех хостах сразу.
 */
async function fetchBybitSequential(
pathQuery,
options = {}
){

const retries =
options.retries ??
2;
const timeoutMs =
options.timeoutMs ??
12000;
const path =
normalizePath(pathQuery);

let lastErr = null;

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
 * GET к Bybit v5. По умолчанию — race по хостам; sequential: true — для свечей.
 */
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
