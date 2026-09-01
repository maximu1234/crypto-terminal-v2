/**
 * Screener min 24h volume filter (turnover, same units as tickerMap.volume24).
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
