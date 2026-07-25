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

/** Контракт на паузе / невалидный symbol — ретраи бесполезны. */
export function isBingxNonRetryableSymbolError(
err
){

const msg =
String(
err?.message ||
err ||
""
).toLowerCase();

return (
msg.includes(
"pause currently"
) ||
msg.includes(
"is pause"
) ||
msg.includes(
"all validted symbols"
) ||
msg.includes(
"all validated symbols"
) ||
msg.includes(
"please verify it"
)
);

}

/** Frequency / IP cooldown (часто code 100410 + unblocked after …). */
export function isBingxRateLimitError(
err
){

if(
Number(
err?.bingxCode
) ===
100410
){
return true;
}

const msg =
String(
err?.message ||
err ||
""
).toLowerCase();

return (
msg.includes(
"100410"
) ||
msg.includes(
"frequency limit"
) ||
msg.includes(
"disabled period"
) ||
msg.includes(
"too many"
) ||
msg.includes(
"too frequent"
) ||
msg.includes(
"rate limit"
) ||
msg.includes(
"requests are too frequent"
)
);

}

function parseBingxUnlockMs(
msg
){

const m =
String(
msg ||
""
).match(
/unblocked after\s+(\d{10,})/i
);

if(
!m
){
return 0;
}

const n =
Number(
m[
1
]
);

return Number.isFinite(
n
) &&
n >
0
? n
: 0;

}

function bingxRateLimitWaitMs(
err,
attempt
){

const unlock =
Number(
err?.bingxUnlockMs
) ||
parseBingxUnlockMs(
err?.message
);
const now =
Date.now();

if(
unlock >
now
){
return Math.min(
Math.max(
unlock -
now +
250,
800
),
30_000
);
}

return Math.min(
1500 *
(
attempt +
1
),
8_000
);

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

const code =
Number(
json?.code
);

if(
code !==
0
){
const err =
new Error(
json?.msg ||
`BingX code ${json?.code}`
);

err.bingxCode =
code;

if(
code ===
100410
){
err.bingxUnlockMs =
parseBingxUnlockMs(
json?.msg
);
}

throw err;
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
isBingxNonRetryableSymbolError(
err
)
){
break;
}

if(
isBingxRateLimitError(
err
)
){
await sleep(
bingxRateLimitWaitMs(
err,
attempt
)
);
continue;
}

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
