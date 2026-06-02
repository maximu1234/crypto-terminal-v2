const LEGACY_TF_RE =
/^(.+)_(1|5|15|60|240|D)$/;

export const DRAWINGS_TOMBSTONES_KEY =
"__tombstones__";

/** После «Удалить всё» на Алерты — не поднимать старый JSON из user_settings. */
export const DRAWINGS_GLOBAL_CLEAR_KEY =
"drawings_global_clear_v1";

/** Флаг миграции drawings JSON blob → user_drawings table. */
export const BLOB_MIGRATED_KEY =
"drawings_table_migrated_v1";

const LOCAL_TOMBSTONES_KEY =
"drawings_tombstones_v1";

export function getShapeRevisionTime(
shape
){

if(
!shape ||
typeof shape !== "object"
){
return 0;
}

const updated =
Number(
shape.updatedAt
);

if(
Number.isFinite(updated) &&
updated >
0
){
return updated;
}

const created =
Number(
shape.createdAt
);

if(
Number.isFinite(created) &&
created >
0
){
return created;
}

const alertCreated =
Number(
shape.alertCreatedAt
);

if(
Number.isFinite(alertCreated) &&
alertCreated >
0
){
return alertCreated;
}

const id =
String(
shape.id ||
""
);

const match =
id.match(
/^d_(\d+)_/
);

if(
match
){
return Number(
match[
1
]
) ||
0;
}

return 0;

}

export function touchShapeRevision(
shape
){

if(
!shape ||
typeof shape !== "object"
){
return shape;
}

shape.updatedAt =
Date.now();

return shape;

}

function pickNewerShape(
a,
b
){

if(
!a
){
return b;
}

if(
!b
){
return a;
}

return getShapeRevisionTime(
a
) >=
getShapeRevisionTime(
b
)
? a
: b;

}

export function mergeShapeLists(
localList,
cloudList
){

const local =
Array.isArray(
localList
)
? localList
: [];

const cloud =
Array.isArray(
cloudList
)
? cloudList
: [];

const byId =
new Map();

for(
const shape of cloud
){

if(
shape?.id
){
byId.set(
String(
shape.id
),
shape
);
}

}

for(
const shape of local
){

if(
!shape?.id
){
continue;
}

const id =
String(
shape.id
);
const prev =
byId.get(
id
);

byId.set(
id,
pickNewerShape(
prev,
shape
)
);

}

return [
...byId.values()
];

}

export function mergeDrawingsMaps(
localMap,
cloudMap
){

const local =
localMap &&
typeof localMap ===
"object"
? localMap
: {};

const cloud =
cloudMap &&
typeof cloudMap ===
"object"
? cloudMap
: {};

const symbols =
new Set([
...Object.keys(
local
),
...Object.keys(
cloud
)
]);

const out =
{};

for(
const sym of symbols
){

const key =
String(
sym
).trim().toUpperCase();

if(
!key
){
continue;
}

out[
key
] =
mergeShapeLists(
local[
key
],
cloud[
key
]
);

}

return out;

}

export function loadLocalTombstones(){

try{

return normalizeTombstonesMap(
JSON.parse(
localStorage.getItem(
LOCAL_TOMBSTONES_KEY
) ||
"{}"
)
);

}catch{

return {};

}

}

export function saveLocalTombstones(
map
){

const norm =
normalizeTombstonesMap(
map
);

if(
!Object.keys(
norm
).length
){

localStorage.removeItem(
LOCAL_TOMBSTONES_KEY
);
return;

}

localStorage.setItem(
LOCAL_TOMBSTONES_KEY,
JSON.stringify(
norm
)
);

}

export function normalizeTombstonesMap(
raw
){

if(
!raw ||
typeof raw !==
"object" ||
Array.isArray(
raw
)
){
return {};
}

const out =
{};

for(
const [
sym,
ids
] of Object.entries(
raw
)
){

const key =
String(
sym
).trim().toUpperCase();

if(
!key ||
!ids ||
typeof ids !==
"object" ||
Array.isArray(
ids
)
){
continue;
}

const bucket =
{};

for(
const [
id,
ts
] of Object.entries(
ids
)
){

const n =
Number(
ts
);

if(
id &&
Number.isFinite(
n
) &&
n >
0
){
bucket[
String(
id
)
] =
n;
}

}

if(
Object.keys(
bucket
).length
){
out[
key
] =
bucket;
}

}

return out;

}

