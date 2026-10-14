/**
 * Свечи символа в памяти вкладки.
 * Повторный заход рисует уже скачанное окно сразу, сеть добирает только край.
 */
const MAX_ENTRIES =
32;

/** @type {Map<string, { candles: object[], coversVisible: boolean }>} */
const entries =
new Map();

export function historyCacheKey(
exchangeId,
symbol,
tf
){

return [
String(
exchangeId ||
"bybit"
).trim().toLowerCase(),
String(
symbol ||
""
).trim().toUpperCase(),
String(
tf ||
""
)
].join(
"|"
);

}

export function peekHistoryCache(
exchangeId,
symbol,
tf
){

const key =
historyCacheKey(
exchangeId,
symbol,
tf
);
const row =
entries.get(
key
);

if(
!row
){
return null;
}

entries.delete(
key
);
entries.set(
key,
row
);

return row;

}

export function putHistoryCache(
exchangeId,
symbol,
tf,
candles,
extra = {}
){

if(
!symbol ||
!Array.isArray(
candles
) ||
!candles.length
){
return;
}

const key =
historyCacheKey(
exchangeId,
symbol,
tf
);
const copy =
candles.map(
row=>({
time:
Number(
row?.time
) ||
0,
open:
Number(
row?.open
) ||
0,
high:
Number(
row?.high
) ||
0,
low:
Number(
row?.low
) ||
0,
close:
Number(
row?.close
) ||
0,
volume:
Number(
row?.volume
) ||
0
})
);

entries.delete(
key
);
entries.set(
key,
{
candles:
copy,
coversVisible:
extra.coversVisible ===
true
}
);

while(
entries.size >
MAX_ENTRIES
){

const oldest =
entries.keys().next().value;

entries.delete(
oldest
);

}

}

export function mergeCandleRows(
existing,
incoming,
options = {}
){

const preferIncoming =
options.preferIncoming ===
true;
const limit =
Math.max(
0,
Number(
options.limit
) ||
0
);
const byTime =
new Map();
const first =
preferIncoming
? existing
: incoming;
const second =
preferIncoming
? incoming
: existing;

for(
const row of first ||
[]
){

if(
row &&
Number.isFinite(
row.time
)
){
byTime.set(
row.time,
row
);
}

}

for(
const row of second ||
[]
){

if(
row &&
Number.isFinite(
row.time
)
){
byTime.set(
row.time,
row
);
}

}

let merged =
Array.from(
byTime.values()
).sort(
(
a,
b
)=>
a.time -
b.time
);

if(
limit >
0 &&
merged.length >
limit
){
merged =
merged.slice(
merged.length -
limit
);
}

return merged;

}

/**
 * Насколько сдвинуть видимый logical range после merge.
 * Старые бары слева увеличивают индексы, обрезка слева уменьшает.
 */
export function logicalIndexShift(
previous,
merged
){

if(
!Array.isArray(
previous
) ||
!previous.length ||
!Array.isArray(
merged
) ||
!merged.length
){
return 0;
}

const prevFirst =
previous[
0
].time;
let prepended =
0;

for(
const row of merged
){

if(
row.time <
prevFirst
){
prepended++;
}else{
break;
}

}

const kept =
new Set(
merged.map(
row=>
row.time
)
);
let removed =
0;

for(
const row of previous
){

if(
!kept.has(
row.time
)
){
removed++;
}else{
break;
}

}

return prepended -
removed;

}
