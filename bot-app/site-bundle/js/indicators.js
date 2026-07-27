export const RSI_PERIOD = 14;

/**
 * RSI (Wilder / RMA), как «RSI(close, 14)» в TradingView.
 * Первая точка — после period закрытых изменений без двойного учёта последнего движения.
 */
export function calculateRSI(
data,
period = RSI_PERIOD
){

if(
data.length <
period +
1
){
return [];

}

let gains =
0;
let losses =
0;

for(
let i =
1;
i <=
period;
i++
){

const diff =
data[i].close -
data[i - 1].close;

if(
diff >=
0
){

gains +=
diff;

}else{

losses +=
Math.abs(diff);

}

}

let avgGain =
gains /
period;

let avgLoss =
losses /
period;

const epsilon =
1e-10;

const out =
[];

const rs0 =
avgGain /
(
avgLoss ||
epsilon
);

const rsi0 =
100 -
100 /
(
1 +
rs0
);

out.push({

time:data[period].time,
value:
rsi0

});

for(
let i =
period +
1;
i <
data.length;
i++
){

const diff =
data[i].close -
data[i - 1].close;

const gain =
diff >
0
? diff
: 0;

const loss =
diff <
0
? Math.abs(diff)
: 0;

avgGain =
(
avgGain *
(
period -
1
) +
gain
) /
period;

avgLoss =
(
avgLoss *
(
period -
1
) +
loss
) /
period;

const rs =
avgGain /
(
avgLoss ||
epsilon
);

const rsi =
100 -
100 /
(
1 +
rs
);

out.push({
time:data[i].time,
value:rsi
});

}

return out;

}

/** Пустые бары в начале — те же time, что у свечей; logical range совпадает с графиком цены. */
export function alignRsiWithCandleTimes(
candles,
rsiPoints,
period = RSI_PERIOD
){

if(
!candles.length ||
!rsiPoints.length
){
return rsiPoints;
}

const pad =
[];

const lead =
Math.min(
period,
candles.length
);

for(
let i =
0;
i <
lead;
i++
){

pad.push({
time:candles[i].time
});

}

return pad.concat(
rsiPoints
);

}
