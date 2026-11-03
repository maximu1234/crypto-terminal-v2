/**
 * MACD 12/26/9 EMA, как индикатор Терминала.
 * Тик той же свечи меняет только последнюю точку.
 */

const FAST = 12;
const SLOW = 26;
const SIGNAL = 9;

function emaSeries(
values,
period
){

const out =
new Array(values.length).fill(NaN);
let start = -1;

for(let i = 0; i < values.length; i++){

if(Number.isFinite(values[i])){
start = i;
break;
}

}

const k = 2 / (period + 1);

if(
start < 0 ||
start + period > values.length
){
return { out, k };
}

let sum = 0;

for(let i = start; i < start + period; i++){

if(!Number.isFinite(values[i])){
return { out, k };
}

sum += values[i];

}

let ema = sum / period;

out[start + period - 1] = ema;

for(let i = start + period; i < values.length; i++){

const value = values[i];

if(!Number.isFinite(value)){
continue;
}

ema = (value - ema) * k + ema;
out[i] = ema;

}

return { out, k };

}

export function rollMacd(
candles
){

const count = candles?.length || 0;
const close =
(candles || []).map(bar=>Number(bar.close));
const fast = emaSeries(close, FAST);
const slow = emaSeries(close, SLOW);
const macd = close.map((_, index)=>{

const a = fast.out[index];
const b = slow.out[index];

return Number.isFinite(a) && Number.isFinite(b)
? a - b
: NaN;

});
const signal = emaSeries(macd, SIGNAL);
const hist = macd.map((value, index)=>{

const sig = signal.out[index];

return Number.isFinite(value) && Number.isFinite(sig)
? value - sig
: NaN;

});
const prev = count - 2;

return {
macd,
signal: signal.out,
hist,
kFast: fast.k,
kSlow: slow.k,
kSignal: signal.k,
fastPrev: prev >= 0 ? fast.out[prev] : NaN,
slowPrev: prev >= 0 ? slow.out[prev] : NaN,
signalPrev: prev >= 0 ? signal.out[prev] : NaN
};

}

export function macdReplaceLast(
state,
candles
){

const last = (candles?.length || 0) - 1;

if(
last < 1 ||
!Number.isFinite(state?.fastPrev) ||
!Number.isFinite(state?.slowPrev) ||
!Number.isFinite(state?.signalPrev)
){
return false;
}

const close = Number(candles[last].close);
const fast =
(close - state.fastPrev) * state.kFast + state.fastPrev;
const slow =
(close - state.slowPrev) * state.kSlow + state.slowPrev;
const macd = fast - slow;
const signal =
(macd - state.signalPrev) * state.kSignal + state.signalPrev;

state.macd[last] = macd;
state.signal[last] = signal;
state.hist[last] = macd - signal;
return true;

}