export function mergeTombstoneMaps(
a,
b
){

const out =
normalizeTombstonesMap(
a
);

for(
const [
sym,
ids
] of Object.entries(
normalizeTombstonesMap(
b
)
)
){

if(
!out[
sym
]
){
out[
sym
] =
{};
}

for(
const [
id,
ts
] of Object.entries(
ids
)
){

const prev =
out[
sym
][
id
] ||
0;

out[
sym
][
id
] =
Math.max(
prev,
ts
);
}

}

return out;

}

export function recordDrawingTombstone(
symbol,
shapeId
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const id =
String(
shapeId ||
""
).trim();

if(
!sym ||
!id
){
return;
}

const all =
loadLocalTombstones();

if(
!all[
sym
]
){
all[
sym
] =
{};
}

all[
sym
][
id
] =
Date.now();

saveLocalTombstones(
all
);

}

export function clearDrawingTombstone(
symbol,
shapeId
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const id =
String(
shapeId ||
""
).trim();

if(
!sym ||
!id
){
return false;
}

const all =
loadLocalTombstones();
const bucket =
all[
sym
];

if(
!bucket ||
!Object.prototype.hasOwnProperty.call(
bucket,
id
)
){
return false;
}

delete bucket[
id
];

if(
!Object.keys(
bucket
).length
){
delete all[
sym
];
}

saveLocalTombstones(
all
);

return true;

}

export function applyTombstonesToShapeList(
list,
tombstonesForSym
){

const shapes =
Array.isArray(
list
)
? list
: [];

const tombs =
tombstonesForSym &&
typeof tombstonesForSym ===
"object"
? tombstonesForSym
: {};

if(
!Object.keys(
tombs
).length
){
return shapes;
}

return shapes.filter(
shape=>{

const id =
String(
shape?.id ||
""
);

const delAt =
Number(
tombs[
id
]
);

if(
!Number.isFinite(
delAt
) ||
delAt <
1
){
return true;
}

return getShapeRevisionTime(
shape
) >
delAt;

}
);

}

export function unpackCloudDrawings(
raw
){

if(
!raw ||
typeof raw !==
"object" ||
Array.isArray(
raw
)
){
return {
shapes: {},
tombstones: {}
};
}

const tombstones =
normalizeTombstonesMap(
raw[
DRAWINGS_TOMBSTONES_KEY
]
);

const shapes =
{};

for(
const [
sym,
list
] of Object.entries(
raw
)
){

if(
sym ===
DRAWINGS_TOMBSTONES_KEY
){
continue;
}

if(
typeof sym !==
"string" ||
!sym ||
!Array.isArray(
list
)
){
continue;
}

shapes[
String(
sym
).trim().toUpperCase()
] =
list;

}

return {
shapes,
tombstones
};

}

export function packCloudDrawings(
shapeMap,
tombstoneMap
){

const shapes =
shapeMap &&
typeof shapeMap ===
"object"
? {
...shapeMap
}
: {};

const tombstones =
normalizeTombstonesMap(
tombstoneMap
);

delete shapes[
DRAWINGS_TOMBSTONES_KEY
];

if(
Object.keys(
tombstones
).length
){
shapes[
DRAWINGS_TOMBSTONES_KEY
] =
tombstones;
}

return shapes;

}

export function mergeDrawingsPayload(
localShapes,
cloudShapes,
localTombs,
cloudTombs
){

const mergedTombs =
mergeTombstoneMaps(
localTombs,
cloudTombs
);

const local =
localShapes &&
typeof localShapes ===
"object"
? localShapes
: {};

const cloud =
cloudShapes &&
typeof cloudShapes ===
"object"
? cloudShapes
: {};

const symbols =
new Set([
...Object.keys(
local
),
...Object.keys(
cloud
)
]);

const shapes =
{};

for(
const sym of symbols
){

const key =
String(
sym
).trim().toUpperCase();

if(
!key
){
continue;
}

const list =
mergeShapeLists(
local[
key
],
cloud[
key
]
);

shapes[
key
] =
applyTombstonesToShapeList(
list,
mergedTombs[
key
]
);

}

return {
shapes,
tombstones: mergedTombs
};

}

