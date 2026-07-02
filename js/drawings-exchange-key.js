import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

import {
EXCHANGE_IDS
} from "./exchanges/registry.js?v=1";

export const DRAWINGS_TF_SUFFIX_RE =
/^(.+)_(1|5|15|60|240|D)$/;

const EXCHANGE_PREFIX_RE =
/^(bybit|bingx)_(.+)$/;

export const DRAWINGS_META_STORAGE_KEYS =
new Set([
"drawings_global_clear_v1",
"drawings_table_migrated_v1",
"drawings_tombstones_v1",
"drawings_row_sync_v1",
"drawings_exchange_storage_migrated_v1",
"drawings_local_updated_at",
"drawings_synced_signature"
]);

const LEGACY_MIGRATED_KEY =
"drawings_exchange_storage_migrated_v1";

function normalizeExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase();

return EXCHANGE_IDS.includes(
id
)
? id
: "bybit";

}

function normalizeSymbol(
symbol
){

return String(
symbol ||
""
).trim().toUpperCase();

}

/**
 * @param {string} symbol
 * @param {{ exchangeId?: string, tfSuffix?: string }} [opts]
 */
export function drawingsStorageKey(
symbol,
opts = {}
){

const sym =
normalizeSymbol(
symbol
);
const ex =
normalizeExchangeId(
opts.exchangeId
);
const tfSuffix =
String(
opts.tfSuffix ||
""
);

return `drawings_${ex}_${sym}${tfSuffix}`;

}

export function isDrawingsMetaStorageKey(
key
){

return DRAWINGS_META_STORAGE_KEYS.has(
String(
key ||
""
)
);

}

export function isExchangeScopedDrawingsKey(
key
){

return EXCHANGE_PREFIX_RE.test(
String(
key ||
""
).slice(
"drawings_".length
)
);

}

/**
 * @returns {{ exchangeId: string, symbol: string, tfSuffix: string, legacy?: boolean } | null}
 */
export function parseDrawingsStorageKey(
key
){

if(
!key?.startsWith(
"drawings_"
)
){
return null;
}

if(
isDrawingsMetaStorageKey(
key
)
){
return null;
}

const rest =
key.slice(
"drawings_".length
);

const exMatch =
rest.match(
EXCHANGE_PREFIX_RE
);

if(
exMatch
){

const exchangeId =
exMatch[
1
];
const tail =
exMatch[
2
];
const tfMatch =
tail.match(
DRAWINGS_TF_SUFFIX_RE
);

if(
tfMatch
){
return {
exchangeId,
symbol:
normalizeSymbol(
tfMatch[
1
]
),
tfSuffix:
`_${tfMatch[
2
]}`,
legacy:
false
};
}

return {
exchangeId,
symbol:
normalizeSymbol(
tail
),
tfSuffix:
"",
legacy:
false
};

}

const legacyTf =
rest.match(
DRAWINGS_TF_SUFFIX_RE
);

if(
legacyTf
){
return {
exchangeId:
"bybit",
symbol:
normalizeSymbol(
legacyTf[
1
]
),
tfSuffix:
`_${legacyTf[
2
]}`,
legacy:
true
};
}

return {
exchangeId:
"bybit",
symbol:
normalizeSymbol(
rest
),
tfSuffix:
"",
legacy:
true
};

}

export function isDrawingsStorageKey(
key
){

return !!parseDrawingsStorageKey(
key
);

}

export function symbolFromDrawingsKey(
key
){

return parseDrawingsStorageKey(
key
)?.symbol ||
"";

}

export function exchangeFromDrawingsKey(
key
){

return parseDrawingsStorageKey(
key
)?.exchangeId ||
"bybit";

}

function mergeDrawingLists(
a,
b
){

const out =
Array.isArray(
a
)
? [
...a
]
: [];
const seen =
new Set(
out.map(
shape=>
String(
shape?.id ||
""
)
).filter(
Boolean
)
);

for(
const shape of Array.isArray(
b
)
? b
: []
){

const id =
String(
shape?.id ||
""
);

if(
!id ||
seen.has(
id
)
){
continue;
}

seen.add(
id
);
out.push(
shape
);

}

return out;

}

export function migrateLegacyDrawingsStorage(){

try{

if(
localStorage.getItem(
LEGACY_MIGRATED_KEY
) ===
"1"
){
return;
}

const moves =
[];

for(
let i =
0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

const parsed =
parseDrawingsStorageKey(
key
);

if(
!parsed?.legacy
){
continue;
}

const newKey =
drawingsStorageKey(
parsed.symbol,
{
exchangeId:
parsed.exchangeId,
tfSuffix:
parsed.tfSuffix
}
);

if(
newKey ===
key
){
continue;
}

moves.push({
from:
key,
to:
newKey
});

}

for(
const {
from,
to
} of moves
){

const raw =
localStorage.getItem(
from
);

if(
raw ==
null
){
localStorage.removeItem(
from
);
continue;
}

const existing =
localStorage.getItem(
to
);

if(
existing
){

try{

const merged =
mergeDrawingLists(
JSON.parse(
existing
),
JSON.parse(
raw
)
);

localStorage.setItem(
to,
JSON.stringify(
merged
)
);

}catch{
localStorage.setItem(
to,
raw
);
}

}else{
localStorage.setItem(
to,
raw
);
}

localStorage.removeItem(
from
);

}

localStorage.setItem(
LEGACY_MIGRATED_KEY,
"1"
);

}catch{
/* ignore */
}

}

export function listDrawingsStorageKeys(
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId
);
const keys =
[];

for(
let i =
0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);
const parsed =
parseDrawingsStorageKey(
key
);

if(
!parsed ||
parsed.exchangeId !==
ex ||
parsed.tfSuffix
){
continue;
}

keys.push(
key
);

}

return keys;

}
