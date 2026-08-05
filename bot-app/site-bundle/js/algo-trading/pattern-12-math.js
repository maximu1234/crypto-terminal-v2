/**
 * КОПИЯ для модуля АлгоТрейдинг.
 * Оригинал: js/indicators/pattern-12-math.js — НЕ ПРАВИТЬ оригинал.
 * На Алго загружаем ~10×1000 свечей; MAX_HIST должен покрывать всю эту
 * историю (иначе barInHistory отсекает первую половину графика).
 * setups[] — только алго-экспорт для бота/аналитики.
 * Паттерн 1-2, 1-2 — порт логики из Pine (RSI swing + точки 1–4).
 * После валидной точки 4 цепочка 1-2-3-4 фиксируется (append-only): более
 * низкий/высокий swing после b4 — новый сетап, а не перепись старой тройки.
 */
import {
calculateRSI
} from "../indicators.js?v=3";

const MAX_HIST =
10000;
const RSI_OVERBOUGHT =
70;
const RSI_OVERSOLD =
30;

export const PATTERN_12_ID =
"pattern-12";

export function defaultPattern12Settings(){

return {
patternMode:
"both",
decLowsBeforePt1:
0,
ascHighsBeforePt1:
0,
waveAMode:
"both",
lngWaveCMode:
"1",
shtWaveCMode:
"1",
rsiOverbought:
70,
rsiOversold:
30,
lngRsiLength:
17,
lngShowFractals:
false,
lngShowRsiSwingLines:
false,
lngMicRsiLength:
1,
lngShowMicFractals:
false,
lngShowMicRsiSwingLines:
false,
shtRsiLength:
17,
shtShowFractals:
false,
shtShowRsiSwingLines:
false,
shtMicRsiLength:
1,
shtShowMicFractals:
false,
shtShowMicRsiSwingLines:
false,
showPt1Badges:
false,
showPt2Badges:
false,
showPt3Badges:
false,
showLngPt4Dot:
true,
showLngPt4Mark:
true,
lngPt4LineBars:
100,
showShtPt4Dot:
true,
showShtPt4Mark:
true,
shtPt4LineBars:
100,
showPatternLines:
false
};

}

export function normalizePattern12Settings(
raw
){

const base =
defaultPattern12Settings();
const mode =
String(
raw?.patternMode ||
""
);

const next =
{
...base,
...raw,
patternMode:
mode ===
"long" ||
mode ===
"short" ||
mode ===
"both"
? mode
: base.patternMode,
decLowsBeforePt1:
clampInt(
raw?.decLowsBeforePt1,
0,
5,
base.decLowsBeforePt1
),
ascHighsBeforePt1:
clampInt(
raw?.ascHighsBeforePt1,
0,
5,
base.ascHighsBeforePt1
),
waveAMode:
[
"1",
"2",
"both"
].includes(
raw?.waveAMode
)
? raw.waveAMode
: base.waveAMode,
lngWaveCMode:
[
"1",
"2"
].includes(
raw?.lngWaveCMode
)
? raw.lngWaveCMode
: base.lngWaveCMode,
shtWaveCMode:
[
"1",
"2"
].includes(
raw?.shtWaveCMode
)
? raw.shtWaveCMode
: base.shtWaveCMode,
rsiOverbought:
clampInt(
raw?.rsiOverbought,
1,
99,
base.rsiOverbought
),
rsiOversold:
clampInt(
raw?.rsiOversold,
1,
99,
base.rsiOversold
),
lngRsiLength:
clampInt(
raw?.lngRsiLength,
1,
999,
base.lngRsiLength
),
lngMicRsiLength:
clampInt(
raw?.lngMicRsiLength,
1,
999,
base.lngMicRsiLength
),
shtRsiLength:
clampInt(
raw?.shtRsiLength,
1,
999,
base.shtRsiLength
),
shtMicRsiLength:
clampInt(
raw?.shtMicRsiLength,
1,
999,
base.shtMicRsiLength
),
lngPt4LineBars:
clampInt(
raw?.lngPt4LineBars,
4,
100,
base.lngPt4LineBars
),
shtPt4LineBars:
clampInt(
raw?.shtPt4LineBars,
4,
100,
base.shtPt4LineBars
),
lngShowFractals:
!!raw?.lngShowFractals,
lngShowRsiSwingLines:
!!raw?.lngShowRsiSwingLines,
lngShowMicFractals:
!!raw?.lngShowMicFractals,
lngShowMicRsiSwingLines:
!!raw?.lngShowMicRsiSwingLines,
shtShowFractals:
!!raw?.shtShowFractals,
shtShowRsiSwingLines:
!!raw?.shtShowRsiSwingLines,
shtShowMicFractals:
!!raw?.shtShowMicFractals,
shtShowMicRsiSwingLines:
!!raw?.shtShowMicRsiSwingLines,
showPt1Badges:
!!raw?.showPt1Badges,
showPt2Badges:
!!raw?.showPt2Badges,
showPt3Badges:
!!raw?.showPt3Badges,
showLngPt4Dot:
raw?.showLngPt4Dot !==
false,
showLngPt4Mark:
raw?.showLngPt4Mark !==
false,
showShtPt4Dot:
raw?.showShtPt4Dot !==
false,
showShtPt4Mark:
raw?.showShtPt4Mark !==
false,
showPatternLines:
!!raw?.showPatternLines
};

if(
next.rsiOversold >=
next.rsiOverbought
){
next.rsiOversold =
Math.max(
1,
next.rsiOverbought -
1
);
}

return next;

}

