/**
 * Shared diary prefs + day cache (Bybit / BingX / future exchanges).
 * Past calendar days are immutable closed trades — cache them; refresh only today.
 */
import {
DIARY_PERIOD_PRESETS,
dayKeyFromMs,
endOfDayMs,
getDefaultDiaryPeriod,
msFromDayKey,
resolveDiaryPreset,
startOfDayMs
} from "./trade-diary-period.js?v=3";

const PERIOD_STORAGE_KEY =
"trade_diary_period_v1";

const DAY_CACHE_STORAGE_KEY =
"trade_diary_days_v2";

function safeParse(
raw
){

if(
!raw
){
return null;
}

try{
return JSON.parse(
raw
);
}catch{
return null;
}

}

export function listDiaryDayKeysInRange(
startMs,
endMs
){

const keys =
[];
const cursor =
new Date(
startOfDayMs(
startMs
)
);
const last =
startOfDayMs(
endMs
);

while(
cursor.getTime() <=
last
){
keys.push(
dayKeyFromMs(
cursor.getTime()
)
);
cursor.setDate(
cursor.getDate() +
1
);
}

return keys;

}

export function loadSavedDiaryPeriod(){

const parsed =
safeParse(
localStorage.getItem(
PERIOD_STORAGE_KEY
)
);

if(
!parsed ||
typeof parsed !==
"object"
){
return null;
}

const presetId =
String(
parsed.presetId ||
""
).trim();

if(
presetId &&
presetId !==
"custom" &&
DIARY_PERIOD_PRESETS.some(
p=>
p.id ===
presetId
)
){
const preset =
DIARY_PERIOD_PRESETS.find(
p=>
p.id ===
presetId
);
const range =
resolveDiaryPreset(
presetId
);

return {
presetId,
label:
preset?.label ||
"Период",
...range
};
}

const startMs =
Number(
parsed.startMs
);
const endMs =
Number(
parsed.endMs
);

if(
!Number.isFinite(
startMs
) ||
!Number.isFinite(
endMs
) ||
endMs <
startMs
){
return null;
}

return {
presetId:
presetId ||
"custom",
label:
String(
parsed.label ||
"Период"
),
startMs,
endMs
};

}

export function saveDiaryPeriod(
period
){

if(
!period
){
return;
}

const presetId =
String(
period.presetId ||
""
).trim();
const payload =
presetId &&
presetId !==
"custom" &&
DIARY_PERIOD_PRESETS.some(
p=>
p.id ===
presetId
)
? {
presetId
}
: {
presetId:
presetId ||
"custom",
label:
period.label ||
"Период",
startMs:
Number(
period.startMs
),
endMs:
Number(
period.endMs
)
};

try{
localStorage.setItem(
PERIOD_STORAGE_KEY,
JSON.stringify(
payload
)
);
}catch{
/* ignore quota */
}

}

export function resolveInitialDiaryPeriod(){

return loadSavedDiaryPeriod() ||
getDefaultDiaryPeriod();

}

function readDayCacheRoot(){

const parsed =
safeParse(
localStorage.getItem(
DAY_CACHE_STORAGE_KEY
)
);

return parsed &&
typeof parsed ===
"object"
? parsed
: {};

}

function writeDayCacheRoot(
root
){

try{
localStorage.setItem(
DAY_CACHE_STORAGE_KEY,
JSON.stringify(
root
)
);
}catch{
/* ignore quota */
}

}

function readDiaryDayBucket(
exchangeId,
dayKey
){

const ex =
String(
exchangeId ||
""
).trim();
const key =
String(
dayKey ||
""
).trim();

if(
!ex ||
!key
){
return null;
}

const bucket =
readDayCacheRoot()?.[
ex
]?.[
key
];

if(
!bucket ||
!Array.isArray(
bucket.trades
)
){
return null;
}

return {
savedAt:
Number(
bucket.savedAt
) ||
0,
trades:
bucket.trades.map(
row=>({
...row
})
)
};

}

export function readDiaryDayTrades(
exchangeId,
dayKey
){

const bucket =
readDiaryDayBucket(
exchangeId,
dayKey
);

return bucket
? bucket.trades
: null;

}

/** Start time for polling an open day (today): after last cached close or last save. */
export function resolveDiaryIncrementalFetchStartMs(
exchangeId,
dayKey,
cachedTrades
){

const dayStart =
startOfDayMs(
msFromDayKey(
dayKey
)
);

if(
Array.isArray(
cachedTrades
) &&
cachedTrades.length
){
let maxClose =
0;

for(
const trade of cachedTrades
){
const t =
Number(
trade?.closeTimeMs
);

if(
Number.isFinite(
t
) &&
t >
maxClose
){
maxClose =
t;
}

}

if(
maxClose >
0
){
return Math.max(
dayStart,
maxClose
);
}

}

const bucket =
readDiaryDayBucket(
exchangeId,
dayKey
);

if(
bucket &&
Number.isFinite(
bucket.savedAt
) &&
bucket.savedAt >
0
){
return Math.max(
dayStart,
bucket.savedAt -
60 *
1000
);
}

return dayStart;

}

export function writeDiaryDayTrades(
exchangeId,
dayKey,
trades
){

const ex =
String(
exchangeId ||
""
).trim();
const key =
String(
dayKey ||
""
).trim();

if(
!ex ||
!key
){
return;
}

const root =
readDayCacheRoot();
const byEx =
root[
ex
] &&
typeof root[
ex
] ===
"object"
? root[
ex
]
: {};

byEx[
key
] =
{
savedAt:
Date.now(),
trades:
Array.isArray(
trades
)
? trades.map(
row=>({
...row
})
)
: []
};
root[
ex
] =
byEx;
writeDayCacheRoot(
root
);

}

export function clearDiaryDayTrades(
exchangeId,
dayKeys
){

const ex =
String(
exchangeId ||
""
).trim();

if(
!ex
){
return;
}

const root =
readDayCacheRoot();
const byEx =
root[
ex
];

if(
!byEx ||
typeof byEx !==
"object"
){
return;
}

if(
!Array.isArray(
dayKeys
) ||
!dayKeys.length
){
delete root[
ex
];
}else{
for(
const dayKey of dayKeys
){
delete byEx[
dayKey
];
}
root[
ex
] =
byEx;
}

writeDayCacheRoot(
root
);

}

export function todayDiaryDayKey(){

return dayKeyFromMs(
Date.now()
);

}

export {
startOfDayMs,
endOfDayMs,
msFromDayKey,
dayKeyFromMs
};
