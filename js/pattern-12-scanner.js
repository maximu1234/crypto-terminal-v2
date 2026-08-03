/**
 * Эксперимент: фоновый поиск паттерна 1-2 1-2.
 * Настройки индикатора — снимок из Терминала (`chart_indicators_v1`),
 * не prefs Скрипта. На график индикатор не пишет — только pattern-12-math.
 */
import {
loadMarketHistory,
loadMarketSymbols,
buildMarketLists
} from "./market-api.js?v=5";

import {
PATTERN_12_ID,
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings
} from "./indicators/pattern-12-math.js?v=4";

/** Совпадает с DEFAULT_STORAGE_KEY в chart-indicators.js (Терминал / Монеты). */
export const TERMINAL_INDICATORS_STORAGE_KEY =
"chart_indicators_v1";

export const PATTERN_SCAN_LOOKBACK_BARS =
30;

export const PATTERN_SCAN_DEPTH_OPTIONS =
[
10,
30,
50,
100
];

export const PATTERN_SCAN_DEFAULT_LOOKBACK =
30;

export const PATTERN_SCAN_HISTORY_REQUESTS =
2;

export const PATTERN_SCAN_TFS =
[
"15",
"60",
"240",
"D"
];

export const PATTERN_SCAN_ALL_TFS =
[
"1",
"5",
"15",
"60",
"240",
"D",
"W"
];

export const PATTERN_SCAN_TF_LABELS =
{
"1":
"1m",
"5":
"5m",
"15":
"15m",
"60":
"1h",
"240":
"4h",
"D":
"1D",
"W":
"W"
};

export const PATTERN_SCAN_SIDE_LABELS =
{
long:
"Лонг",
short:
"Шорт"
};

const PATTERN_SCAN_TF_MS =
{
"1":
60 *
1000,
"5":
5 *
60 *
1000,
"15":
15 *
60 *
1000,
"60":
60 *
60 *
1000,
"240":
240 *
60 *
1000,
D:
24 *
60 *
60 *
1000,
W:
7 *
24 *
60 *
60 *
1000
};

/**
 * @param {string} tf
 * @returns {number}
 */
export function patternScanTfMs(
tf
){

return PATTERN_SCAN_TF_MS[
String(
tf ||
""
)
] ||
PATTERN_SCAN_TF_MS[
"5"
];

}

/**
 * Hit ещё в окне глубины поиска (по времени бара PT4).
 * @param {{ time?: number|null, tf?: string }|null} row
 * @param {number} lookbackBars
 * @param {number} [nowMs]
 */
export function isPatternScanHitFresh(
row,
lookbackBars =
PATTERN_SCAN_DEFAULT_LOOKBACK,
nowMs =
Date.now()
){

const raw =
Number(
row?.time
);

if(
!Number.isFinite(
raw
) ||
raw <=
0
){
return false;
}

const timeMs =
raw <
1e12
? raw *
1000
: raw;
const bars =
Math.max(
1,
Number(
lookbackBars
) ||
PATTERN_SCAN_DEFAULT_LOOKBACK
);
const tfMs =
patternScanTfMs(
row?.tf
);

/*
  +1 бар запас на незакрытую свечу и лаг загрузки.
*/
return (
nowMs -
timeMs
) <=
(
bars +
1
) *
tfMs;

}

export const PATTERN_SCAN_SIDE_FILTERS =
[
"both",
"long",
"short"
];

export const PATTERN_SCAN_SEARCH_SIDE_LABELS =
{
both:
"Long + Short",
long:
"Long",
short:
"Short"
};

/**
 * UI / storage: both | long | short.
 * Legacy alias: "all" → "both".
 */
export function normalizePatternScanSideFilter(
value
){

const side =
String(
value ||
"both"
).toLowerCase();

if(
side ===
"all"
){
return "both";
}

return PATTERN_SCAN_SIDE_FILTERS.includes(
side
)
? side
: "both";

}

export function matchesPatternScanSideFilter(
side,
filter =
"both"
){

const normalized =
normalizePatternScanSideFilter(
filter
);

if(
normalized ===
"both"
){
return true;
}

return String(
side ||
""
).toLowerCase() ===
normalized;

}

export function filterPatternScanRowsBySide(
rows,
filter =
"both"
){

const normalized =
normalizePatternScanSideFilter(
filter
);

if(
normalized ===
"both"
){
return Array.isArray(
rows
)
? rows.slice()
: [];
}

return (
Array.isArray(
rows
)
? rows
: []
).filter(
row=>
matchesPatternScanSideFilter(
row?.side,
normalized
)
);

}

const PATTERN_SETTINGS =
defaultPattern12Settings();

/**
 * Снимок настроек Pattern 1-2, как на Терминале (меню индикаторов).
 * @returns {ReturnType<typeof defaultPattern12Settings>}
 */
