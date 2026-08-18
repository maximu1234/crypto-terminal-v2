import assert from "node:assert/strict";
import test from "node:test";

import {
buildRsiSwingLogForTest,
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings
} from "../js/algo-trading/pattern-12-math.js";

import {
getOrComputeAlgoPattern12Scene,
invalidateAlgoPattern12SceneCache
} from "../js/algo-trading/pattern-12-scene-cache.js";

import {
detectPatternEntryEventsFromSetups
} from "../js/algo-trading/pattern-entry-logic.js";

import {
pattern12SettingsCacheKey
} from "../js/algo-trading/pattern-12-settings.js";

/** Рывок вверх, затем медленный дрейф вниз без ухода RSI в перепроданность. */
function rallyThenDrift(){

const rows =
[];
let price =
100;

for(
let i =
0;
i <
25;
i++
){

const open =
price;
price +=
1.5;

rows.push(
{
time:
i +
1,
open,
high:
price +
0.2,
low:
open -
0.2,
close:
price
}
);

}

for(
let i =
0;
i <
25;
i++
){

const open =
price;
price -=
0.35;

rows.push(
{
time:
26 +
i,
open,
high:
open +
0.05,
low:
price -
0.05,
close:
price
}
);

}

return rows;

}

test(
"fast confirm keeps the same extreme but confirms it earlier",
()=>{

const candles =
rallyThenDrift();
const opts =
{
overbought:
70,
oversold:
30
};

const slow =
buildRsiSwingLogForTest(
candles,
6,
opts
).log;
const fast =
buildRsiSwingLogForTest(
candles,
6,
{
...opts,
fastConfirmBars:
1
}
).log;

assert.equal(
slow.bars[
0
],
fast.bars[
0
]
);
assert.ok(
fast.confirmBars[
0
] <
slow.confirmBars[
0
]
);

}
);

test(
"fast confirm emits each extreme once",
()=>{

const fast =
buildRsiSwingLogForTest(
rallyThenDrift(),
6,
{
overbought:
70,
oversold:
30,
fastConfirmBars:
1
}
).log;

assert.equal(
new Set(
fast.bars
).size,
fast.bars.length
);

}
);

/**
 * Пила: закрытия чередуются вверх/вниз, поэтому RSI(1) даёт микро-свинги,
 * а RSI(2) на макро — редкие. Нужен только факт: fast-режим отдаёт свинги
 * раньше и их не меньше, чем в оригинальном режиме.
 */
function sawCandles(
n
){

const rows =
[];
let price =
100;

for(
let i =
0;
i <
n;
i++
){

const up =
i %
3 !==
2;

const open =
price;
price +=
up
? 2
: -1.2;

rows.push(
{
time:
i +
1,
open,
high:
Math.max(
open,
price
) +
0.4,
low:
Math.min(
open,
price
) -
0.4,
close:
price
}
);

}

return rows;

}

test(
"tempFastPt4 defaults keep original behaviour",
()=>{

const s =
normalizePattern12Settings(
{}
);

assert.equal(
s.tempFastPt4,
false
);
assert.equal(
s.tempFastPt4Bars,
2
);

}
);

test(
"tempFastPt4Bars is clamped to 1..5",
()=>{

assert.equal(
normalizePattern12Settings(
{
tempFastPt4Bars:
0
}
).tempFastPt4Bars,
1
);
assert.equal(
normalizePattern12Settings(
{
tempFastPt4Bars:
99
}
).tempFastPt4Bars,
5
);

}
);

test(
"scan settings key includes pt4 chronology and fast confirmation",
()=>{
const base =
defaultPattern12Settings();
const original =
pattern12SettingsCacheKey(
base
);

assert.notEqual(
pattern12SettingsCacheKey(
{
...base,
requirePt3ConfirmBeforePt4:
true
}
),
original
);
assert.notEqual(
pattern12SettingsCacheKey(
{
...base,
earlyPt3Confirm:
true
}
),
original
);
assert.notEqual(
pattern12SettingsCacheKey(
{
...base,
reverseLogic:
true
}
),
original
);
assert.notEqual(
pattern12SettingsCacheKey(
{
...base,
tempFastPt4:
true
}
),
original
);
assert.notEqual(
pattern12SettingsCacheKey(
{
...base,
tempFastPt4Bars:
3
}
),
original
);
}
);

