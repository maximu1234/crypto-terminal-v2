/**
 * Публичный REST MOEX ISS.
 * iss.moex.com без CORS для браузера — всегда через /api/moex.
 */

export const MOEX_ISS_BASE =
"https://iss.moex.com";

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

const raw =
String(
pathQuery ||
""
).trim();

if(
!raw
){
return "/iss.json";
}

return raw.startsWith(
"/"
)
? raw
: `/${raw}`;

}

function moexProxyUrl(
pathQuery
){

const path =
normalizePath(
pathQuery
);

return `/api/moex?path=${encodeURIComponent(
path
)}`;

}

/**
 * @param {string} pathQuery
 * @param {{ timeoutMs?: number, retries?: number }} [opts]
 */
export async function fetchMoex(
pathQuery,
opts = {}
){

const timeoutMs =
Number(
opts.timeoutMs
) > 0
? Number(
opts.timeoutMs
)
: 15000;
const retries =
Number.isFinite(
Number(
opts.retries
)
)
? Math.max(
0,
Number(
opts.retries
)
)
: 1;

const url =
moexProxyUrl(
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

const ctrl =
typeof AbortController !==
"undefined"
? new AbortController()
: null;
const timer =
ctrl
? setTimeout(
()=>
ctrl.abort(),
timeoutMs
)
: null;

try{

const res =
await fetch(
url,
{
signal:
ctrl?.signal,
headers:{
Accept:
"application/json"
}
}
);

if(
timer
){
clearTimeout(
timer
);
}

if(
!res.ok
){
const text =
await res.text().catch(
()=>
""
);
const err =
new Error(
text ||
`MOEX HTTP ${res.status}`
);
err.moexStatus =
res.status;
throw err;
}

return await res.json();

}catch(
err
){

if(
timer
){
clearTimeout(
timer
);
}

lastErr =
err;

if(
attempt <
retries
){
await sleep(
400 *
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
"MOEX fetch failed"
);

}

/**
 * ISS block { columns, data } → array of objects.
 * @param {{ columns?: string[], data?: unknown[][] } | null | undefined} block
 */
export function issBlockToRows(
block
){

const columns =
Array.isArray(
block?.columns
)
? block.columns
: [];
const data =
Array.isArray(
block?.data
)
? block.data
: [];

if(
!columns.length ||
!data.length
){
return [];
}

return data.map(
row=>{

const out =
{};

for(
let i =
0;
i <
columns.length;
i++
){
out[
columns[
i
]
] =
row[
i
];
}

return out;

}
);

}

/**
 * Пагинация ISS (обычно по 100 строк).
 * @param {string} basePath path без start=, с .json
 * @param {(json: object) => unknown[]} extractRows
 * @param {{ pageSize?: number, maxPages?: number, timeoutMs?: number }} [opts]
 */
export async function fetchMoexPaged(
basePath,
extractRows,
opts = {}
){

const pageSize =
Number(
opts.pageSize
) > 0
? Number(
opts.pageSize
)
: 100;
const maxPages =
Number(
opts.maxPages
) > 0
? Number(
opts.maxPages
)
: 40;
const all =
[];

for(
let page =
0;
page <
maxPages;
page++
){

const sep =
basePath.includes(
"?"
)
? "&"
: "?";
const path =
`${basePath}${sep}start=${page * pageSize}`;
const json =
await fetchMoex(
path,
{
timeoutMs:
opts.timeoutMs,
retries:
1
}
);
const rows =
extractRows(
json
) ||
[];

if(
!rows.length
){
break;
}

all.push(
...rows
);

if(
rows.length <
pageSize
){
break;
}

}

return all;

}

export async function pingMoexPublic(){

const started =
performance.now();

try{

await fetchMoex(
"/iss/engines.json",
{
timeoutMs:
8000,
retries:
0
}
);

const publicMs =
Math.round(
performance.now() -
started
);

return {
ok:
true,
publicMs,
message:
"ISS (данные с задержкой ~15 мин)"
};

}catch(
err
){

return {
ok:
false,
publicMs:
null,
message:
String(
err?.message ||
err ||
"Нет связи с MOEX ISS"
)
};

}

}
