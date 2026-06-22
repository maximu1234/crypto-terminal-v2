/** Awesome Oscillator — fast/slow SMA of median price (hl2), как в TradingView. */
export const AO_FAST_PERIOD =
5;

export const AO_SLOW_PERIOD =
34;

export const AO_UP =
"rgba(38, 166, 154, 0.85)";

export const AO_DOWN =
"rgba(239, 68, 68, 0.85)";

function medianPrice(
bar
){

return (
Number(
bar.high
) +
Number(
bar.low
)
) /
2;

}

function smaAt(
values,
period,
endIndex
){

let sum =
0;

for(
let i =
endIndex -
period +
1;
i <=
endIndex;
i++
){
sum +=
values[
i
];
}

return sum /
period;

}

/**
 * @param {Array<{ time: number, high: number, low: number }>} candles
 * @returns {Array<{ time: number, value: number }>}
 */
export function calculateAwesomeOscillator(
candles,
fastPeriod =
AO_FAST_PERIOD,
slowPeriod =
AO_SLOW_PERIOD
){

if(
!candles?.length ||
candles.length <
slowPeriod
){
return [];
}

const hl2 =
candles.map(
medianPrice
);

const out =
[];

for(
let i =
slowPeriod -
1;
i <
candles.length;
i++
){

const fast =
smaAt(
hl2,
fastPeriod,
i
);

const slow =
smaAt(
hl2,
slowPeriod,
i
);

out.push({
time:
candles[
i
].time,
value:
fast -
slow
});

}

return out;

}

export function aoBarColor(
value,
prevValue
){

if(
prevValue ==
null ||
!Number.isFinite(
prevValue
)
){
return value >=
0
? AO_UP
: AO_DOWN;
}

return value >=
prevValue
? AO_UP
: AO_DOWN;

}

export function formatAoLegendValue(
value
){

if(
value ==
null ||
!Number.isFinite(
value
)
){
return "—";
}

const abs =
Math.abs(
value
);

if(
abs >=
100
){
return value.toFixed(
2
);
}

if(
abs >=
1
){
return value.toFixed(
2
);
}

if(
abs >=
0.01
){
return value.toFixed(
4
);
}

return value.toFixed(
6
);

}
