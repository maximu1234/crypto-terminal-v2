/**
 * Магнит к хаю/лою свечи под вертикалью курсора (Cmd при placement).
 */

export function findCandleNearestTime(
candles,
time
){

if(
!candles?.length
){
return null;
}

const t =
typeof time ===
"number"
? time
:null;

if(
t ==
null
){
return null;
}

if(
t <=
candles[
0
].time
){
return candles[
0
];
}

const lastIdx =
candles.length -
1;

if(
t >=
candles[
lastIdx
].time
){
return candles[
lastIdx
];
}

let lo =
0;
let hi =
lastIdx;

while(
lo +
1 <
hi
){

const mid =
(lo + hi) >>
1;

if(
candles[
mid
].time <=
t
){
lo = mid;
}else{
hi = mid;
}

}

const left =
candles[
lo
];
const right =
candles[
lo + 1
];

return (
t - left.time
) <= (
right.time - t
)
? left
:right;

}

export function snapPlotToCandleWick({

plotX,
plotY,
candles,
timeFromX,
xFromTime,
priceToPlotY

}){

if(
!Number.isFinite(
plotX
) ||
!Number.isFinite(
plotY
)
){
return null;
}

if(
!candles?.length ||
typeof timeFromX !==
"function" ||
typeof priceToPlotY !==
"function"
){
return null;
}

const time =
timeFromX(
plotX
);

const candle =
findCandleNearestTime(
candles,
time
);

if(
!candle
){
return null;
}

const high =
candle.high;
const low =
candle.low;

if(
!Number.isFinite(
high
) ||
!Number.isFinite(
low
)
){
return null;
}

const highY =
priceToPlotY(
high
);
const lowY =
priceToPlotY(
low
);

if(
highY ==
null ||
lowY ==
null ||
!Number.isFinite(
highY
) ||
!Number.isFinite(
lowY
)
){
return null;
}

const useHigh =
Math.abs(
plotY - highY
) <=
Math.abs(
plotY - lowY
);

const snapY =
useHigh
? highY
:lowY;

const snapPrice =
useHigh
? high
:low;

let snapX =
typeof xFromTime ===
"function"
? xFromTime(
candle.time
)
:plotX;

if(
snapX ==
null ||
!Number.isFinite(
snapX
)
){
snapX = plotX;
}

return {
x: snapX,
y: snapY,
time: candle.time,
price: snapPrice
};

}
