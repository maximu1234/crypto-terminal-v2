/**
 * Кеш HTF-свечей для индикаторов с request.security-подобной логикой.
 */
const cache =
new Map();

export const HTF_KLINE_PAGE_BARS =
1000;

export const HTF_LTF_REQUESTS_CAP =
13;

/** Не грузить 1m на всю 5m-историю — хватает видимого окна Терминала. */
export const HTF_LTF_CHART_BARS_CAP =
2500;

export function tfPeriodSec(
tf
){

if(
tf ===
"D"
){
return 86400;
}

if(
tf ===
"W"
){
return 604800;
}

const n =
Number(
tf
);

if(
Number.isFinite(
n
) &&
n >
0
){
return n *
60;
}

return 60;

}

/**
 * Сколько kline-страниц нужно, чтобы младший ТФ покрыл историю графика.
 * Для старшего ТФ возвращает baseRequests (0 = пусть caller возьмёт свой дефолт).
 */
export function sourceHistoryRequests(
sourceTf,
chartTf,
chartBarCount,
baseRequests =
0
){

const base =
Math.max(
0,
Math.floor(
Number(
baseRequests
) ||
0
)
);
const chartSec =
tfPeriodSec(
chartTf
);
const sourceSec =
tfPeriodSec(
sourceTf
);
const bars =
Math.min(
HTF_LTF_CHART_BARS_CAP,
Math.max(
0,
Math.floor(
Number(
chartBarCount
) ||
0
)
)
);

if(
!sourceSec ||
!chartSec ||
sourceSec >=
chartSec ||
bars <
1
){
return base;
}

const neededBars =
Math.ceil(
bars *
chartSec /
sourceSec
);
const neededRequests =
Math.ceil(
neededBars /
HTF_KLINE_PAGE_BARS
);

return Math.min(
HTF_LTF_REQUESTS_CAP,
Math.max(
base,
neededRequests
)
);

}

function htfCacheCoversRequests(
entry,
requests
){

if(
!entry?.candles?.length
){
return false;
}

if(
!(
requests >
0
)
){
return true;
}

if(
(
entry.requests ||
0
) >=
requests
){
return true;
}

return entry.candles.length >=
requests *
900;

}

function alignPeriodStart(
time,
tf
){

const period =
tfPeriodSec(
tf
);

return Math.floor(
time /
period
) *
period;

}

function aggregateChartBars(
bars,
time
){

if(
!bars.length
){
return null;
}

let high =
-Infinity;
let low =
Infinity;
let volume =
0;

for(
const bar of
bars
){

high =
Math.max(
high,
Number(
bar.high
)
);
low =
Math.min(
low,
Number(
bar.low
)
);
volume +=
Number(
bar.volume
) ||
0;

}

return {
time,
open:
Number(
bars[
0
].open
),
high,
low,
close:
Number(
bars[
bars.length -
1
].close
),
volume
};

}

/**
 * Агрегировать свечи графика в старший ТФ (без сетевой догрузки).
 * Если tf пустой или не старше периода chartTf — возвращает исходный массив.
 *
 * @param {Array} chartCandles
 * @param {string} tf
 * @param {string} [chartTf]
 * @returns {Array}
 */
export function aggregateCandlesToTf(
chartCandles,
tf,
chartTf =
""
){

const list =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const target =
String(
tf ||
""
).trim();

if(
!list.length ||
!target
){
return list;
}

const chart =
String(
chartTf ||
""
).trim();

if(
chart &&
tfPeriodSec(
target
) <=
tfPeriodSec(
chart
)
){
return list;
}

const buckets =
new Map();

for(
const bar of list
){

const time =
Number(
bar?.time
);

if(
!Number.isFinite(
time
)
){
continue;
}

const start =
alignPeriodStart(
time,
target
);
const bucket =
buckets.get(
start
);

if(
bucket
){
bucket.push(
bar
);
}else{
buckets.set(
start,
[
bar
]
);
}

}

const out =
[];

for(
const [
start,
bars
] of buckets
){

const agg =
aggregateChartBars(
bars,
start
);

if(
agg
){
out.push(
agg
);
}

}

out.sort(
(
a,
b
)=>
a.time -
b.time
);

return out;

}

/** Добавить/обновить незакрытый HTF-бар по хвосту графика (live). */
export function mergeChartTailIntoHtf(
chartCandles,
htfCandles,
tf
){

if(
!Array.isArray(
chartCandles
) ||
!chartCandles.length ||
!Array.isArray(
htfCandles
) ||
!htfCandles.length
){
return htfCandles;
}

const timeframe =
String(
tf ||
""
).trim();

const lastChart =
chartCandles[
chartCandles.length -
1
];
const lastHtf =
htfCandles[
htfCandles.length -
1
];

/* 5m-график нельзя подмешивать в 1m-серию: получится грубый бар на хвосте. */
if(
chartCandles.length >=
2
){
const chartGap =
Number(
lastChart.time
) -
Number(
chartCandles[
chartCandles.length -
2
].time
);

if(
Number.isFinite(
chartGap
) &&
chartGap >
tfPeriodSec(
timeframe
)
){
return htfCandles;
}

}

const periodStart =
alignPeriodStart(
lastChart.time,
timeframe
);

if(
periodStart <
lastHtf.time
){
return htfCandles;
}

const tail =
chartCandles.filter(
bar=>
bar.time >=
periodStart
);

const merged =
aggregateChartBars(
tail,
periodStart
);

if(
!merged
){
return htfCandles;
}

if(
periodStart ===
lastHtf.time
){

return [
...htfCandles.slice(
0,
-1
),
merged
];

}

if(
periodStart >
lastHtf.time
){

return [
...htfCandles,
merged
];

}

return htfCandles;

}

export function clearAllHtfCache(){

cache.clear();

}

export function clearHtfCache(
symbol
){

const prefix =
`${String(
symbol ||
""
).trim().toUpperCase()}|`;

for(
const key of cache.keys()
){

if(
key.startsWith(
prefix
)
){
cache.delete(
key
);

}

}

}

export async function fetchHtfCandles(
symbol,
tf,
loadHistory,
chartCandles =
null,
chartTf =
""
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const timeframe =
String(
tf ||
""
).trim();

if(
!sym ||
!timeframe ||
typeof loadHistory !==
"function"
){
return [];
}

const requests =
sourceHistoryRequests(
timeframe,
chartTf,
Array.isArray(
chartCandles
)
? chartCandles.length
: 0,
0
);

const key =
`${sym}|${timeframe}`;

const existing =
cache.get(
key
);

let candles =
null;

if(
htfCacheCoversRequests(
existing,
requests
)
){
candles =
existing.candles;
}else if(
existing?.promise
){
candles =
await existing.promise;

if(
!htfCacheCoversRequests(
existing,
requests
)
){
candles =
null;
}

}

if(
!candles
){

const entry =
{
candles:
null,
promise:
null,
requests
};

entry.promise =
(
requests >
0
? loadHistory(
sym,
timeframe,
requests
)
: loadHistory(
sym,
timeframe
)
).then(
loaded=>{

entry.candles =
Array.isArray(
loaded
)
? loaded
: [];
return entry.candles;

}).catch(
()=>{

entry.candles =
[];
return entry.candles;

});

cache.set(
key,
entry
);

candles =
await entry.promise;

}

if(
Array.isArray(
chartCandles
) &&
chartCandles.length &&
Array.isArray(
candles
) &&
candles.length
){
return mergeChartTailIntoHtf(
chartCandles,
candles,
timeframe
);
}

return Array.isArray(
candles
)
? candles
: [];

}
