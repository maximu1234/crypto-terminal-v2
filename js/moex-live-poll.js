/**
 * MOEX ISS без публичного сокета. Один poll на все видимые подписки.
 */
import {
toMoexSymbol
} from "./exchanges/symbol.js?v=2";

import {
liveBarPeriodSec
} from "./chart/live-bar-roll.js?v=6";

export const MOEX_POLL_MS =
8000;

export function moexLastPriceBySymbol(
instruments
){

const map =
new Map();

for(
const item of instruments ||
[]
){

const sym =
toMoexSymbol(
item?.symbol
);
const last =
Number(
item?.last
);

if(
!sym ||
!Number.isFinite(
last
) ||
last <=
0
){
continue;
}

map.set(
sym,
last
);

}

return map;

}

export function moexLiveCandle(
price,
tf,
nowMs =
Date.now()
){

const period =
liveBarPeriodSec(
tf
);
const time =
Math.floor(
nowMs /
1000 /
period
) *
period;

return {
time,
open: price,
high: price,
low: price,
close: price,
mergeLast: true
};

}

export function createMoexLivePoll(
{
refresh
}
){

/** @type {Map<string, Set<Function>>} */
const tickers =
new Map();

/** @type {Map<string, Map<string, Set<Function>>>} */
const klines =
new Map();

let timer =
null;
let inflight =
false;

function hasSubscribers(){

if(
tickers.size
){
return true;
}

for(
const byTf of klines.values()
){

if(
byTf.size
){
return true;
}

}

return false;

}

function stopIfIdle(){

if(
hasSubscribers() ||
!timer
){
return;
}

clearInterval(
timer
);
timer =
null;

}

function ensure(){

if(
timer ||
typeof window ===
"undefined"
){
return;
}

timer =
setInterval(
()=>{
void poll();
},
MOEX_POLL_MS
);

}

async function poll(){

if(
inflight ||
!hasSubscribers()
){
return;
}

if(
typeof document !==
"undefined" &&
document.hidden
){
return;
}

inflight =
true;

try{

const instruments =
await refresh();
const prices =
moexLastPriceBySymbol(
instruments
);

for(
const [
sym,
set
] of tickers
){

const last =
prices.get(
sym
);

if(
last ==
null
){
continue;
}

const tick =
{
lastPrice: last,
markPrice: last
};

set.forEach(
fn=>{
try{
fn(
tick
);
}catch{
/* listener */
}
}
);

}

for(
const [
sym,
byTf
] of klines
){

const last =
prices.get(
sym
);

if(
last ==
null
){
continue;
}

for(
const [
tf,
set
] of byTf
){

const candle =
moexLiveCandle(
last,
tf
);

set.forEach(
fn=>{
try{
fn(
candle
);
}catch{
/* listener */
}
}
);

}

}

}catch(
err
){
console.warn(
"moex poll:",
err
);
}finally{
inflight =
false;
}

}

function subscribeTicker(
symbol,
onTick
){

const sym =
toMoexSymbol(
symbol
);

if(
!sym ||
typeof onTick !==
"function"
){
return ()=>{};
}

if(
!tickers.has(
sym
)
){
tickers.set(
sym,
new Set()
);
}

tickers.get(
sym
).add(
onTick
);
ensure();
void poll();

return ()=>{

const set =
tickers.get(
sym
);
set?.delete(
onTick
);

if(
set &&
!set.size
){
tickers.delete(
sym
);
}

stopIfIdle();

};

}

function subscribeKline(
symbol,
tf,
onCandle
){

const sym =
toMoexSymbol(
symbol
);
const frame =
String(
tf ||
""
);

if(
!sym ||
!frame ||
typeof onCandle !==
"function"
){
return ()=>{};
}

if(
!klines.has(
sym
)
){
klines.set(
sym,
new Map()
);
}

const byTf =
klines.get(
sym
);

if(
!byTf.has(
frame
)
){
byTf.set(
frame,
new Set()
);
}

byTf.get(
frame
).add(
onCandle
);
ensure();
void poll();

return ()=>{

const set =
byTf.get(
frame
);
set?.delete(
onCandle
);

if(
set &&
!set.size
){
byTf.delete(
frame
);
}

if(
!byTf.size
){
klines.delete(
sym
);
}

stopIfIdle();

};

}

return {
subscribeTicker,
subscribeKline,
poll
};

}

const moexPoll =
createMoexLivePoll(
{
refresh: async ()=>{

const {
refreshMoexMarketdata
} =
await import(
"./exchanges/moex/public.js?v=5"
);

return refreshMoexMarketdata();

}
}
);

export function subscribeMoexTicker(
symbol,
onTick
){

return moexPoll.subscribeTicker(
symbol,
onTick
);

}

export function subscribeMoexKline(
symbol,
tf,
onCandle
){

return moexPoll.subscribeKline(
symbol,
tf,
onCandle
);

}
