/**
 * Метки RSI Touch Flip на графике Алго (касания OS/OB, входы, SELL ALL).
 */

const COLOR_OS =
"#26a69a";
const COLOR_OB =
"#ef5350";
const COLOR_CLOSE =
"#ab47bc";

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
const tradeTexts =
bucket.texts.filter(
text=>
text !==
"OS" &&
text !==
"OB"
);
const label =
tradeTexts.length
? tradeTexts.join(
" "
)
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
COLOR_OB;
}else{
position =
"belowBar";
shape =
"arrowDown";
color =
COLOR_OS;
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
return series.__algoRsiFlipMarkersPlugin ||
null;
}

if(
typeof LightweightCharts !==
"undefined" &&
typeof LightweightCharts.createSeriesMarkers ===
"function"
){
if(
series.__algoRsiFlipMarkersPlugin?.setMarkers
){
series.__algoRsiFlipMarkersPlugin.setMarkers(
markers
);
return series.__algoRsiFlipMarkersPlugin;
}

if(
series.__algoRsiFlipMarkersPlugin?.detach
){
series.__algoRsiFlipMarkersPlugin.detach();
}

series.__algoRsiFlipMarkersPlugin =
LightweightCharts.createSeriesMarkers(
series,
markers
);
return series.__algoRsiFlipMarkersPlugin;
}
}catch(
err
){
console.warn(
"[algo-rsi-touch-flip] markers",
err?.message ||
err
);
}

return null;

}

/**
 * @param {{ getSeries: () => object|null }} host
 */
export function mountRsiTouchFlipOverlay(
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
series?.__algoRsiFlipMarkersPlugin?.detach
){
try{
series.__algoRsiFlipMarkersPlugin.detach();
}catch{
/* ignore */
}

series.__algoRsiFlipMarkersPlugin =
null;
}

}

return {
setMarks,
clear,
destroy
};

}
