/**
 * Awesome Oscillator: SMA(hl2, 5) − SMA(hl2, 34).
 * Тик той же свечи меняет только последний столбец.
 */

const FAST = 5;
const SLOW = 34;

function sma(
values,
period,
end
){

let sum = 0;

for(let i = end - period + 1; i <= end; i++){
sum += values[i];
}

return sum / period;

}

export function rollAo(
candles
){

const count = candles?.length || 0;
const hl2 =
(candles || []).map(bar=>
(Number(bar.high) + Number(bar.low)) / 2
);
const values = new Array(count).fill(NaN);

for(let i = SLOW - 1; i < count; i++){
values[i] = sma(hl2, FAST, i) - sma(hl2, SLOW, i);
}

const last = count - 1;
let fastSumBefore = NaN;
let slowSumBefore = NaN;

if(last >= SLOW - 1){

fastSumBefore = 0;
slowSumBefore = 0;

for(let i = last - FAST + 1; i < last; i++){
fastSumBefore += hl2[i];
}

for(let i = last - SLOW + 1; i < last; i++){
slowSumBefore += hl2[i];
}

}

return {
values,
fastSumBefore,
slowSumBefore
};

}

export function aoReplaceLast(
state,
candles
){

const last = (candles?.length || 0) - 1;

if(
last < 1 ||
!Number.isFinite(state?.fastSumBefore) ||
!Number.isFinite(state?.slowSumBefore)
){
return false;
}

const bar = candles[last];
const hl2 = (Number(bar.high) + Number(bar.low)) / 2;

state.values[last] =
(state.fastSumBefore + hl2) / FAST -
(state.slowSumBefore + hl2) / SLOW;
return true;

}