export function readTerminalPattern12Settings(){

try{
const raw =
localStorage.getItem(
TERMINAL_INDICATORS_STORAGE_KEY
);

if(
!raw
){
return defaultPattern12Settings();
}

const prefs =
JSON.parse(
raw
);
const stored =
prefs &&
typeof prefs ===
"object"
? prefs[
`settings_${PATTERN_12_ID}`
]
: null;

return normalizePattern12Settings(
stored &&
typeof stored ===
"object"
? stored
: defaultPattern12Settings()
);
}catch{
return defaultPattern12Settings();
}

}

const SCAN_CONCURRENCY =
3;

const SCAN_TASK_DELAY_MS =
40;

function delay(
ms
){

return new Promise(
resolve=>{
setTimeout(
resolve,
ms
);
}
);

}

function scanSettingsForSideFilter(
sideFilter,
baseSettings =
PATTERN_SETTINGS
){

const mode =
normalizePatternScanSideFilter(
sideFilter
);
const base =
normalizePattern12Settings(
baseSettings ||
PATTERN_SETTINGS
);

return {
...base,
patternMode:
mode ===
"both"
? "both"
: mode
};

}

export function rowMatchesPatternSideFilter(
row,
sideFilter =
"both"
){

if(
!row
){
return false;
}

return matchesPatternScanSideFilter(
row.side,
sideFilter
);

}

function patternRowKey(
symbol,
tf,
side
){

return `${symbol}:${tf}:${side}`;

}

function pickLatestDot(
dots,
minBar,
candlesLength,
side
){

let best =
null;

for(
const dot of
dots
){

if(
dot.side !==
side ||
dot.bar <
minBar ||
dot.bar >=
candlesLength
){
continue;
}

if(
!best ||
dot.bar >
best.bar
){
best =
{
bar:
dot.bar,
side:
dot.side
};
}

}

return best;

}

/**
 * Активные паттерны в окне lookbackBars от текущего бара.
 * long/short — один последний паттерн выбранной стороны;
 * both — до двух строк: последний long и последний short.
 */
export function findPattern12HitsInLookback(
candles,
lookbackBars =
PATTERN_SCAN_LOOKBACK_BARS,
sideFilter =
"both",
patternSettings =
null
){

if(
!Array.isArray(
candles
) ||
candles.length <
3
){
return [];
}

const normalizedSideFilter =
normalizePatternScanSideFilter(
sideFilter
);

const scene =
computePattern12Scene(
candles,
scanSettingsForSideFilter(
normalizedSideFilter,
patternSettings
)
);
const minBar =
Math.max(
0,
candles.length -
lookbackBars
);
const hits =
[];

function pushHit(
hit
){

if(
!hit
){
return;
}

hit.time =
candles[
hit.bar
]?.time ??
null;
hits.push(
hit
);

}

if(
normalizedSideFilter ===
"long" ||
normalizedSideFilter ===
"both"
){
pushHit(
pickLatestDot(
scene.pt4Dots,
minBar,
candles.length,
"long"
)
);
}

if(
normalizedSideFilter ===
"short" ||
normalizedSideFilter ===
"both"
){
pushHit(
pickLatestDot(
scene.pt4Dots,
minBar,
candles.length,
"short"
)
);
}

return hits;

}

export function findLatestPattern12InLookback(
candles,
lookbackBars,
sideFilter,
patternSettings =
null
){

const hits =
findPattern12HitsInLookback(
candles,
lookbackBars,
sideFilter,
patternSettings
);

if(
!hits.length
){
return null;
}

return hits.reduce(
(
best,
hit
)=>
!best ||
hit.bar >
best.bar
? hit
: best
);

}

export async function loadPatternScanSymbols(){

const list =
await loadMarketSymbols();
const lists =
buildMarketLists(
list
);

return Array.isArray(
lists.crypto
)
? lists.crypto.slice()
: [];

}

