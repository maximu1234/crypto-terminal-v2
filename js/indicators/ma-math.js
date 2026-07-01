/**
 * SMA / EMA по цене закрытия.
 */
export const MA_PERIODS =
[
50,
100,
200
];

export function calculateSMA(
candles,
period
){

if(
!Array.isArray(
candles
) ||
period <
1
){
return [];
}

const out =
[];

for(
let i =
0;
i <
candles.length;
i++
){

if(
i <
period -
1
){
continue;
}

let sum =
0;

for(
let j =
0;
j <
period;
j++
){
sum +=
Number(
candles[
i -
j
].close
);
}

const value =
sum /
period;

if(
!Number.isFinite(
value
)
){
continue;
}

out.push(
{
time:
candles[
i
].time,
value
}
);

}

return out;

}

export function calculateEMA(
candles,
period
){

if(
!Array.isArray(
candles
) ||
period <
1 ||
candles.length <
period
){
return [];
}

const out =
[];
const k =
2 /
(
period +
1
);

let sum =
0;

for(
let i =
0;
i <
period;
i++
){
sum +=
Number(
candles[
i
].close
);
}

let ema =
sum /
period;

out.push(
{
time:
candles[
period -
1
].time,
value:
ema
}
);

for(
let i =
period;
i <
candles.length;
i++
){

const close =
Number(
candles[
i
].close
);

ema =
close *
k +
ema *
(
1 -
k
);

if(
!Number.isFinite(
ema
)
){
continue;
}

out.push(
{
time:
candles[
i
].time,
value:
ema
}
);

}

return out;

}

export function calculateMaPoints(
candles,
period,
type
){

if(
type ===
"ema"
){
return calculateEMA(
candles,
period
);
}

return calculateSMA(
candles,
period
);

}

/** Те же logical-индексы, что у buildChartDisplayCandles (включая whitespace). */
export function alignMaPointsToDisplayCandles(
maPoints,
displayCandles
){

if(
!Array.isArray(
displayCandles
) ||
!displayCandles.length
){
return Array.isArray(
maPoints
)
? maPoints
: [];
}

const byTime =
new Map(
(
Array.isArray(
maPoints
)
? maPoints
: []
).map(
point=>[
point.time,
point.value
]
)
);

const out =
[];

for(
const bar of displayCandles
){

const time =
bar?.time;

if(
time ==
null
){
continue;
}

const value =
byTime.get(
time
);

if(
value !=
null &&
Number.isFinite(
value
)
){
out.push(
{
time,
value
}
);
}else{
out.push(
{
time
}
);
}

}

return out;

}