function clampInt(
value,
min,
max,
fallback
){

const n =
Math.round(
Number(
value
)
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

function buildRsiByIndex(
candles,
period
){

const out =
new Array(
candles.length
).fill(
null
);

if(
candles.length <
period +
1
){
return out;
}

const points =
calculateRSI(
candles,
period
);
const byTime =
new Map(
points.map(
p=>[
p.time,
p.value
]
)
);

for(
let i =
0;
i <
candles.length;
i++
){
out[
i
] =
byTime.get(
candles[
i
].time
) ??
null;
}

return out;

}

function emptySwingLog(){

return {
bars: [],
confirmBars: [],
types: [],
prices: []
};

}

function pushSwing(
log,
bar,
confirmBar,
type,
price,
cap
){

log.bars.push(
bar
);
log.confirmBars.push(
confirmBar
);
log.types.push(
type
);
log.prices.push(
price
);

while(
log.bars.length >
cap
){
log.bars.shift();
log.confirmBars.shift();
log.types.shift();
log.prices.shift();
}

}

function buildRsiSwingLog(
candles,
rsiLength,
debug
){

const log =
emptySwingLog();
const extras =
{
fractals: [],
swingLines: []
};
const overbought =
Number(
debug?.overbought
);

const oversold =
Number(
debug?.oversold
);
const rsiOb =
Number.isFinite(
overbought
) &&
overbought >
0
? overbought
: RSI_OVERBOUGHT;
const rsiOs =
Number.isFinite(
oversold
) &&
oversold >
0
? oversold
: RSI_OVERSOLD;

if(
candles.length <
2
){
return {
log,
extras
};
}

const rsi =
buildRsiByIndex(
candles,
rsiLength
);
const cap =
Math.min(
MAX_HIST,
candles.length
);

let laststate =
0;
let hh =
candles[
0
].low;
let ll =
candles[
0
].high;
let hhBar =
0;
let llBar =
0;
let prevSwingBar =
null;
let prevSwingPrice =
null;

for(
let barIndex =
1;
barIndex <
candles.length;
barIndex++
){

const bar =
candles[
barIndex
];
const rsiVal =
rsi[
barIndex
];

if(
rsiVal ==
null
){
continue;
}

const isOB =
rsiVal >=
rsiOb;
const isOS =
rsiVal <=
rsiOs;
let up =
false;
let down =
false;
let eventBar =
null;
let eventPrice =
null;

if(
laststate ===
2 &&
isOB
){
down =
true;
eventBar =
llBar;
eventPrice =
ll;
hh =
bar.high;
hhBar =
barIndex;
}

if(
laststate ===
1 &&
isOS
){
up =
true;
eventBar =
hhBar;
eventPrice =
hh;
ll =
bar.low;
llBar =
barIndex;
}

if(
isOB
){
if(
bar.high >=
hh
){
hh =
bar.high;
hhBar =
barIndex;
}
laststate =
1;
}

if(
isOS
){
if(
bar.low <=
ll
){
ll =
bar.low;
llBar =
barIndex;
}
laststate =
2;
}

if(
laststate ===
1 &&
bar.high >=
hh
){
hh =
bar.high;
hhBar =
barIndex;
}

if(
laststate ===
2 &&
bar.low <=
ll
){
ll =
bar.low;
llBar =
barIndex;
}

if(
up ||
down
){

if(
debug?.showSwingLines &&
prevSwingBar !=
null
){
extras.swingLines.push(
{
barA:
prevSwingBar,
priceA:
prevSwingPrice,
barB:
eventBar,
priceB:
eventPrice,
color:
debug.swingLineColor
}
);
}

prevSwingBar =
eventBar;
prevSwingPrice =
eventPrice;

if(
debug?.showFractals
){
extras.fractals.push(
{
bar:
eventBar,
up,
color:
up
? debug.fractalUpColor
: debug.fractalDownColor
}
);
}

pushSwing(
log,
eventBar,
barIndex,
up
? 1
: -1,
eventPrice,
cap
);

}

}

return {
log,
extras
};

}

function buildShortSenLog(
candles,
rsiLength,
debug
){

const log =
emptySwingLog();
const preHighs =
{
pre1: [],
pre2: [],
pre3: [],
pre4: [],
pre5: []
};
const extras =
{
fractals: [],
swingLines: []
};
const overbought =
Number(
debug?.overbought
);

const oversold =
Number(
debug?.oversold
);
const rsiOb =
Number.isFinite(
overbought
) &&
overbought >
0
? overbought
: RSI_OVERBOUGHT;
const rsiOs =
Number.isFinite(
oversold
) &&
oversold >
0
? oversold
: RSI_OVERSOLD;

if(
candles.length <
2
){
return {
log,
preHighs,
extras
};
}

const rsi =
buildRsiByIndex(
candles,
rsiLength
);
const cap =
Math.min(
MAX_HIST,
candles.length
);

let laststate =
0;
let hh =
candles[
0
].low;
let ll =
candles[
0
].high;
let hhBar =
0;
let llBar =
0;
let prevSwingBar =
null;
let prevSwingPrice =
null;
let lastHigh1 =
NaN;
let lastHigh2 =
NaN;
let lastHigh3 =
NaN;
let lastHigh4 =
NaN;
let lastHigh5 =
NaN;

const pushPreNA =
()=>{
preHighs.pre1.push(
NaN
);
preHighs.pre2.push(
NaN
);
preHighs.pre3.push(
NaN
);
preHighs.pre4.push(
NaN
);
preHighs.pre5.push(
NaN
);
};

const shiftPre =
()=>{
preHighs.pre1.shift();
preHighs.pre2.shift();
preHighs.pre3.shift();
preHighs.pre4.shift();
preHighs.pre5.shift();
};

for(
let barIndex =
1;
barIndex <
candles.length;
barIndex++
){

const bar =
candles[
barIndex
];
const rsiVal =
rsi[
barIndex
];

if(
rsiVal ==
null
){
continue;
}

const isOB =
rsiVal >=
rsiOb;
const isOS =
rsiVal <=
rsiOs;
let up =
false;
let down =
false;
let eventBar =
null;
let eventPrice =
null;

if(
laststate ===
2 &&
isOB
){
down =
true;
eventBar =
llBar;
eventPrice =
ll;
hh =
bar.high;
hhBar =
barIndex;
}

if(
laststate ===
1 &&
isOS
){
up =
true;
eventBar =
hhBar;
eventPrice =
hh;
ll =
bar.low;
llBar =
barIndex;
}

if(
isOB
){
if(
bar.high >=
hh
){
hh =
bar.high;
hhBar =
barIndex;
}
laststate =
1;
}

if(
isOS
){
if(
bar.low <=
ll
){
ll =
bar.low;
llBar =
barIndex;
}
laststate =
2;
}

if(
laststate ===
1 &&
bar.high >=
hh
){
hh =
bar.high;
hhBar =
barIndex;
}

if(
laststate ===
2 &&
bar.low <=
ll
){
ll =
bar.low;
llBar =
barIndex;
}

if(
up ||
down
){

if(
debug?.showSwingLines &&
prevSwingBar !=
null
){
extras.swingLines.push(
{
barA:
prevSwingBar,
priceA:
prevSwingPrice,
barB:
eventBar,
priceB:
eventPrice,
color:
debug.swingLineColor
}
);
}

prevSwingBar =
eventBar;
prevSwingPrice =
eventPrice;

if(
debug?.showFractals
){
extras.fractals.push(
{
bar:
eventBar,
up,
color:
up
? debug.fractalUpColor
: debug.fractalDownColor
}
);
}

if(
up
){
preHighs.pre1.push(
lastHigh1
);
preHighs.pre2.push(
lastHigh2
);
preHighs.pre3.push(
lastHigh3
);
preHighs.pre4.push(
lastHigh4
);
preHighs.pre5.push(
lastHigh5
);
lastHigh5 =
lastHigh4;
lastHigh4 =
lastHigh3;
lastHigh3 =
lastHigh2;
lastHigh2 =
lastHigh1;
lastHigh1 =
eventPrice;
}else{
pushPreNA();
}

pushSwing(
log,
eventBar,
barIndex,
up
? 1
: -1,
eventPrice,
cap
);

while(
preHighs.pre1.length >
log.bars.length
){
shiftPre();
}

}

}

return {
log,
preHighs,
extras
};

}

function barInHistory(
bar,
lastBar
){

return (
bar >=
0 &&
bar <=
lastBar &&
lastBar -
bar <=
MAX_HIST
);

}

function barListed(
bars,
bar
){

return bars.includes(
bar
);

}

function waveASlotCount(
waveAMode
){

return waveAMode ===
"both"
? 2
: 1;

}

function waveANthForSlot(
waveAMode,
slot
){

if(
waveAMode ===
"both"
){
return slot +
1;
}

return waveAMode ===
"2"
? 2
: 1;

}

function lngWaveCMicNth(
lngWaveCMode
){

return lngWaveCMode ===
"2"
? 2
: 1;

}

function shtWaveCMicNth(
shtWaveCMode
){

return shtWaveCMode ===
"2"
? 2
: 1;

}

function lngPt4PriceValid(
pk,
pr1,
pr2,
pr3
){

return (
pk >=
pr1 &&
pk >=
pr3 &&
pk <=
pr2
);

}

function shtPt4PriceValid(
pk,
pr1,
pr2,
pr3
){

return (
pk <=
pr1 &&
pk <=
pr3 &&
pk >=
pr2
);

}

function lngBoxIntact(
candles,
fromBar,
toBar,
p1,
p2
){

if(
toBar <=
fromBar ||
p1 ==
null ||
p2 ==
null
){
return false;
}

for(
let b =
fromBar +
1;
b <=
toBar;
b++
){
const bar =
candles[
b
];

if(
!bar
){
return false;
}

if(
bar.low <
p1 ||
bar.high >
p2
){
return false;
}

}

return true;

}

function lngBottomIntact(
candles,
fromBar,
toBar,
p1
){

if(
toBar <=
fromBar ||
p1 ==
null
){
return false;
}

for(
let b =
fromBar +
1;
b <=
toBar;
b++
){
const bar =
candles[
b
];

if(
!bar ||
bar.low <
p1
){
return false;
}

}

return true;

}

function shtBoxIntact(
candles,
fromBar,
toBar,
p1,
p2
){

if(
toBar <=
fromBar ||
p1 ==
null ||
p2 ==
null
){
return false;
}

for(
let b =
fromBar +
1;
b <=
toBar;
b++
){
const bar =
candles[
b
];

if(
!bar
){
return false;
}

if(
bar.high >
p1 ||
bar.low <
p2
){
return false;
}

}

return true;

}

function shtTopIntact(
candles,
fromBar,
toBar,
p1
){

if(
toBar <=
fromBar ||
p1 ==
null
){
return false;
}

for(
let b =
fromBar +
1;
b <=
toBar;
b++
){
const bar =
candles[
b
];

if(
!bar ||
bar.high >
p1
){
return false;
}

}

return true;

}

function lngPt1WindowSize(
decLowsBeforePt1
){

return decLowsBeforePt1 <=
0
? 1
: decLowsBeforePt1 +
1;

}

function lngCollectDownIdxs(
log
){

const idxs =
[];

for(
let i =
0;
i <
log.types.length;
i++
){

if(
log.types[
i
] ===
-1
){
idxs.push(
i
);
}

}

return idxs;

}

function lngLowWindowDescending(
downStart,
downIdxs,
need,
log
){

const n =
downIdxs.length;

if(
downStart +
need >
n
){
return false;
}

for(
let k =
0;
k <
need -
1;
k++
){

const iA =
downIdxs[
downStart +
k
];
const iB =
downIdxs[
downStart +
k +
1
];

if(
log.prices[
iA
] <=
log.prices[
iB
]
){
return false;
}

}

return true;

}

function lngScanPt1(
candles,
log,
settings,
lastBar
){

const outBars =
[];
const outPrices =
[];
const outIdxs =
[];
const downIdxs =
lngCollectDownIdxs(
log
);
const need =
lngPt1WindowSize(
settings.decLowsBeforePt1
);
const nDown =
downIdxs.length;

if(
nDown <
need
){
return {
outBars,
outPrices,
outIdxs
};
}

const dEnd =
nDown -
need;

for(
let downStart =
0;
downStart <=
dEnd;
downStart++
){

if(
!lngLowWindowDescending(
downStart,
downIdxs,
need,
log
)
){
continue;
}

const idx =
downIdxs[
downStart +
need -
1
];
const b1 =
log.bars[
idx
];
const pr1 =
log.prices[
idx
];

if(
b1 ==
null ||
pr1 ==
null ||
!barInHistory(
b1,
lastBar
)
){
continue;
}

if(
barListed(
outBars,
b1
)
){
continue;
}

outBars.push(
b1
);
outPrices.push(
pr1
);
outIdxs.push(
idx
);

}

return {
outBars,
outPrices,
outIdxs
};

}

function lngPt2AfterPt1(
log,
candles,
i1,
nthUp,
pr1
){

let i2 =
-1;
let b2 =
null;
let pr2 =
null;
let hits =
0;
let prFirstUp =
null;
let bFirstUp =
null;
const sz =
log.types.length;

if(
i1 <
0 ||
i1 >=
sz -
1 ||
nthUp <
1 ||
pr1 ==
null
){
return {
i2,
b2,
pr2
};
}

for(
let k =
i1 +
1;
k <
sz;
k++
){

if(
log.types[
k
] !==
1
){
continue;
}

hits +=
1;
const pk =
log.prices[
k
];
const bk =
log.bars[
k
];

if(
hits ===
1
){
prFirstUp =
pk;
bFirstUp =
bk;
}

if(
hits ===
nthUp
){

let ok =
nthUp ===
1;

if(
nthUp ===
2 &&
prFirstUp !=
null &&
bFirstUp !=
null &&
pk >=
prFirstUp
){
ok =
lngBottomIntact(
candles,
bFirstUp,
bk,
pr1
);
}

if(
ok
){
i2 =
k;
b2 =
bk;
pr2 =
pk;
}

break;

}

}

return {
i2,
b2,
pr2
};

}

function lngPt3AfterPt12(
log,
candles,
i2,
b2,
pr1,
pr2
){

let i3 =
-1;
let b3 =
null;
let pr3 =
null;
let bestP3 =
null;
const sz =
log.types.length;

if(
i2 <
0 ||
i2 >=
sz -
1 ||
b2 ==
null ||
pr1 ==
null ||
pr2 ==
null ||
pr2 <=
pr1
){
return {
i3,
b3,
pr3
};
}

for(
let k =
i2 +
1;
k <
sz;
k++
){

const confirmK =
log.confirmBars[
k
];

if(
!barInHistory(
b2,
candles.length -
1
) ||
!barInHistory(
confirmK,
candles.length -
1
)
){
break;
}

if(
!lngBoxIntact(
candles,
b2,
confirmK,
pr1,
pr2
)
){
break;
}

if(
log.types[
k
] !==
-1
){
continue;
}

const bk =
log.bars[
k
];
const pk =
log.prices[
k
];

if(
bk <=
b2
){
continue;
}

if(
pk <=
pr1 ||
pk >=
pr2
){
continue;
}

if(
bestP3 ==
null ||
pk <
bestP3
){
bestP3 =
pk;
i3 =
k;
b3 =
bk;
pr3 =
pk;
}

}

return {
i3,
b3,
pr3
};

}

function lngPt4AfterPt3(
micLog,
candles,
b3,
pr1,
pr2,
pr3,
nthMicUp
){

let i4 =
-1;
let b4 =
null;
let pr4 =
null;
let foundFirst =
false;
let prFirstUp =
null;
let bFirstUp =
null;
const sz =
micLog.types.length;

if(
b3 ==
null ||
pr1 ==
null ||
pr2 ==
null ||
pr3 ==
null ||
pr2 <=
pr1 ||
nthMicUp <
1
){
return {
i4,
b4,
pr4
};
}

for(
let k =
0;
k <
sz;
k++
){

const bk =
micLog.bars[
k
];

if(
bk <=
b3
){
continue;
}

if(
!barInHistory(
b3,
candles.length -
1
) ||
!barInHistory(
bk,
candles.length -
1
)
){
break;
}

if(
micLog.types[
k
] !==
1
){
continue;
}

const pk =
micLog.prices[
k
];

if(
!lngPt4PriceValid(
pk,
pr1,
pr2,
pr3
)
){
continue;
}

if(
!lngBoxIntact(
candles,
b3,
bk,
pr1,
pr2
)
){
break;
}

if(
!foundFirst
){
foundFirst =
true;
prFirstUp =
pk;
bFirstUp =
bk;

if(
nthMicUp ===
1
){
i4 =
k;
b4 =
bk;
pr4 =
pk;
break;
}

}else if(
pk >
prFirstUp
){

if(
lngBottomIntact(
candles,
bFirstUp,
bk,
pr3
)
){
i4 =
k;
b4 =
bk;
pr4 =
pk;
}

break;

}

}

return {
i4,
b4,
pr4
};

}

function shtHasAscHighsBeforePt1(
preHighs,
logIdx,
pt1Price,
ascHighsBeforePt1
){

if(
ascHighsBeforePt1 <=
0
){
return true;
}

const pre1 =
preHighs.pre1[
logIdx
];
const pre2 =
preHighs.pre2[
logIdx
];
const pre3 =
preHighs.pre3[
logIdx
];
const pre4 =
preHighs.pre4[
logIdx
];
const pre5 =
preHighs.pre5[
logIdx
];

if(
pre1 ==
null ||
!Number.isFinite(
pre1
) ||
pre1 >=
pt1Price
){
return false;
}

let ok =
true;

if(
ascHighsBeforePt1 >=
2
){
ok =
ok &&
pre2 !=
null &&
Number.isFinite(
pre2
) &&
pre2 <
pre1;
}

if(
ascHighsBeforePt1 >=
3
){
ok =
ok &&
pre3 !=
null &&
Number.isFinite(
pre3
) &&
pre3 <
pre2;
}

if(
ascHighsBeforePt1 >=
4
){
ok =
ok &&
pre4 !=
null &&
Number.isFinite(
pre4
) &&
pre4 <
pre3;
}

if(
ascHighsBeforePt1 >=
5
){
ok =
ok &&
pre5 !=
null &&
Number.isFinite(
pre5
) &&
pre5 <
pre4;
}

return ok;

}

function shtScanPt1(
candles,
log,
preHighs,
settings,
lastBar
){

const outBars =
[];
const outPrices =
[];
const outIdxs =
[];
const sz =
log.types.length;

for(
let i =
0;
i <
sz;
i++
){

if(
log.types[
i
] !==
1
){
continue;
}

const b1 =
log.bars[
i
];
const pr1 =
log.prices[
i
];

if(
b1 ==
null ||
pr1 ==
null ||
!barInHistory(
b1,
lastBar
)
){
continue;
}

if(
!shtHasAscHighsBeforePt1(
preHighs,
i,
pr1,
settings.ascHighsBeforePt1
)
){
continue;
}

if(
barListed(
outBars,
b1
)
){
continue;
}

outBars.push(
b1
);
outPrices.push(
pr1
);
outIdxs.push(
i
);

}

return {
outBars,
outPrices,
outIdxs
};

}

function shtPt2AfterPt1(
log,
candles,
i1,
nthDn,
pr1
){

let i2 =
-1;
let b2 =
null;
let pr2 =
null;
let hits =
0;
let prFirstDn =
null;
let bFirstDn =
null;
const sz =
log.types.length;

if(
i1 <
0 ||
i1 >=
sz -
1 ||
nthDn <
1 ||
pr1 ==
null
){
return {
i2,
b2,
pr2
};
}

for(
let k =
i1 +
1;
k <
sz;
k++
){

if(
log.types[
k
] !==
-1
){
continue;
}

hits +=
1;
const pk =
log.prices[
k
];
const bk =
log.bars[
k
];

if(
hits ===
1
){
prFirstDn =
pk;
bFirstDn =
bk;
}

if(
hits ===
nthDn
){

let ok =
nthDn ===
1;

if(
nthDn ===
2 &&
prFirstDn !=
null &&
bFirstDn !=
null &&
pk <=
prFirstDn
){
ok =
shtTopIntact(
candles,
bFirstDn,
bk,
pr1
);
}

if(
ok
){
i2 =
k;
b2 =
bk;
pr2 =
pk;
}

break;

}

}

return {
i2,
b2,
pr2
};

}

function shtPt3AfterPt12(
log,
candles,
i2,
b2,
pr1,
pr2
){

let i3 =
-1;
let b3 =
null;
let pr3 =
null;
let bestP3 =
null;
const sz =
log.types.length;

if(
i2 <
0 ||
i2 >=
sz -
1 ||
b2 ==
null ||
pr1 ==
null ||
pr2 ==
null ||
pr1 <=
pr2
){
return {
i3,
b3,
pr3
};
}

for(
let k =
i2 +
1;
k <
sz;
k++
){

const confirmK =
log.confirmBars[
k
];

if(
!barInHistory(
b2,
candles.length -
1
) ||
!barInHistory(
confirmK,
candles.length -
1
)
){
break;
}

if(
!shtBoxIntact(
candles,
b2,
confirmK,
pr1,
pr2
)
){
break;
}

if(
log.types[
k
] !==
1
){
continue;
}

const bk =
log.bars[
k
];
const pk =
log.prices[
k
];

if(
bk <=
b2
){
continue;
}

if(
pk >=
pr1 ||
pk <=
pr2
){
continue;
}

if(
bestP3 ==
null ||
pk >
bestP3
){
bestP3 =
pk;
i3 =
k;
b3 =
bk;
pr3 =
pk;
}

}

return {
i3,
b3,
pr3
};

}

function shtPt4AfterPt3(
micLog,
candles,
b3,
pr1,
pr2,
pr3,
nthMicDn
){

let i4 =
-1;
let b4 =
null;
let pr4 =
null;
let foundFirst =
false;
let prFirstDn =
null;
let bFirstDn =
null;
const sz =
micLog.types.length;

if(
b3 ==
null ||
pr1 ==
null ||
pr2 ==
null ||
pr3 ==
null ||
pr1 <=
pr2 ||
nthMicDn <
1
){
return {
i4,
b4,
pr4
};
}

for(
let k =
0;
k <
sz;
k++
){

const bk =
micLog.bars[
k
];

if(
bk <=
b3
){
continue;
}

if(
!barInHistory(
b3,
candles.length -
1
) ||
!barInHistory(
bk,
candles.length -
1
)
){
break;
}

if(
micLog.types[
k
] !==
-1
){
continue;
}

const pk =
micLog.prices[
k
];

if(
!shtPt4PriceValid(
pk,
pr1,
pr2,
pr3
)
){
continue;
}

if(
!shtBoxIntact(
candles,
b3,
bk,
pr1,
pr2
)
){
break;
}

if(
!foundFirst
){
foundFirst =
true;
prFirstDn =
pk;
bFirstDn =
bk;

if(
nthMicDn ===
1
){
i4 =
k;
b4 =
bk;
pr4 =
pk;
break;
}

}else if(
pk <
prFirstDn
){

if(
shtTopIntact(
candles,
bFirstDn,
bk,
pr3
)
){
i4 =
k;
b4 =
bk;
pr4 =
pk;
}

break;

}

}

return {
i4,
b4,
pr4
};

}

/**
 * Deepest long pt3 candidate with minBar < b3 < b4 while box 1-2 intact.
 * Used so a completed 1-2-3-4 is not revised by a later lower swing after b4.
 */
function lngDeepestDownBeforeBar(
log,
candles,
i2,
b2,
pr1,
pr2,
minBar,
b4
){

let i3 =
-1;
let b3 =
null;
let pr3 =
null;
let bestP3 =
null;
const sz =
log.types.length;
const lastBar =
candles.length -
1;

if(
i2 <
0 ||
b2 ==
null ||
pr1 ==
null ||
pr2 ==
null ||
pr2 <=
pr1 ||
b4 ==
null ||
!(
b4 >
minBar
)
){
return {
i3,
b3,
pr3
};
}

for(
let k =
i2 +
1;
k <
sz;
k++
){

const confirmK =
log.confirmBars[
k
];

if(
!barInHistory(
b2,
lastBar
) ||
!barInHistory(
confirmK,
lastBar
)
){
break;
}

if(
!lngBoxIntact(
candles,
b2,
confirmK,
pr1,
pr2
)
){
break;
}

if(
log.types[
k
] !==
-1
){
continue;
}

const bk =
log.bars[
k
];
const pk =
log.prices[
k
];

if(
bk <=
minBar ||
bk >=
b4
){
continue;
}

if(
pk <=
pr1 ||
pk >=
pr2
){
continue;
}

if(
bestP3 ==
null ||
pk <
bestP3
){
bestP3 =
pk;
i3 =
k;
b3 =
bk;
pr3 =
pk;
}

}

return {
i3,
b3,
pr3
};

}

/**
 * Highest short pt3 candidate with minBar < b3 < b4 while box 1-2 intact.
 */
function shtHighestUpBeforeBar(
log,
candles,
i2,
b2,
pr1,
pr2,
minBar,
b4
){

let i3 =
-1;
let b3 =
null;
let pr3 =
null;
let bestP3 =
null;
const sz =
log.types.length;
const lastBar =
candles.length -
1;

if(
i2 <
0 ||
b2 ==
null ||
pr1 ==
null ||
pr2 ==
null ||
pr1 <=
pr2 ||
b4 ==
null ||
!(
b4 >
minBar
)
){
return {
i3,
b3,
pr3
};
}

for(
let k =
i2 +
1;
k <
sz;
k++
){

const confirmK =
log.confirmBars[
k
];

if(
!barInHistory(
b2,
lastBar
) ||
!barInHistory(
confirmK,
lastBar
)
){
break;
}

if(
!shtBoxIntact(
candles,
b2,
confirmK,
pr1,
pr2
)
){
break;
}

if(
log.types[
k
] !==
1
){
continue;
}

const bk =
log.bars[
k
];
const pk =
log.prices[
k
];

if(
bk <=
minBar ||
bk >=
b4
){
continue;
}

if(
pk >=
pr1 ||
pk <=
pr2
){
continue;
}

if(
bestP3 ==
null ||
pk >
bestP3
){
bestP3 =
pk;
i3 =
k;
b3 =
bk;
pr3 =
pk;
}

}

return {
i3,
b3,
pr3
};

}

/**
 * Sequential long setups under fixed 1-2: commit each 3-4, then allow a new
 * pt3 only after previous b4 (append-only; later lower swing ≠ rewrite).
 */
function lngScanChainsAfterPt12(
senLog,
micLog,
candles,
i2,
b2,
pr1,
pr2,
nthMicUp
){

const out =
[];
const lastBar =
candles.length -
1;
const sz =
senLog.types.length;
let minBar =
b2;

for(
let guard =
0;
guard <
64;
guard++
){

let committed =
null;

for(
let k =
i2 +
1;
k <
sz;
k++
){

const confirmK =
senLog.confirmBars[
k
];

if(
!barInHistory(
b2,
lastBar
) ||
!barInHistory(
confirmK,
lastBar
)
){
break;
}

if(
!lngBoxIntact(
candles,
b2,
confirmK,
pr1,
pr2
)
){
break;
}

if(
senLog.types[
k
] !==
-1
){
continue;
}

const bk =
senLog.bars[
k
];
const pk =
senLog.prices[
k
];

if(
bk <=
minBar
){
continue;
}

if(
pk <=
pr1 ||
pk >=
pr2
){
continue;
}

const pt4 =
lngPt4AfterPt3(
micLog,
candles,
bk,
pr1,
pr2,
pk,
nthMicUp
);

if(
pt4.i4 <
0 ||
pt4.b4 ==
null ||
pt4.pr4 ==
null ||
!barInHistory(
pt4.b4,
lastBar
)
){
continue;
}

const deepest =
lngDeepestDownBeforeBar(
senLog,
candles,
i2,
b2,
pr1,
pr2,
minBar,
pt4.b4
);

if(
deepest.b3 ==
null ||
deepest.pr3 ==
null ||
deepest.b3 !==
bk ||
deepest.pr3 !==
pk
){
continue;
}

committed =
{
b3:
bk,
p3:
pk,
b4:
pt4.b4,
p4:
pt4.pr4
};
break;

}

if(
!committed ||
!(
committed.b4 >
minBar
)
){
break;
}

out.push(
committed
);
minBar =
committed.b4;

}

return out;

}

/**
 * Sequential short setups under fixed 1-2 (mirror of long append-only rule).
 */
function shtScanChainsAfterPt12(
senLog,
micLog,
candles,
i2,
b2,
pr1,
pr2,
nthMicDn
){

const out =
[];
const lastBar =
candles.length -
1;
const sz =
senLog.types.length;
let minBar =
b2;

for(
let guard =
0;
guard <
64;
guard++
){

let committed =
null;

for(
let k =
i2 +
1;
k <
sz;
k++
){

const confirmK =
senLog.confirmBars[
k
];

if(
!barInHistory(
b2,
lastBar
) ||
!barInHistory(
confirmK,
lastBar
)
){
break;
}

if(
!shtBoxIntact(
candles,
b2,
confirmK,
pr1,
pr2
)
){
break;
}

if(
senLog.types[
k
] !==
1
){
continue;
}

const bk =
senLog.bars[
k
];
const pk =
senLog.prices[
k
];

if(
bk <=
minBar
){
continue;
}

if(
pk >=
pr1 ||
pk <=
pr2
){
continue;
}

const pt4 =
shtPt4AfterPt3(
micLog,
candles,
bk,
pr1,
pr2,
pk,
nthMicDn
);

if(
pt4.i4 <
0 ||
pt4.b4 ==
null ||
pt4.pr4 ==
null ||
!barInHistory(
pt4.b4,
lastBar
)
){
continue;
}

const highest =
shtHighestUpBeforeBar(
senLog,
candles,
i2,
b2,
pr1,
pr2,
minBar,
pt4.b4
);

if(
highest.b3 ==
null ||
highest.pr3 ==
null ||
highest.b3 !==
bk ||
highest.pr3 !==
pk
){
continue;
}

committed =
{
b3:
bk,
p3:
pk,
b4:
pt4.b4,
p4:
pt4.pr4
};
break;

}

if(
!committed ||
!(
committed.b4 >
minBar
)
){
break;
}

out.push(
committed
);
minBar =
committed.b4;

}

return out;

}

/** Exported for unit tests (append-only 3-4 under fixed 1-2). */
export function scanLngChainsAfterPt12ForTest(
senLog,
micLog,
candles,
i2,
b2,
pr1,
pr2,
nthMicUp =
1
){

return lngScanChainsAfterPt12(
senLog,
micLog,
candles,
i2,
b2,
pr1,
pr2,
nthMicUp
);

}

function scanCompletePatterns(
side,
candles,
senLog,
micLog,
preHighs,
settings
){

const chains =
[];
const lastBar =
candles.length -
1;
const scanPt1 =
side ===
"long"
? lngScanPt1(
candles,
senLog,
settings,
lastBar
)
: shtScanPt1(
candles,
senLog,
preHighs,
settings,
lastBar
);
const slots =
waveASlotCount(
settings.waveAMode
);

for(
let i =
0;
i <
scanPt1.outBars.length;
i++
){

const b1 =
scanPt1.outBars[
i
];
const pr1 =
scanPt1.outPrices[
i
];
const i1 =
scanPt1.outIdxs[
i
];

for(
let slot =
0;
slot <
slots;
slot++
){

const nth =
waveANthForSlot(
settings.waveAMode,
slot
);
const pt2 =
side ===
"long"
? lngPt2AfterPt1(
senLog,
candles,
i1,
nth,
pr1
)
: shtPt2AfterPt1(
senLog,
candles,
i1,
nth,
pr1
);

if(
pt2.i2 <
0 ||
pt2.b2 ==
null ||
pt2.pr2 ==
null ||
!barInHistory(
pt2.b2,
lastBar
)
){
continue;
}

const seq =
side ===
"long"
? lngScanChainsAfterPt12(
senLog,
micLog,
candles,
pt2.i2,
pt2.b2,
pr1,
pt2.pr2,
lngWaveCMicNth(
settings.lngWaveCMode
)
)
: shtScanChainsAfterPt12(
senLog,
micLog,
candles,
pt2.i2,
pt2.b2,
pr1,
pt2.pr2,
shtWaveCMicNth(
settings.shtWaveCMode
)
);

for(
const leg of seq
){

if(
chains.some(
c=>
c.b1 ===
b1 &&
c.b2 ===
pt2.b2 &&
c.b3 ===
leg.b3 &&
c.b4 ===
leg.b4
)
){
continue;
}

chains.push(
{
b1,
p1:
pr1,
b2:
pt2.b2,
p2:
pt2.pr2,
b3:
leg.b3,
p3:
leg.p3,
b4:
leg.b4,
p4:
leg.p4
}
);

}

}

}

return chains;

}

function queueBadge(
map,
bar,
price,
text,
above,
color
){

const key =
`${bar}:${above ? "u" : "d"}`;
const prev =
map.get(
key
);

if(
prev
){
if(
!prev.text.includes(
text
)
){
prev.text +=
`\n${text}`;
}

return;
}

map.set(
key,
{
bar,
price,
text,
above,
color
}
);

}

/**
 * @returns {{
 *   badges: Array,
 *   patternLines: Array,
 *   pt4Dots: Array,
 *   pt4Marks: Array,
 *   fractals: Array,
 *   swingLines: Array,
 *   setups: Array
 * }}
 */
export function computePattern12Scene(
candles,
rawSettings
){

const settings =
normalizePattern12Settings(
rawSettings
);
const scene =
{
badges: [],
patternLines: [],
pt4Dots: [],
pt4Marks: [],
fractals: [],
swingLines: [],
setups: []
};

if(
!Array.isArray(
candles
) ||
candles.length <
3
){
return scene;
}

const showLong =
settings.patternMode ===
"long" ||
settings.patternMode ===
"both";
const showShort =
settings.patternMode ===
"short" ||
settings.patternMode ===
"both";

if(
showLong
){

const lngSen =
buildRsiSwingLog(
candles,
settings.lngRsiLength,
{
showFractals:
settings.lngShowFractals,
showSwingLines:
settings.lngShowRsiSwingLines,
fractalUpColor:
"#84cc16",
fractalDownColor:
"#22d3ee",
swingLineColor:
"#22d3ee",
overbought:
settings.rsiOverbought,
oversold:
settings.rsiOversold
}
);
const lngMic =
buildRsiSwingLog(
candles,
settings.lngMicRsiLength,
{
showFractals:
settings.lngShowMicFractals,
showSwingLines:
settings.lngShowMicRsiSwingLines,
fractalUpColor:
"#009688",
fractalDownColor:
"#f44336",
swingLineColor:
"rgba(0,150,136,0.6)",
overbought:
settings.rsiOverbought,
oversold:
settings.rsiOversold
}
);

scene.fractals.push(
...lngSen.extras.fractals,
...lngMic.extras.fractals
);
scene.swingLines.push(
...lngSen.extras.swingLines,
...lngMic.extras.swingLines
);

const chains =
scanCompletePatterns(
"long",
candles,
lngSen.log,
lngMic.log,
null,
settings
);
const badgeMap =
new Map();

for(
const chain of chains
){

scene.setups.push(
{
...chain,
side:
"long"
}
);

if(
settings.showPt1Badges
){
queueBadge(
badgeMap,
chain.b1,
chain.p1,
"Точка 1",
true,
"#f97316"
);
}

if(
settings.showPt2Badges
){
queueBadge(
badgeMap,
chain.b2,
chain.p2,
"Точка 2",
false,
"#1565c0"
);
}

if(
settings.showPt3Badges
){
queueBadge(
badgeMap,
chain.b3,
chain.p3,
"Точка 3",
true,
"#7b1fa2"
);
}

if(
settings.showPatternLines
){
scene.patternLines.push(
{
barA:
chain.b1,
priceA:
chain.p1,
barB:
chain.b3,
priceB:
chain.p3
},
{
barA:
chain.b2,
priceA:
chain.p2,
barB:
chain.b4,
priceB:
chain.p4
}
);
}

if(
settings.showLngPt4Dot
){
scene.pt4Dots.push(
{
bar:
chain.b4,
price:
chain.p4,
side:
"long"
}
);
}

if(
settings.showLngPt4Mark
){
scene.pt4Marks.push(
{
bar:
chain.b4,
price:
chain.p4,
label:
"Long",
color:
"#84cc16",
lineBars:
settings.lngPt4LineBars,
side:
"long"
}
);
}

}

scene.badges.push(
...badgeMap.values()
);

}

if(
showShort
){

const shtSen =
buildShortSenLog(
candles,
settings.shtRsiLength,
{
showFractals:
settings.shtShowFractals,
showSwingLines:
settings.shtShowRsiSwingLines,
fractalUpColor:
"#fb923c",
fractalDownColor:
"#e040fb",
swingLineColor:
"#e040fb",
overbought:
settings.rsiOverbought,
oversold:
settings.rsiOversold
}
);
const shtMic =
buildRsiSwingLog(
candles,
settings.shtMicRsiLength,
{
showFractals:
settings.shtShowMicFractals,
showSwingLines:
settings.shtShowMicRsiSwingLines,
fractalUpColor:
"#009688",
fractalDownColor:
"#f44336",
swingLineColor:
"rgba(0,150,136,0.6)",
overbought:
settings.rsiOverbought,
oversold:
settings.rsiOversold
}
);

scene.fractals.push(
...shtSen.extras.fractals,
...shtMic.extras.fractals
);
scene.swingLines.push(
...shtSen.extras.swingLines,
...shtMic.extras.swingLines
);

const chains =
scanCompletePatterns(
"short",
candles,
shtSen.log,
shtMic.log,
shtSen.preHighs,
settings
);
const badgeMap =
new Map();

for(
const chain of chains
){

scene.setups.push(
{
...chain,
side:
"short"
}
);

if(
settings.showPt1Badges
){
queueBadge(
badgeMap,
chain.b1,
chain.p1,
"Точка 1",
false,
"#f97316"
);
}

if(
settings.showPt2Badges
){
queueBadge(
badgeMap,
chain.b2,
chain.p2,
"Точка 2",
true,
"#1565c0"
);
}

if(
settings.showPt3Badges
){
queueBadge(
badgeMap,
chain.b3,
chain.p3,
"Точка 3",
false,
"#7b1fa2"
);
}

if(
settings.showPatternLines
){
scene.patternLines.push(
{
barA:
chain.b1,
priceA:
chain.p1,
barB:
chain.b3,
priceB:
chain.p3
},
{
barA:
chain.b2,
priceA:
chain.p2,
barB:
chain.b4,
priceB:
chain.p4
}
);
}

if(
settings.showShtPt4Dot
){
scene.pt4Dots.push(
{
bar:
chain.b4,
price:
chain.p4,
side:
"short"
}
);
}

if(
settings.showShtPt4Mark
){
scene.pt4Marks.push(
{
bar:
chain.b4,
price:
chain.p4,
label:
"Short",
color:
"#ef4444",
lineBars:
settings.shtPt4LineBars,
side:
"short"
}
);
}

}

scene.badges.push(
...badgeMap.values()
);

}

return scene;

}
