/**
 * RSI(close, 14) Уайлдера — та же формула, что calculateRSI в indicators.js.
 * На тике пересчитывается только последняя точка.
 */

const EPS =
1e-10;

function rsiFromAvgs(
avgGain,
avgLoss
){

const rs =
avgGain / (avgLoss || EPS);

return (
100 -
100 / (1 + rs)
);

}

function stepAvg(
avg,
value,
period
){

return (
avg * (period - 1) + value
) / period;

}

export function rollRsi(
candles,
period = 14
){

const points =
(candles || []).map(candle=>({
time: candle.time
}));

if(
!candles ||
candles.length < period + 1
){
return {
points,
avgGainBefore: 0,
avgLossBefore: 0,
avgGain: 0,
avgLoss: 0,
period,
ready: false
};
}

let gains = 0;
let losses = 0;

for(
let i = 1;
i <= period;
i++
){

const diff =
candles[i].close -
candles[i - 1].close;

if(diff >= 0){
gains += diff;
}else{
losses += Math.abs(diff);
}

}

let avgGain =
gains / period;
let avgLoss =
losses / period;

points[period].value =
rsiFromAvgs(avgGain, avgLoss);

let avgGainBefore =
avgGain;
let avgLossBefore =
avgLoss;

for(
let i = period + 1;
i < candles.length;
i++
){

avgGainBefore = avgGain;
avgLossBefore = avgLoss;

const diff =
candles[i].close -
candles[i - 1].close;
const gain =
diff > 0 ? diff : 0;
const loss =
diff < 0 ? Math.abs(diff) : 0;

avgGain =
stepAvg(avgGain, gain, period);
avgLoss =
stepAvg(avgLoss, loss, period);
points[i].value =
rsiFromAvgs(avgGain, avgLoss);

}

return {
points,
avgGainBefore,
avgLossBefore,
avgGain,
avgLoss,
period,
ready: true
};

}

/** Тот же бар, другой close. История средних до этой свечи не меняется. */
export function rsiReplaceLast(
state,
candles
){

if(
!state?.ready ||
!candles?.length
){
return state;
}

const last =
candles.length - 1;

if(
last !== state.points.length - 1 ||
last === state.period
){
const next =
rollRsi(candles, state.period);
next.changed =
next.points[last]?.value !==
state.points[last]?.value;
return next;
}

const diff =
candles[last].close -
candles[last - 1].close;
const gain =
diff > 0 ? diff : 0;
const loss =
diff < 0 ? Math.abs(diff) : 0;
const avgGain =
stepAvg(
state.avgGainBefore,
gain,
state.period
);
const avgLoss =
stepAvg(
state.avgLossBefore,
loss,
state.period
);
const value =
rsiFromAvgs(avgGain, avgLoss);
const prev =
state.points[last]?.value;

state.points[last] = {
time: candles[last].time,
value
};
state.avgGain = avgGain;
state.avgLoss = avgLoss;
state.changed = value !== prev;

return state;

}
