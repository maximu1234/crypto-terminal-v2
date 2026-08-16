/**
 * Состояние страницы Скрипт (фильтр + авто-настройки) — отдельно по бирже.
 */
import {
loadPatternScanResults,
savePatternScanResults
} from "./pattern-scan-results.js?v=1";

import {
PATTERN_SCAN_DEPTH_OPTIONS,
normalizePatternScanSideFilter
} from "./pattern-12-scanner.js?v=24";

import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

/** @deprecated flat prefs; migrated → by_exchange */
export const SCRIPT_PAGE_STORAGE_KEY =
"script_page_pattern_scan_v1";

export const SCRIPT_PAGE_STORAGE_BY_EXCHANGE_KEY =
"script_page_pattern_scan_by_exchange_v1";

export const SCRIPT_AUTO_PERIODS =
[
{
id:
"15m",
label:
"15 мин",
ms:
15 *
60 *
1000
},
{
id:
"1h",
label:
"1 час",
ms:
60 *
60 *
1000
},
{
id:
"6h",
label:
"6 часов",
ms:
6 *
60 *
60 *
1000
},
{
id:
"24h",
label:
"24 часа",
ms:
24 *
60 *
60 *
1000
}
];

const DEFAULT_STATE =
{
filterTf:
"all",
searchSide:
"both",
searchDepth:
30,
minTurnover24hUsdt:
20_000_000,
layout:
9,
page:
1,
favoritesOnly:
false,
favoritesLongCount:
0,
favoritesShortCount:
0,
favoritesLongFileName:
"",
favoritesShortFileName:
"",
auto:
{
active:
false,
tf:
"15",
periodId:
"1h",
nextRunAt:
0,
lastScanAt:
0
},
lastVisitedAt:
0
};

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

function prefsFromRaw(
raw
){

if(
!raw ||
typeof raw !==
"object"
){
return structuredClone(
DEFAULT_STATE
);
}

return {
filterTf:
String(
raw.filterTf ||
DEFAULT_STATE.filterTf
),
searchSide:
normalizePatternScanSideFilter(
raw.searchSide
),
searchDepth:
PATTERN_SCAN_DEPTH_OPTIONS.includes(
Number(
raw.searchDepth
)
)
? Number(
raw.searchDepth
)
: DEFAULT_STATE.searchDepth,
minTurnover24hUsdt:(
()=>{
const n =
Number(
raw.minTurnover24hUsdt
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return DEFAULT_STATE.minTurnover24hUsdt;
}

return n;
}
)(),
layout:
[
4,
6,
9
].includes(
Number(
raw.layout
)
)
? Number(
raw.layout
)
: DEFAULT_STATE.layout,
page:
Math.max(
1,
Number(
raw.page
) ||
DEFAULT_STATE.page
),
favoritesOnly:
false,
favoritesLongCount:
Math.max(
0,
Number(
raw.favoritesLongCount ??
raw.favoritesCount
) ||
0
),
favoritesShortCount:
Math.max(
0,
Number(
raw.favoritesShortCount
) ||
0
),
favoritesLongFileName:
String(
raw.favoritesLongFileName ||
(
raw.favoritesFileName
? raw.favoritesFileName
: ""
)
),
favoritesShortFileName:
String(
raw.favoritesShortFileName ||
""
),
auto:
{
active:
raw.auto?.active ===
true,
tf:
String(
raw.auto?.tf ||
DEFAULT_STATE.auto.tf
),
periodId:
SCRIPT_AUTO_PERIODS.some(
p=>
p.id ===
raw.auto?.periodId
)
? raw.auto.periodId
: DEFAULT_STATE.auto.periodId,
nextRunAt:
Number(
raw.auto?.nextRunAt
) ||
0,
lastScanAt:
Number(
raw.auto?.lastScanAt
) ||
0
},
lastVisitedAt:
Number(
raw.lastVisitedAt
) ||
0
};

}

function readByExchangeRoot(){

try{

const raw =
JSON.parse(
localStorage.getItem(
SCRIPT_PAGE_STORAGE_BY_EXCHANGE_KEY
) ||
"null"
);

if(
raw &&
typeof raw ===
"object" &&
!Array.isArray(
raw
)
){
return raw;
}

}catch{
/* ignore */
}

/* Migrate legacy flat prefs → bybit (Script historically used Bybit). */
try{

const legacy =
JSON.parse(
localStorage.getItem(
SCRIPT_PAGE_STORAGE_KEY
) ||
"null"
);

if(
legacy &&
typeof legacy ===
"object"
){

const {
rows: _legacyRows,
...prefs
} =
legacy;

const migrated =
{
bybit:
prefsFromRaw(
prefs
)
};

localStorage.setItem(
SCRIPT_PAGE_STORAGE_BY_EXCHANGE_KEY,
JSON.stringify(
migrated
)
);

/*
 * Legacy result rows belong to Bybit only.
 * Never write them into the active (possibly BingX) bucket.
 */
if(
Array.isArray(
legacy.rows
) &&
legacy.rows.length
){
const existing =
loadPatternScanResults(
"bybit"
);

if(
!existing.length
){
savePatternScanResults(
legacy.rows,
"bybit"
);
}
}

return migrated;

}

}catch{
/* ignore */
}

return {};

}

function writeByExchangeRoot(
root
){

try{
localStorage.setItem(
SCRIPT_PAGE_STORAGE_BY_EXCHANGE_KEY,
JSON.stringify(
root &&
typeof root ===
"object"
? root
: {}
)
);
}catch{
/* ignore */
}

}

export function loadScriptPageState(
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId ||
getActiveExchangeId()
);

try{

const root =
readByExchangeRoot();
const prefs =
prefsFromRaw(
root[
ex
]
);

return {
...prefs,
rows:
loadPatternScanResults(
ex
)
};

}catch{
return {
...structuredClone(
DEFAULT_STATE
),
rows:
loadPatternScanResults(
ex
)
};
}

}

export function saveScriptPageState(
state,
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId ||
getActiveExchangeId()
);

try{
savePatternScanResults(
state.rows,
ex
);

const root =
readByExchangeRoot();

root[
ex
] =
{
filterTf:
state.filterTf,
searchSide:
state.searchSide,
searchDepth:
state.searchDepth,
minTurnover24hUsdt:
state.minTurnover24hUsdt,
layout:
state.layout,
page:
state.page,
favoritesOnly:
false,
favoritesLongCount:
Math.max(
0,
Number(
state.favoritesLongCount
) ||
0
),
favoritesShortCount:
Math.max(
0,
Number(
state.favoritesShortCount
) ||
0
),
favoritesLongFileName:
String(
state.favoritesLongFileName ||
""
),
favoritesShortFileName:
String(
state.favoritesShortFileName ||
""
),
auto:
state.auto,
lastVisitedAt:
state.lastVisitedAt
};

writeByExchangeRoot(
root
);
}catch{
/* ignore */
}

}

export function periodMsById(
periodId
){

return (
SCRIPT_AUTO_PERIODS.find(
p=>
p.id ===
periodId
)?.ms ||
SCRIPT_AUTO_PERIODS[
1
].ms
);

}
