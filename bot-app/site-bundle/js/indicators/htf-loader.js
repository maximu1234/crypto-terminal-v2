/**
 * Кеш HTF-свечей для индикаторов с request.security-подобной логикой.
 */
const cache =
new Map();

function tfPeriodSec(
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
null
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

const key =
`${sym}|${timeframe}`;

const existing =
cache.get(
key
);

let candles =
null;

if(
existing?.candles
){
candles =
existing.candles;
}else if(
existing?.promise
){
candles =
await existing.promise;
}else{

const entry =
{
candles:
null,
promise:
null
};

entry.promise =
loadHistory(
sym,
timeframe
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