/**
 * Удалить все ключи drawings_* и метаданные синхронизации (страница «Алерты»).
 */
export function purgeAllLocalDrawingsStorage(){

const symbols =
new Set();

const keys = [];

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
!suffix
){
continue;
}

keys.push(
key
);

const legacy =
suffix.match(
LEGACY_TF_RE
);

symbols.add(
legacy
? legacy[1]
: suffix
);

}

keys.forEach(k=>{
localStorage.removeItem(
k
);
});

try{
localStorage.removeItem(
"drawings_row_sync_v1"
);
localStorage.removeItem(
"drawings_tombstones_v1"
);
localStorage.setItem(
DRAWINGS_GLOBAL_CLEAR_KEY,
String(
Date.now()
)
);
}catch{
/* ignore */
}

return symbols;

}

/**
 * Один shape_id — одна монета (убирает «призрак» BTC с тем же id, что PHAROS).
 */
export function pruneDuplicateShapeIdsAcrossSymbols(){

const local =
collectAllLocalDrawings();
const bestById =
new Map();
const removed =
[];

for(
const [
sym,
list
] of Object.entries(
local
)
){

if(
!Array.isArray(
list
)
){
continue;
}

for(
const shape of list
){

if(
!shape?.id
){
continue;
}

const id =
String(
shape.id
);
const prev =
bestById.get(
id
);

if(
!prev
){
bestById.set(
id,
{
sym,
shape
}
);
continue;
}

const prevRev =
getShapeRevisionTime(
prev.shape
);
const nextRev =
getShapeRevisionTime(
shape
);

if(
nextRev >=
prevRev
){
removed.push({
sym: prev.sym,
id
});
bestById.set(
id,
{
sym,
shape
}
);
}else{
removed.push({
sym,
id
});
}

}

}

if(
!removed.length
){
return [];
}

for(
const {
sym,
id
} of removed
){

const key =
`drawings_${sym}`;
let list =
[];

try{
list =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);
}catch{
list =
[];
}

if(
!Array.isArray(
list
)
){
continue;
}

const next =
list.filter(
s=>
String(
s?.id ||
""
) !==
id
);

if(
next.length !==
list.length
){
localStorage.setItem(
key,
JSON.stringify(
next
)
);
}

}

console.log(
"[drawings] убраны дубликаты shape_id на других монетах:",
removed.length
);

return removed;

}

export function collectAllLocalDrawings(){

const out =
{};

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
LEGACY_TF_RE.test(
suffix
)
){
continue;
}

try{

const list =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);

if(
Array.isArray(
list
)
){
out[
suffix
] =
list;
}

}catch{
/* ignore */
}

}

return out;

}

export function applyDrawingsMapToLocal(
map,
opts = {}
){

if(
!map ||
typeof map !==
"object"
){
return;
}

const merge =
opts.merge !==
false;

const cloudSyms =
new Set(
Object.keys(
map
).map(
sym=>
String(
sym
).trim().toUpperCase()
).filter(
Boolean
)
);

if(
!merge
){

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
LEGACY_TF_RE.test(
suffix
) ||
cloudSyms.has(
suffix
)
){
continue;
}

localStorage.removeItem(
key
);

}

}else{

for(
let i = 0;
i <
localStorage.length;
i++
){

const key =
localStorage.key(
i
);

if(
!key?.startsWith(
"drawings_"
)
){
continue;
}

const suffix =
key.slice(
"drawings_".length
);

if(
LEGACY_TF_RE.test(
suffix
)
){
continue;
}

if(
cloudSyms.has(
suffix
)
){
continue;
}

}

}

for(
const [
sym,
list
] of Object.entries(
map
)
){

const norm =
String(
sym
).trim().toUpperCase();

if(
!norm
){
continue;
}

const key =
`drawings_${norm}`;

if(
!Array.isArray(
list
) ||
list.length ===
0
){

if(
!merge
){
localStorage.removeItem(
key
);
}

continue;
}

let next =
list;

if(
merge
){

let localList =
[];

try{
localList =
JSON.parse(
localStorage.getItem(
key
) ||
"[]"
);
}catch{
localList =
[];
}

if(
!Array.isArray(
localList
)
){
localList =
[];
}

next =
mergeShapeLists(
localList,
list
);

}

localStorage.setItem(
key,
JSON.stringify(
next
)
);

}

}
