import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

const GROUPS = ["red", "green", "gray", "blue"];
const LEGACY_FAVORITES_KEY = "favorites";
export const FAVORITES_BY_EXCHANGE_KEY =
"favorites_by_exchange_v1";
const GROUP_PREFIX_RE = /^(red|green|gray|blue):/;

export const TERMINAL_MAX_BLUE_FLAGS =
9;

const FLAG_SORT_ORDER_ASC = ["green", "gray", "blue", "red"];
const FLAG_SORT_ORDER_DESC = ["red", "blue", "gray", "green"];
const FLAG_CYCLE = [null, "red", "green", "gray", "blue"];

export function emptyFavorites(){

return {
red: [],
green: [],
gray: [],
blue: []
};

}

function normalizeGroup(g){

return GROUPS.includes(g) ? g : "red";

}

export function migrateFavorites(raw){

if(
raw &&
typeof raw === "object" &&
!Array.isArray(raw)
){

return {
red: Array.isArray(raw.red) ? raw.red.filter(s=>typeof s === "string") : [],
green: Array.isArray(raw.green) ? raw.green.filter(s=>typeof s === "string") : [],
gray: Array.isArray(raw.gray) ? raw.gray.filter(s=>typeof s === "string") : [],
blue: Array.isArray(raw.blue) ? raw.blue.filter(s=>typeof s === "string") : []
};

}

if(!Array.isArray(raw)){
return emptyFavorites();
}

const out = emptyFavorites();

raw.forEach(entry=>{

if(typeof entry !== "string" || !entry){
return;
}

const m =
entry.match(GROUP_PREFIX_RE);

if(m){

const sym =
entry.slice(m[0].length);

if(sym){
out[m[1]].push(sym);
}

return;
}

out.red.push(entry);

});

return out;

}

function readFavoritesByExchangeStore(){

try{

const raw =
JSON.parse(
localStorage.getItem(
FAVORITES_BY_EXCHANGE_KEY
) ||
"null"
);

if(
raw &&
typeof raw ===
"object" &&
!Array.isArray(
raw
)
){
return raw;
}

}catch{
/* ignore */
}

let legacy =
null;

try{
legacy =
JSON.parse(
localStorage.getItem(
LEGACY_FAVORITES_KEY
) ||
"null"
);
}catch{
/* ignore */
}

const store =
{
bybit:
migrateFavorites(
legacy
)
};

try{
localStorage.setItem(
FAVORITES_BY_EXCHANGE_KEY,
JSON.stringify(
store
)
);
localStorage.removeItem(
LEGACY_FAVORITES_KEY
);
}catch{
/* ignore */
}

return store;

}

function resolveFavoritesExchangeId(
exchangeId
){

return String(
exchangeId ||
getActiveExchangeId()
).trim().toLowerCase();

}

export function loadFavoritesGroups(
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);
const store =
readFavoritesByExchangeStore();

return migrateFavorites(
store[
id
] ||
null
);

}

export function saveFavoritesGroups(
groups,
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);
const store =
readFavoritesByExchangeStore();

store[
id
] =
groups;

localStorage.setItem(
FAVORITES_BY_EXCHANGE_KEY,
JSON.stringify(
store
)
);

try{
window.dispatchEvent(
new CustomEvent(
"favorites-local-changed"
)
);
}catch{
/* ignore */
}

}

export function isTerminalBlueSymbol(
symbol,
groups = loadFavoritesGroups()
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();

if(
!sym
){
return false;
}

return getTerminalBlueSymbols(
groups
).includes(
sym
);

}

export function getFavoriteGroup(symbol, groups){

if(!symbol){
return null;
}

const sym =
String(
symbol
).trim().toUpperCase();

for(const g of GROUPS){

if(
groups[g].some(
entry=>
String(
entry
).trim().toUpperCase() ===
sym
)
){
return g;
}

}

return null;

}

export function canSetBlueFlag(
symbol,
groups,
max = TERMINAL_MAX_BLUE_FLAGS
){

const sym =
String(
symbol || ""
).trim().toUpperCase();

if(
!sym
){
return false;
}

if(
groups.blue.some(
entry=>
String(
entry
).trim().toUpperCase() ===
sym
)
){
return true;
}

return (
groups.blue.length <
max
);

}

export function getTerminalBlueSymbols(
groups = loadFavoritesGroups()
){

const seen =
new Set();
const out =
[];

for(
const entry of groups.blue
){

const sym =
String(
entry ||
""
).trim().toUpperCase();

if(
!sym ||
seen.has(
sym
)
){
continue;
}

seen.add(
sym
);
out.push(
sym
);

if(
out.length >=
TERMINAL_MAX_BLUE_FLAGS
){
break;
}

}

return out;

}

export function setFavoriteGroup(symbol, group, groups){

if(!symbol){
return groups;
}

const sym =
String(symbol).trim().toUpperCase();

GROUPS.forEach(g=>{
groups[g] =
groups[g].filter(
entry=>
String(
entry
).trim().toUpperCase() !==
sym
);
});

if(group){

const g =
normalizeGroup(group);

if(
g === "blue" &&
!canSetBlueFlag(
sym,
groups
)
){
return groups;
}

groups[g].push(sym);

}

return groups;

}

