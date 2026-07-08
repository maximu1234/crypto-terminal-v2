/**
 * Эксперимент: фоновый поиск паттерна 1-2 1-2 (дефолтные настройки).
 * Не трогает индикатор на графике — только читает pattern-12-math.
 */
import {
loadMarketHistory,
loadMarketSymbols,
buildMarketLists
} from "./market-api.js?v=1";

import {
computePattern12Scene,
defaultPattern12Settings
} from "./indicators/pattern-12-math.js?v=4";

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

export const PATTERN_SCAN_SIDE_FILTERS =
[
"both",
"long",
"short"
];

const PATTERN_SETTINGS =
defaultPattern12Settings();

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
sideFilter
){

const mode =
PATTERN_SCAN_SIDE_FILTERS.includes(
String(
sideFilter ||
""
)
)
? String(
sideFilter
)
: "both";

return {
...PATTERN_SETTINGS,
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

if(
sideFilter ===
"both"
){
return true;
}

return row.side ===
sideFilter;

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
"both"
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
PATTERN_SCAN_SIDE_FILTERS.includes(
String(
sideFilter ||
""
)
)
? String(
sideFilter
)
: "both";

const scene =
computePattern12Scene(
candles,
scanSettingsForSideFilter(
normalizedSideFilter
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
sideFilter
){

const hits =
findPattern12HitsInLookback(
candles,
lookbackBars,
sideFilter
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
PATTERN_SCAN_SIDE_FILTERS.includes(
String(options.sideFilter || "")
)
? String(options.sideFilter)
: "both";

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

try{

symbols =
Array.isArray(
options.symbols
) &&
options.symbols.length
? options.symbols.slice()
: await loadPatternScanSymbols();

}catch(
err
){

console.error(
"[pattern-12-scanner] symbols",
err
);
symbols =
[];

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
sideFilter
);

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
