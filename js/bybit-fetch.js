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
8000,
350 * Math.pow(
2,
attempt
)
);

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

if(
err.name === "AbortError"
){
return true;
}

return true;

}

/**
 * GET к Bybit v5 с таймаутом, backoff и сменой api host.
 * @returns {{ res: Response, json: object, base: string }}
 */
export async function fetchBybit(
pathQuery,
options = {}
){

const retries =
options.retries ??
4;
const timeoutMs =
options.timeoutMs ??
20000;
const path =
pathQuery.startsWith("/")
? pathQuery
: `/${pathQuery}`;

let lastErr = null;

for(
let basePass = 0;
basePass <
BYBIT_API_BASES.length;
basePass++
){

const base =
getBybitApiBase();
const url =
`${base}${path}`;

for(
let attempt = 0;
attempt < retries;
attempt++
){

try{

const controller =
new AbortController();
const timer =
setTimeout(
()=>controller.abort(),
timeoutMs
);

const res =
await fetch(
url,
{
signal: controller.signal,
cache: "no-store"
}
);

clearTimeout(timer);

let json = {};

try{
json =
await res.json();
}catch(parseErr){
lastErr = parseErr;

if(
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

if(
json.retCode === 0
){
void import("./bybit-network-ui.js?v=1").then(m=>{
m.clearBybitNetworkIssue();
});
return {
res,
json,
base
};
}

if(
isRetryableBybitResponse(
res,
json
)
){
lastErr =
new Error(
`Bybit ${json.retCode}: ${json.retMsg || res.status}`
);

if(
attempt <
retries - 1
){
await sleep(
backoffMs(attempt)
);
continue;
}

}else{
return {
res,
json,
base
};
}

}catch(err){

lastErr = err;

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

}

}

rotateBybitApiBase();

}

void import("./bybit-network-ui.js?v=1").then(m=>{
m.showBybitNetworkIssue(lastErr);
});

throw (
lastErr ||
new Error(
"Bybit API недоступен"
)
);

}
