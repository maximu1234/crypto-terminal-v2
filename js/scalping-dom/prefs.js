/**
 * Prefs: стакан для скальпинга (вкл/выкл + автоцентровка).
 */
export const SCALPING_DOM_ENABLED_KEY =
"scalping_dom_enabled_v1";

export const SCALPING_DOM_AUTOCENTER_PCT_KEY =
"scalping_dom_autocenter_pct_v1";

export const SCALPING_DOM_PREF_EVENT =
"scalping-dom-pref-changed";

export const SCALPING_DOM_AUTOCENTER_DEFAULT =
85;

export const SCALPING_DOM_AUTOCENTER_MIN =
50;

export const SCALPING_DOM_AUTOCENTER_MAX =
100;

export function isScalpingDomEnabled(){

try{
return (
localStorage.getItem(
SCALPING_DOM_ENABLED_KEY
) ===
"1"
);
}catch{
return false;
}

}

export function setScalpingDomEnabled(
enabled
){

try{
localStorage.setItem(
SCALPING_DOM_ENABLED_KEY,
enabled
? "1"
: "0"
);
}catch{
/* ignore */
}

window.dispatchEvent(
new CustomEvent(
SCALPING_DOM_PREF_EVENT,
{
detail:{
enabled:
!!enabled
}
}
)
);

}

export function clampScalpingDomAutocenterPct(
value
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
return SCALPING_DOM_AUTOCENTER_DEFAULT;
}

return Math.min(
SCALPING_DOM_AUTOCENTER_MAX,
Math.max(
SCALPING_DOM_AUTOCENTER_MIN,
Math.round(
n
)
)
);

}

export function getScalpingDomAutocenterPct(){

try{
const raw =
localStorage.getItem(
SCALPING_DOM_AUTOCENTER_PCT_KEY
);

if(
raw ==
null ||
raw ===
""
){
return SCALPING_DOM_AUTOCENTER_DEFAULT;
}

return clampScalpingDomAutocenterPct(
raw
);
}catch{
return SCALPING_DOM_AUTOCENTER_DEFAULT;
}

}

export function setScalpingDomAutocenterPct(
value
){

const pct =
clampScalpingDomAutocenterPct(
value
);

try{
localStorage.setItem(
SCALPING_DOM_AUTOCENTER_PCT_KEY,
String(
pct
)
);
}catch{
/* ignore */
}

return pct;

}

export const SCALPING_DOM_VOLUME_KEY =
"scalping_dom_volume_v1";

export const SCALPING_DOM_PRICE_SCALE_KEY =
"scalping_dom_price_scale_v1";

export const SCALPING_DOM_PRICE_SCALE_DEFAULT =
1;

/** Fixed scale multipliers shown in the DOM header select. */
export const SCALPING_DOM_PRICE_SCALE_OPTIONS =
[
1,
2,
5,
10,
25
];

function normalizeVolumeSymbol(
raw
){

return String(
raw ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/[^A-Z0-9]/g,
""
);

}

function readVolumeBySymbol(){

try{
const raw =
localStorage.getItem(
SCALPING_DOM_VOLUME_KEY
);

if(
raw ==
null ||
raw ===
""
){
return {};
}

const parsed =
JSON.parse(
raw
);

if(
!parsed ||
typeof parsed !==
"object" ||
Array.isArray(
parsed
)
){
return {};
}

return parsed;
}catch{
return {};
}

}

function volumeNumber(
raw
){

const n =
Number(
String(
raw ??
""
).replace(
/,/g,
""
)
);

return Number.isFinite(
n
) &&
n >
0
? n
: 0;

}

export function getScalpingDomVolumeInput(
symbol
){

const sym =
normalizeVolumeSymbol(
symbol
);

if(
!sym
){
return 0;
}

const stored =
readVolumeBySymbol()[
sym
];

return volumeNumber(
stored
);

}

export function setScalpingDomVolumeInput(
symbol,
value
){

const sym =
normalizeVolumeSymbol(
symbol
);
const safe =
volumeNumber(
value
);

if(
!sym
){
return safe;
}

const map =
readVolumeBySymbol();

if(
safe >
0
){
map[
sym
] =
safe;
}else{
delete map[
sym
];
}

try{
localStorage.setItem(
SCALPING_DOM_VOLUME_KEY,
JSON.stringify(
map
)
);
}catch{
/* ignore */
}

return safe;

}

export function clampScalpingDomPriceScale(
value
){

const n =
Number(
String(
value ??
""
).replace(
/,/g,
""
).replace(
/^x/i,
""
)
);

if(
!Number.isFinite(
n
) ||
n <=
0
){
return SCALPING_DOM_PRICE_SCALE_DEFAULT;
}

const options =
SCALPING_DOM_PRICE_SCALE_OPTIONS;

for(
const opt of
options
){
if(
opt ===
n
){
return opt;
}

}

/* Snap legacy free-form values to nearest allowed multiplier. */
let best =
options[
0
];
let bestDist =
Math.abs(
n -
best
);

for(
let i =
1;
i <
options.length;
i++
){
const opt =
options[
i
];
const dist =
Math.abs(
n -
opt
);

if(
dist <
bestDist
){
best =
opt;
bestDist =
dist;
}

}

return best;

}

export function getScalpingDomPriceScale(){

try{
const raw =
localStorage.getItem(
SCALPING_DOM_PRICE_SCALE_KEY
);

if(
raw ==
null ||
raw ===
""
){
return SCALPING_DOM_PRICE_SCALE_DEFAULT;
}

return clampScalpingDomPriceScale(
raw
);
}catch{
return SCALPING_DOM_PRICE_SCALE_DEFAULT;
}

}

export function setScalpingDomPriceScale(
value
){

const scale =
clampScalpingDomPriceScale(
value
);

try{
localStorage.setItem(
SCALPING_DOM_PRICE_SCALE_KEY,
String(
scale
)
);
}catch{
/* ignore */
}

return scale;

}
