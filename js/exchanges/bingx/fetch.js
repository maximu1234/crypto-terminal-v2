/**
 * Публичный REST BingX (USDT-M swap).
 *
 * open-api.bingx.com не отдаёт CORS для браузера / Electron renderer —
 * всегда через /api/bingx (desktop local-site-server или Vercel).
 * WebSocket — напрямую (ws.js).
 */
export const BINGX_API_BASE =
"https://open-api.bingx.com";

const BINGX_WS_URL =
"wss://open-api-swap.bingx.com/swap-market";

export function getBingxWsUrl(){

return BINGX_WS_URL;

}

function sleep(
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

function normalizePath(
pathQuery
){

return pathQuery.startsWith(
"/"
)
? pathQuery
: `/${pathQuery}`;

}

function bingxProxyUrl(
pathQuery
){

const path =
normalizePath(
pathQuery
);

return `/api/bingx?path=${encodeURIComponent(
path
)}`;

}

async function fetchJson(
pathQuery,
{
timeoutMs =
12000,
retries =
2
} = {}
){

const url =
bingxProxyUrl(
pathQuery
);

let lastErr =
null;

for(
let attempt =
0;
attempt <=
retries;
attempt++
){

const controller =
new AbortController();
const timer =
setTimeout(
()=>
controller.abort(),
timeoutMs
);

try{

const res =
await fetch(
url,
{
signal:
controller.signal,
cache:
"no-store"
}
);

clearTimeout(
timer
);

if(
!res.ok
){
throw new Error(
`HTTP ${res.status}`
);
}

const json =
await res.json();

if(
json?.code !==
0 &&
json?.code !==
"0"
){
throw new Error(
json?.msg ||
`BingX code ${json?.code}`
);
}

return json;

}catch(
err
){

clearTimeout(
timer
);
lastErr =
err;

if(
attempt <
retries
){
await sleep(
300 *
(
attempt +
1
)
);
}

}

}

throw lastErr ||
new Error(
"BingX request failed"
);

}

export async function fetchBingx(
pathQuery,
options
){

return fetchJson(
pathQuery,
options
);

}

export async function pingBingxPublic(){

const started =
performance.now();

try{

await fetchJson(
"/openApi/swap/v2/server/time",
{
timeoutMs:
8000,
retries:
0
}
);

const ms =
Math.round(
performance.now() -
started
);

return {
ok:
true,
publicMs:
ms
};

}catch(
err
){

return {
ok:
false,
message:
err?.message ||
"Нет связи с BingX"
};

}

}