test(
"persisted optimize rows are invalidated by pattern settings key",
async ()=>{
const previous =
globalThis.localStorage;
const store =
new Map();
globalThis.localStorage =
{
getItem:key=>
store.get(
key
) ??
null,
setItem:(
key,
value
)=>
store.set(
key,
String(
value
)
),
removeItem:key=>
store.delete(
key
)
};

try{
const {
loadOptimizeUniverseResult,
saveOptimizeUniverseResult
} =
await import(
"../js/algo-trading/modal-results-storage.js"
);
saveOptimizeUniverseResult(
"st1",
{
rows:[
{
symbol:
"BTCUSDT"
}
],
settingsKey:
"slow"
}
);
assert.equal(
loadOptimizeUniverseResult(
"st1",
"slow"
)?.rows.length,
1
);
assert.equal(
loadOptimizeUniverseResult(
"st1",
"fast"
),
null
);
}finally{
if(
previous ===
undefined
){
delete globalThis.localStorage;
}else{
globalThis.localStorage =
previous;
}
}
}
);

test(
"fast pt4 does not lose setups versus original confirmation",
()=>{

const candles =
sawCandles(
200
);
const base =
{
...defaultPattern12Settings(),
lngMicRsiLength:
6,
shtMicRsiLength:
6
};

const slow =
computePattern12Scene(
candles,
base
);
const fast =
computePattern12Scene(
candles,
{
...base,
tempFastPt4:
true,
tempFastPt4Bars:
1
}
);

assert.ok(
Array.isArray(
slow.setups
)
);
assert.ok(
fast.setups.length >=
slow.setups.length
);

}
);

/**
 * Детерминированная волатильная серия: в ней есть полные 1-2-3-4, а раннее
 * подтверждение микро-свинга меняет и confirm-бары, и набор готовых сетапов.
 */
function volatilePatternCandles(){
const rows =
[];
let random =
1;
let price =
100;

for(
let i =
0;
i <
800;
i++
){
random =
(
1664525 *
random +
1013904223
) >>>
0;
const open =
price;
const move =
(
random /
4294967296 -
0.5
) *
3 +
Math.sin(
i /
17
) *
0.25 +
Math.sin(
i /
53
) *
0.15;
price =
Math.max(
5,
price +
move
);
rows.push(
{
time:
i +
1,
open,
high:
Math.max(
open,
price
) +
0.4,
low:
Math.min(
open,
price
) -
0.4,
close:
price
}
);
}

return rows;
}

test(
"scene cache preserves slow/fast pt4 differences in both call orders",
()=>{
const candles =
volatilePatternCandles();
const base =
{
...defaultPattern12Settings(),
lngRsiLength:
6,
shtRsiLength:
6,
lngMicRsiLength:
3,
shtMicRsiLength:
3,
decLowsBeforePt1:
0,
ascHighsBeforePt1:
0,
waveAMode:
"both",
tempFastPt4Bars:
1
};

for(
const order of [
[
false,
true
],
[
true,
false
]
]
){
invalidateAlgoPattern12SceneCache();
const results =
new Map();

for(
const fast of order
){
const scene =
getOrComputeAlgoPattern12Scene(
candles,
{
...base,
tempFastPt4:
fast
},
"FAST-PT4-CACHE-TEST"
);
const events =
detectPatternEntryEventsFromSetups(
candles,
scene.setups,
{}
);
results.set(
fast,
{
setupCount:
scene.setups.length,
entryCount:
events.filter(
event=>
event.type ===
"entry"
).length,
confirmBars:
scene.setups.map(
setup=>
setup.b4Confirm
)
}
);
}

assert.equal(
results.get(
false
).setupCount,
11
);
assert.equal(
results.get(
true
).setupCount,
15
);
assert.equal(
results.get(
false
).entryCount,
7
);
assert.equal(
results.get(
true
).entryCount,
7
);
assert.deepEqual(
results.get(
false
).confirmBars.slice(
0,
3
),
[
186,
186,
316
]
);
assert.deepEqual(
results.get(
true
).confirmBars.slice(
0,
3
),
[
183,
183,
315
]
);
assert.notDeepEqual(
results.get(
false
).confirmBars,
results.get(
true
).confirmBars
);
}
}
);
