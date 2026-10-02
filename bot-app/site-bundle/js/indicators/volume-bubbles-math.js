/**
 * Volume Bubbles math (overlay).
 * Classic approach (TradingView R2D2 / QuantAlgo family):
 * volume SMA baseline + spike multiplier filter; radius scales with ratio.
 */

/**
 * @param {number} value
 * @param {number} fallback
 * @param {number} min
 * @param {number} max
 */
export function clampNumber(
value,
fallback,
min,
max
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
max,
Math.max(
min,
n
)
);

}

/**
 * SMA of volumes ending at index i (inclusive).
 * @param {Array<{ volume?: number }>} candles
 * @param {number} endIndex
 * @param {number} length
 * @returns {number|null}
 */
export function volumeSmaAt(
candles,
endIndex,
length
){

const len =
Math.max(
1,
Math.floor(
length
)
);

if(
!Array.isArray(
candles
) ||
endIndex <
len -
1 ||
endIndex >=
candles.length
){
return null;
}

let sum =
0;
let count =
0;

for(
let j =
endIndex -
len +
1;
j <=
endIndex;
j++
){

const v =
Number(
candles[j]?.volume
);

if(
!Number.isFinite(
v
) ||
v <
0
){
continue;
}

sum +=
v;
count +=
1;

}

if(
count <
len
){
return null;
}

return sum /
len;

}

/**
 * @param {object} candle
 * @returns {"buy"|"sell"}
 */
export function bubbleSideFromCandle(
candle
){

const o =
Number(
candle?.open
);
const c =
Number(
candle?.close
);

if(
!Number.isFinite(
o
) ||
!Number.isFinite(
c
)
){
return "buy";
}

return c >=
o
? "buy"
: "sell";

}

/**
 * Price anchor for bubble: mid of candle body (classic visual).
 * @param {object} candle
 * @returns {number|null}
 */
export function bubblePriceFromCandle(
candle
){

const o =
Number(
candle?.open
);
const c =
Number(
candle?.close
);
const h =
Number(
candle?.high
);
const l =
Number(
candle?.low
);

if(
Number.isFinite(
o
) &&
Number.isFinite(
c
)
){
return (
o +
c
) /
2;
}

if(
Number.isFinite(
h
) &&
Number.isFinite(
l
)
){
return (
h +
l
) /
2;
}

return null;

}

/**
 * Pixel radius from volume ratio and size settings.
 * @param {number} ratio volume / sma
 * @param {{ sizeScale: number, minRadius: number, maxRadius: number }} opts
 */
export function bubbleRadiusPx(
ratio,
opts
){

const scale =
clampNumber(
opts?.sizeScale,
1,
0.2,
5
);
const minR =
clampNumber(
opts?.minRadius,
4,
1,
40
);
const maxR =
clampNumber(
opts?.maxRadius,
28,
4,
80
);

const r =
minR +
(
Math.sqrt(
Math.max(
0,
ratio
)
) -
1
) *
8 *
scale;

return Math.min(
maxR *
scale,
Math.max(
minR,
r
)
);

}

/**
 * @param {Array<object>} candles
 * @param {{
 *   maLength?: number,
 *   volumeMult?: number,
 *   minVolume?: number,
 *   sizeScale?: number,
 *   minRadius?: number,
 *   maxRadius?: number,
 *   showBuy?: boolean,
 *   showSell?: boolean
 * }} settings
 * @returns {Array<{
 *   time: number,
 *   price: number,
 *   volume: number,
 *   sma: number,
 *   ratio: number,
 *   side: "buy"|"sell",
 *   radius: number
 * }>}
 */
export function buildVolumeBubbles(
candles,
settings =
{}
){

if(
!Array.isArray(
candles
) ||
!candles.length
){
return [];
}

const maLength =
Math.round(
clampNumber(
settings.maLength,
20,
2,
500
)
);
const volumeMult =
clampNumber(
settings.volumeMult,
2,
0.5,
50
);
const minVolume =
clampNumber(
settings.minVolume,
0,
0,
1e15
);
const showBuy =
settings.showBuy !==
false;
const showSell =
settings.showSell !==
false;
const sizeOpts =
{
sizeScale:
settings.sizeScale,
minRadius:
settings.minRadius,
maxRadius:
settings.maxRadius
};

const out =
[];

for(
let i =
0;
i <
candles.length;
i++
){

const candle =
candles[i];
const volume =
Number(
candle?.volume
);
const time =
Number(
candle?.time
);

if(
!Number.isFinite(
volume
) ||
volume <=
0 ||
!Number.isFinite(
time
)
){
continue;
}

if(
volume <
minVolume
){
continue;
}

const sma =
volumeSmaAt(
candles,
i,
maLength
);

if(
sma ==
null ||
sma <=
0
){
continue;
}

const ratio =
volume /
sma;

if(
ratio <
volumeMult
){
continue;
}

const side =
bubbleSideFromCandle(
candle
);

if(
side ===
"buy" &&
!showBuy
){
continue;
}

if(
side ===
"sell" &&
!showSell
){
continue;
}

const price =
bubblePriceFromCandle(
candle
);

if(
price ==
null ||
!Number.isFinite(
price
)
){
continue;
}

out.push({
time,
price,
volume,
sma,
ratio,
side,
radius:
bubbleRadiusPx(
ratio,
sizeOpts
)
});

}

return out;

}