export function favoritesToCloudList(groups){

const list = [];

GROUPS.forEach(g=>{

groups[g].forEach(sym=>{

list.push(
g === "red"
? sym
: `${g}:${sym}`
);

});

});

return list;

}

export function favoritesFromCloudList(list){

return migrateFavorites(
Array.isArray(list) ? list : []
);

}

export function favoritesGroupsToRows(
groups,
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);
const rows =
[];

GROUPS.forEach(
g=>{

groups[
g
].forEach(
sym=>{

const normalized =
String(
sym ||
""
).trim().toUpperCase();

if(
!normalized
){
return;
}

rows.push(
{
exchange_id: id,
symbol: normalized,
flag_group: g
}
);

}
);

}
);

return rows;

}

export function favoritesRowsToGroups(
rows
){

const groups =
emptyFavorites();

if(
!Array.isArray(
rows
)
){
return groups;
}

for(
const row of rows
){

const sym =
String(
row?.symbol ||
""
).trim().toUpperCase();

if(
!sym
){
continue;
}

const g =
normalizeGroup(
row?.flag_group ||
row?.flagGroup ||
"red"
);

if(
groups[
g
].some(
entry=>
String(
entry
).trim().toUpperCase() ===
sym
)
){
continue;
}

groups[
g
].push(
sym
);

}

return groups;

}

const FAVORITES_CLOUD_SYNC_KEY =
"favorites_cloud_sync_v1";

const LEGACY_FAVORITES_LOCAL_TS_KEY =
"favorites_local_updated_at";

const LEGACY_FAVORITES_SYNCED_SIG_KEY =
"favorites_synced_signature";

function readFavoritesCloudSyncStore(){

try{

const raw =
JSON.parse(
localStorage.getItem(
FAVORITES_CLOUD_SYNC_KEY
) ||
"null"
);

if(
raw &&
typeof raw ===
"object" &&
!Array.isArray(
raw
)
){
return raw;
}

}catch{
/* ignore */
}

const legacyTs =
localStorage.getItem(
LEGACY_FAVORITES_LOCAL_TS_KEY
) ||
"";
const legacySig =
localStorage.getItem(
LEGACY_FAVORITES_SYNCED_SIG_KEY
) ||
"";
const store =
{};

if(
legacyTs ||
legacySig
){

store.bybit =
{
updatedAt: legacyTs,
signature: legacySig
};

}

return store;

}

function writeFavoritesCloudSyncStore(
store
){

localStorage.setItem(
FAVORITES_CLOUD_SYNC_KEY,
JSON.stringify(
store
)
);

}

function favoritesCloudSyncBucket(
exchangeId
){

const id =
resolveFavoritesExchangeId(
exchangeId
);
const store =
readFavoritesCloudSyncStore();

if(
!store[
id
]
){
store[
id
] =
{
updatedAt: "",
signature: ""
};
}

return {
id,
store,
bucket: store[
id
]
};

}

export function loadFavoritesCloudUpdatedAt(
exchangeId
){

return favoritesCloudSyncBucket(
exchangeId
).bucket.updatedAt ||
"";

}

export function saveFavoritesCloudUpdatedAt(
iso,
exchangeId
){

const {
id,
store,
bucket
} =
favoritesCloudSyncBucket(
exchangeId
);

if(
iso
){
bucket.updatedAt =
iso;
}else{
bucket.updatedAt =
"";
}

store[
id
] =
bucket;
writeFavoritesCloudSyncStore(
store
);

}

export function saveFavoritesCloudSyncedSignature(
groups,
exchangeId
){

const {
id,
store,
bucket
} =
favoritesCloudSyncBucket(
exchangeId
);

bucket.signature =
favoritesSignature(
groups
);
store[
id
] =
bucket;
writeFavoritesCloudSyncStore(
store
);

}

export function hasUnsyncedFavoritesCloud(
exchangeId
){

const {
bucket
} =
favoritesCloudSyncBucket(
exchangeId
);

return favoritesSignature(
loadFavoritesGroups(
exchangeId
)
) !== (
bucket.signature ||
""
);

}

export function markFavoritesCloudDirty(
exchangeId
){

saveFavoritesCloudUpdatedAt(
new Date().toISOString(),
exchangeId
);

const {
id,
store,
bucket
} =
favoritesCloudSyncBucket(
exchangeId
);

bucket.signature =
"";
store[
id
] =
bucket;
writeFavoritesCloudSyncStore(
store
);

}

export function favoritesSignature(groups){

return GROUPS.map(g=>
`${g}:${[...groups[g]].sort().join(",")}`
).join("|");

}

export function favoritesGroupsEqual(a, b){

return favoritesSignature(a) ===
favoritesSignature(b);

}

export function flagSortRank(group, asc){

const order =
asc
? FLAG_SORT_ORDER_ASC
: FLAG_SORT_ORDER_DESC;

if(!group){
return order.length;
}

const idx =
order.indexOf(group);

return idx === -1
? order.length
: idx;

}

export function cycleFavoriteGroup(current){

const idx =
FLAG_CYCLE.indexOf(current ?? null);
const next =
(idx + 1) % FLAG_CYCLE.length;

return FLAG_CYCLE[next];

}

export const FLAG_TITLES = {
red: "Красный флаг",
green: "Зелёный флаг",
gray: "Серый флаг",
blue: "Синий флаг (Терминал)"
};
