/**
 * Live kline append for the Algo chart.
 * Split from js/algo-trading.js — поведение 1:1.
 */
export function mergeLiveCandle(
candles,
candle,
maxLen
){

if(
!candles.length
){
candles.push(
candle
);
return true;
}

const last =
candles[
candles.length -
1
];

if(
candle.time ===
last.time
){
candles[
candles.length -
1
] =
candle;
return true;
}

if(
candle.time >
last.time
){
candles.push(
candle
);

if(
maxLen &&
candles.length >
maxLen
){
candles.shift();
}

return true;
}

return false;

}
