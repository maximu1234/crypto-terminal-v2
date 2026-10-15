/**
 * Цвет свечей цены на всех графиках.
 * classic — зелёные / красные, mono — все свечи белые.
 * Индикаторы этот режим не красят.
 */
export const CANDLE_COLOR_MODE_KEY =
"chart_candle_color_mode_v1";

export const CANDLE_COLOR_CLASSIC =
"classic";

export const CANDLE_COLOR_MONO =
"mono";

export const CANDLE_COLOR_EVENT =
"chart-candle-color-changed";

const CLASSIC_PAINT =
Object.freeze({
upColor: "#459782",
downColor: "#ef4444",
borderVisible: false,
wickUpColor: "#459782",
wickDownColor: "#ef4444"
});

const MONO_PAINT =
Object.freeze({
upColor: "#ffffff",
downColor: "#ffffff",
borderVisible: false,
wickUpColor: "#ffffff",
wickDownColor: "#ffffff"
});

const seriesRefs =
new Set();

export function getCandleColorMode(){

try{
const raw =
localStorage.getItem(
CANDLE_COLOR_MODE_KEY
);

if(
raw ===
CANDLE_COLOR_MONO
){
return CANDLE_COLOR_MONO;
}
}catch{
/* ignore */
}

return CANDLE_COLOR_CLASSIC;

}

export function candleSeriesPaint(){

return getCandleColorMode() ===
CANDLE_COLOR_MONO
? MONO_PAINT
: CLASSIC_PAINT;

}

export function registerCandleSeries(
series
){

if(
!series ||
typeof series.applyOptions !==
"function" ||
typeof WeakRef !==
"function"
){
return;
}

seriesRefs.add(
new WeakRef(
series
)
);

}

function paintRegisteredCandleSeries(){

const paint =
candleSeriesPaint();

for(
const ref of seriesRefs
){

const series =
ref.deref();

if(
!series
){
seriesRefs.delete(
ref
);
continue;
}

try{
series.applyOptions(
paint
);
}catch{
seriesRefs.delete(
ref
);
}

}

}

export function setCandleColorMode(
mode
){

const next =
mode ===
CANDLE_COLOR_MONO
? CANDLE_COLOR_MONO
: CANDLE_COLOR_CLASSIC;

try{
localStorage.setItem(
CANDLE_COLOR_MODE_KEY,
next
);
}catch{
/* ignore */
}

paintRegisteredCandleSeries();

try{
window.dispatchEvent(
new CustomEvent(
CANDLE_COLOR_EVENT,
{
detail:{
mode:
next
}
}
)
);
}catch{
/* ignore */
}

}

if(
typeof window !==
"undefined"
){

window.addEventListener(
"storage",
event=>{

if(
event.key !==
CANDLE_COLOR_MODE_KEY
){
return;
}

paintRegisteredCandleSeries();

}
);

}
