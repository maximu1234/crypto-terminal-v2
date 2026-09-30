/**
 * Метки MACD Flip Touch на графике Алго (касания OS/OB, входы, BUY ALL / SELL ALL).
 */

const COLOR_OS =
"#26a69a";
const COLOR_OB =
"#ef5350";
const COLOR_TOUCH =
"#9ca3af";
const COLOR_CLOSE =
"#ab47bc";
const COLOR_LIQ =
"#d50000";

function toUnixTime(
value
){

const n =
Number(
value
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return null;
}

return n >
1e12
? Math.floor(
n /
1000
)
: n;

}

/**
 * Несколько событий на одном баре → одна метка LW Charts.
 * @param {Array<{time:number, kind:string, text:string}>} marks
 */
export function marksToSeriesMarkers(
marks
){

const byTime =
new Map();

for(
const mark of Array.isArray(
marks
)
? marks
: []
){
const time =
toUnixTime(
mark?.time
);

if(
time ==
null
){
continue;
}

const bucket =
byTime.get(
time
) ||
{
time,
kinds:
new Set(),
texts:
[]
};
bucket.kinds.add(
mark.kind
);

if(
mark.text &&
!bucket.texts.includes(
mark.text
)
){
bucket.texts.push(
mark.text
);
}

byTime.set(
time,
bucket
);
}

const out =
[];

for(
const bucket of byTime.values()
){
const hasClose =
bucket.kinds.has(
"close"
);
const hasLong =
bucket.kinds.has(
"long"
);
const hasShort =
bucket.kinds.has(
"short"
);
const hasOs =
bucket.kinds.has(
"os"
);
const hasOb =
bucket.kinds.has(
"ob"
);
const hasLiq =
bucket.kinds.has(
"liquidation"
);
const tradeTexts =
bucket.texts.filter(
text=>
text !==
"OS" &&
text !==
"OB" &&
text !==
"LIQ"
);
const label =
tradeTexts.length
? tradeTexts.join(
" "
)
: hasLiq
? "LIQ"
: hasOs
? "OS"
: hasOb
? "OB"
: "";

let position =
"belowBar";
let shape =
"arrowUp";
let color =
COLOR_OS;

if(
hasLiq
){
position =
"inBar";
shape =
"circle";
color =
COLOR_LIQ;
}else if(
hasClose &&
hasLong
){
position =
"belowBar";
shape =
"arrowUp";
color =
COLOR_OS;
}else if(
hasClose &&
hasShort
){
position =
"aboveBar";
shape =
"arrowDown";
color =
COLOR_OB;
}else if(
hasClose
){
position =
hasOb
? "aboveBar"
: "belowBar";
shape =
hasOb
? "arrowDown"
: "arrowUp";
color =
COLOR_CLOSE;
}else if(
hasLong
){
position =
"belowBar";
shape =
"arrowUp";
color =
COLOR_OS;
}else if(
hasShort
){
position =
"aboveBar";
shape =
"arrowDown";
color =
COLOR_OB;
}else if(
hasOb
){
position =
"aboveBar";
shape =
"arrowUp";
color =
COLOR_TOUCH;
}else{
position =
"belowBar";
shape =
"arrowDown";
color =
COLOR_TOUCH;
}

out.push(
{
time:
bucket.time,
position,
shape,
color,
text:
label
}
);
}

out.sort(
(
a,
b
)=>
a.time -
b.time
);
return out;

}

function applyMarkers(
series,
markers
){

if(
!series
){
return null;
}

try{
if(
typeof series.setMarkers ===
"function"
){
series.setMarkers(
markers
);
return series.__algoMacdFlipMarkersPlugin ||
null;
}

if(
typeof LightweightCharts !==
"undefined" &&
typeof LightweightCharts.createSeriesMarkers ===
"function"
){
if(
series.__algoMacdFlipMarkersPlugin?.setMarkers
){
series.__algoMacdFlipMarkersPlugin.setMarkers(
markers
);
return series.__algoMacdFlipMarkersPlugin;
}

if(
series.__algoMacdFlipMarkersPlugin?.detach
){
series.__algoMacdFlipMarkersPlugin.detach();
}

series.__algoMacdFlipMarkersPlugin =
LightweightCharts.createSeriesMarkers(
series,
markers
);
return series.__algoMacdFlipMarkersPlugin;
}
}catch(
err
){
console.warn(
"[algo-macd-flip-touch] markers",
err?.message ||
err
);
}

return null;

}

/**
 * @param {{ getSeries: () => object|null }} host
 */
export function mountMacdFlipTouchOverlay(
host
){

function clear(){

const series =
host?.getSeries?.();
applyMarkers(
series,
[]
);

}

function setMarks(
marks
){

const series =
host?.getSeries?.();
applyMarkers(
series,
marksToSeriesMarkers(
marks
)
);

}

function destroy(){

clear();
const series =
host?.getSeries?.();

if(
series?.__algoMacdFlipMarkersPlugin?.detach
){
try{
series.__algoMacdFlipMarkersPlugin.detach();
}catch{
/* ignore */
}

series.__algoMacdFlipMarkersPlugin =
null;
}

}

return {
setMarks,
clear,
destroy
};

}
