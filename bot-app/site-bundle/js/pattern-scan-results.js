/**
 * Сохранённые результаты скана паттерна 1-2 — отдельно по бирже.
 */
import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

export const PATTERN_SCAN_RESULTS_KEY =
"pattern_12_scan_results_v1";

export const PATTERN_SCAN_RESULTS_BY_EXCHANGE_KEY =
"pattern_12_scan_results_by_exchange_v1";

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

function readByExchangeRoot(){

try{

const raw =
JSON.parse(
localStorage.getItem(
PATTERN_SCAN_RESULTS_BY_EXCHANGE_KEY
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

/* Migrate legacy flat store → bybit (Script historically used Bybit). */
try{

const legacy =
JSON.parse(
localStorage.getItem(
PATTERN_SCAN_RESULTS_KEY
) ||
"null"
);

if(
legacy &&
Array.isArray(
legacy.rows
)
){

const migrated =
{
bybit:
{
updatedAt:
Number(
legacy.updatedAt
) ||
Date.now(),
rows:
legacy.rows
}
};

localStorage.setItem(
PATTERN_SCAN_RESULTS_BY_EXCHANGE_KEY,
JSON.stringify(
migrated
)
);

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
PATTERN_SCAN_RESULTS_BY_EXCHANGE_KEY,
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

export function loadPatternScanResults(
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId ||
getActiveExchangeId()
);

try{

const bucket =
readByExchangeRoot()[
ex
];

if(
!bucket ||
!Array.isArray(
bucket.rows
)
){
return [];
}

return bucket.rows.filter(
row=>
row &&
row.symbol &&
row.tf &&
row.side
);

}catch{
return [];
}

}

export function savePatternScanResults(
rows,
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId ||
getActiveExchangeId()
);
const root =
readByExchangeRoot();
const list =
Array.isArray(
rows
)
? rows.map(
row=>({
...row,
exchangeId:
ex
})
)
: [];

root[
ex
] =
{
updatedAt:
Date.now(),
rows:
list
};

writeByExchangeRoot(
root
);

}
