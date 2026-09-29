/**
 * Min 24h volume filter (turnover, same units as tickerMap.volume24 / coin.volume24).
 * Used by Screener and Terminal coin list.
 */

export function normalizeMinVolume(
value
){

const n =
Number(
value
);

return Number.isFinite(n) &&
n > 0
? n
: 0;

}

export function syncMinVolumeFilterInput(
input,
minVolume
){

if(
!input
){
return;
}

try{

if(
typeof document !==
"undefined" &&
document.activeElement ===
input
){
return;
}

}catch{
/* ignore */
}

const n =
normalizeMinVolume(
minVolume
);

const next =
n >
0
? formatMinVolumeFilter(
n
)
: "";

if(
input.value !==
next
){
input.value =
next;
}

}

export function formatMinVolumeFilter(
value
){

const n =
normalizeMinVolume(
value
);

if(
!(
n >
0
)
){
return "";
}

return String(
Math.round(
n
)
).replace(
/\B(?=(\d{3})+(?!\d))/g,
","
);

}

export function formatMinVolumeInputText(
raw
){

const text =
String(
raw ??
""
);

if(
!text.trim()
){
return "";
}

const trimmed =
text.trim();

if(
/[kmb]$/i.test(
trimmed
) ||
trimmed.includes(
"."
)
){
return text;
}

const digits =
text.replace(
/[^\d]/g,
""
).replace(
/^0+(?=\d)/,
""
);

if(
!digits
){
return "";
}

return digits.replace(
/\B(?=(\d{3})+(?!\d))/g,
","
);

}

export function parseMinVolumeFilter(
raw
){

const text =
String(
raw ??
""
).trim();

if(
!text
){
return 0;
}

const compact =
text
.replace(
/[\s\u00a0_]/g,
""
)
.replace(
/,/g,
""
);

const m =
compact.match(
/^(\d+(?:\.\d+)?)([kmb])?$/i
);

if(
!m
){
return 0;
}

const base =
Number(
m[
1
]
);

if(
!Number.isFinite(base) ||
base <=
0
){
return 0;
}

const suf =
(
m[
2
] ||
""
).toLowerCase();

const mul =
suf ===
"k"
? 1e3
: suf ===
"m"
? 1e6
: suf ===
"b"
? 1e9
: 1;

return base *
mul;

}

export function filterSymbolsByMinVolume(
symbols,
minVolume,
getVolume24
){

const list =
Array.isArray(
symbols
)
? symbols.slice()
: [];

const threshold =
normalizeMinVolume(
minVolume
);

if(
!(
threshold >
0
)
){
return list;
}

const volumeOf =
typeof getVolume24 ===
"function"
? getVolume24
: ()=>
NaN;

return list.filter(
sym=>{

const vol =
Number(
volumeOf(
sym
)
);

return Number.isFinite(
vol
) &&
vol >=
threshold;

}
);

}

export function filterMarketItemsByMinVolume(
items,
minVolume
){

const list =
Array.isArray(
items
)
? items.slice()
: [];

const threshold =
normalizeMinVolume(
minVolume
);

if(
!(
threshold >
0
)
){
return list;
}

return list.filter(
item=>{

const vol =
Number(
item?.volume24
);

return Number.isFinite(
vol
) &&
vol >=
threshold;

}
);

}

/**
 * @param {HTMLInputElement} input
 * @param {{ onCommit: (value: number) => void }} opts
 */
export function mountMinVolumeFilterInput(
input,
opts
){

const onCommit =
opts?.onCommit;

if(
!input ||
typeof onCommit !==
"function"
){
return;
}

let applyTimer =
0;

const applyFromInput =
()=>{
const raw =
String(
input.value ??
""
);

if(
!raw.trim()
){
onCommit(
0
);
return;
}

const n =
parseMinVolumeFilter(
raw
);

if(
n >
0
){
onCommit(
n
);
const grouped =
formatMinVolumeFilter(
n
);
if(
input.value !==
grouped
){
input.value =
grouped;
}
}

};

const groupTypedVolume =
()=>{
const raw =
String(
input.value ??
""
);
const caret =
input.selectionStart ??
raw.length;
const digitsBefore =
raw.slice(
0,
caret
).replace(
/[^\d]/g,
""
).length;
const next =
formatMinVolumeInputText(
raw
);

if(
next ===
raw
){
return;
}

input.value =
next;

let pos =
0;
let seen =
0;

while(
pos <
next.length &&
seen <
digitsBefore
){

if(
/\d/.test(
next.charAt(
pos
)
)
){
seen++;
}

pos++;

}

try{
input.setSelectionRange(
pos,
pos
);
}catch{
/* ignore */
}

};

input.addEventListener(
"input",
()=>{
groupTypedVolume();
clearTimeout(
applyTimer
);
applyTimer =
setTimeout(
applyFromInput,
450
);
}
);

input.addEventListener(
"change",
()=>{
clearTimeout(
applyTimer
);
applyFromInput();
}
);

input.addEventListener(
"keydown",
e=>{
if(
e.key ===
"Enter"
){
e.preventDefault();
clearTimeout(
applyTimer
);
applyFromInput();
}
}
);

}