export function createPattern12Scanner(){

let running =
false;
let stopRequested =
false;
let runId =
0;

async function run(
options =
{}
){

if(
running
){
return null;
}

running =
true;
stopRequested =
false;
const token =
++runId;

let done =
0;
let total =
0;
const onProgress =
options.onProgress;
const onHit =
options.onHit;
const lookbackBars =
PATTERN_SCAN_DEPTH_OPTIONS.includes(
Number(
options.lookbackBars
)
)
? Number(
options.lookbackBars
)
: PATTERN_SCAN_DEFAULT_LOOKBACK;
const sideFilter =
normalizePatternScanSideFilter(
options.sideFilter
);
const patternSettingsSnapshot =
normalizePattern12Settings(
options.patternSettings &&
typeof options.patternSettings ===
"object"
? options.patternSettings
: readTerminalPattern12Settings()
);

onProgress?.(
{
done:
0,
total:
0,
running:
true,
phase:
"symbols"
}
);

let symbols =
[];
/** @type {{ long: string[], short: string[] }|null} */
let favoritesBySide =
null;

try{

if(
options.favoritesBySide &&
typeof options.favoritesBySide ===
"object"
){
favoritesBySide =
{
long:
Array.isArray(
options.favoritesBySide.long
)
? options.favoritesBySide.long.slice()
: [],
short:
Array.isArray(
options.favoritesBySide.short
)
? options.favoritesBySide.short.slice()
: []
};
}else{
symbols =
Array.isArray(
options.symbols
) &&
options.symbols.length
? options.symbols.slice()
: await loadPatternScanSymbols();
}

}catch(
err
){

console.error(
"[pattern-12-scanner] symbols",
err
);
symbols =
[];
favoritesBySide =
null;

}

const tfs =
Array.isArray(
options.tfs
) &&
options.tfs.length
? options.tfs
: PATTERN_SCAN_ALL_TFS.slice();

try{

const tasks =
[];

if(
favoritesBySide
){

const longSet =
new Set(
favoritesBySide.long.map(
s=>
String(
s ||
""
).trim().toUpperCase()
).filter(
Boolean
)
);
const shortSet =
new Set(
favoritesBySide.short.map(
s=>
String(
s ||
""
).trim().toUpperCase()
).filter(
Boolean
)
);
const all =
new Set(
[
...longSet,
...shortSet
]
);

for(
const symbol of all
){

const inLong =
longSet.has(
symbol
);
const inShort =
shortSet.has(
symbol
);
const taskSide =
inLong &&
inShort
? "both"
: inLong
? "long"
: "short";

for(
const tf of tfs
){
tasks.push(
{
symbol,
tf,
sideFilter:
taskSide
}
);
}

}

}else{

for(
const symbol of symbols
){

for(
const tf of tfs
){
tasks.push(
{
symbol,
tf
}
);
}

}

}

const results =
new Map();

for(
const row of
Array.isArray(
options.seedRows
)
? options.seedRows
: []
){

if(
!row?.symbol ||
!row?.tf ||
!rowMatchesPatternSideFilter(
row,
sideFilter
)
){
continue;
}

results.set(
patternRowKey(
row.symbol,
row.tf,
row.side ||
"long"
),
row
);

}

const startIndex =
Math.max(
0,
Number(
options.startIndex
) ||
0
);
done =
Math.min(
startIndex,
tasks.length
);
total =
tasks.length;
let cursor =
startIndex;

async function worker(){

while(
cursor <
tasks.length
){

if(
stopRequested ||
token !==
runId
){
return;
}

const task =
tasks[
cursor++
];
const {
symbol,
tf
} =
task;
const taskSideFilter =
normalizePatternScanSideFilter(
task.sideFilter ||
sideFilter
);

try{

const candles =
await loadMarketHistory(
symbol,
tf,
PATTERN_SCAN_HISTORY_REQUESTS,
{
parallel:
true
}
);

if(
stopRequested ||
token !==
runId
){
return;
}

const hits =
findPattern12HitsInLookback(
candles,
lookbackBars,
taskSideFilter,
patternSettingsSnapshot
);

/*
  Без этого seed/resume оставляет старый hit, если при
  повторном проходе паттерна уже нет → виджет без маркеров.
*/
const clearSides =
taskSideFilter ===
"long" ||
taskSideFilter ===
"short"
? [
taskSideFilter
]
: [
"long",
"short"
];

for(
const side of clearSides
){
results.delete(
patternRowKey(
symbol,
tf,
side
)
);
}

for(
const hit of
hits
){

const row =
{
symbol,
tf,
side:
hit.side,
bar:
hit.bar,
time:
hit.time
};

results.set(
patternRowKey(
symbol,
tf,
hit.side
),
row
);
const snapshot =
[
...results.values()
];

onHit?.(
row,
snapshot
);

}

}catch{
/* skip failed symbol/tf */
}

done++;

onProgress?.(
{
done,
total,
symbol,
tf,
running:
true
}
);

await delay(
SCAN_TASK_DELAY_MS
);

}

}

await Promise.all(
Array.from(
{
length:
SCAN_CONCURRENCY
},
()=>
worker()
)
);

const rows =
[
...results.values()
];

return rows;

}catch(
err
){

console.error(
"[pattern-12-scanner]",
err
);
return [];

}finally{

running =
false;

onProgress?.(
{
done,
total,
running:
false,
stopped:
stopRequested
}
);

}

}

function stop(){

if(
!running
){
return false;
}

stopRequested =
true;
runId++;
return true;

}

function reset(){

running =
false;
stopRequested =
false;
runId++;

}

function isRunning(){

return running;

}

return {
run,
stop,
reset,
isRunning
};

}
