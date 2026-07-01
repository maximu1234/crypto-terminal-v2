import {
calculateEMA
} from "./ma-math.js?v=2";

export function calculateShiftedEmaSeries(
chartCandles,
sourceCandles,
period,
shiftPercent
){

if(
!Array.isArray(
chartCandles
) ||
!chartCandles.length ||
!Array.isArray(
sourceCandles
) ||
!sourceCandles.length ||
period <
1
){
return [];
}

const emaPoints =
calculateEMA(
sourceCandles,
period
);

if(
!emaPoints.length
){
return [];
}

const emaByTime =
new Map(
emaPoints.map(
point=>[
point.time,
point.value
]
)
);

const multiplier =
1 +
Number(
shiftPercent
) /
100;

const out =
[];

let htfIdx =
0;

for(
const bar of chartCandles
){

while(
htfIdx +
1 <
sourceCandles.length &&
sourceCandles[
htfIdx +
1
].time <=
bar.time
){
htfIdx++;
}

const htfTime =
sourceCandles[
htfIdx
]?.time;

if(
htfTime ==
null ||
htfTime >
bar.time
){
continue;
}

const ema =
emaByTime.get(
htfTime
);

if(
ema ==
null ||
!Number.isFinite(
ema
)
){
continue;
}

out.push(
{
time:
bar.time,
value:
ema *
multiplier
}
);

}

return out;

}
