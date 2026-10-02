/**
 * Sync facade for drawings payloads: memory → IndexedDB (+ dual-write LS).
 * Callers keep sync get/set; hydrate runs in background and must not be
 * awaited on the candle / alert critical path.
 *
 * Meta keys (tombstones, sync flags) stay in localStorage only.
 */
import {
isDrawingsStorageKey,
isDrawingsMetaStorageKey
} from "./drawings-exchange-key.js?v=3";

import {
drawingsIdbAvailable,
drawingsIdbDelete,
drawingsIdbGetAll,
drawingsIdbSet
} from "./drawings-idb.js?v=2";

export const DRAWINGS_IDB_MIGRATED_KEY =
"drawings_idb_migrated_v1";

/** @type {Map<string, string>} */
const cache =
new Map();

/** @type {Promise<void>|null} */
let hydratePromise =
null;

let hydrated =
false;

function lsGet(
key
){

try{
return localStorage.getItem(
key
);
}catch{
return null;
}

}

function lsSet(
key,
value
){

try{
localStorage.setItem(
key,
value
);
return true;
}catch{
return false;
}

}

function lsRemove(
key
){

try{
localStorage.removeItem(
key
);
}catch{
/* ignore */
}

}

function shouldUseKv(
key
){

const k =
String(
key ||
""
);

if(
!k ||
isDrawingsMetaStorageKey(
k
)
){
return false;
}

return isDrawingsStorageKey(
k
) ||
k.startsWith(
"drawings_"
);

}

/**
 * @param {string} key
 * @returns {string|null}
 */
export function drawingsKvGet(
key
){

if(
!shouldUseKv(
key
)
){
return lsGet(
key
);
}

if(
cache.has(
key
)
){
return cache.get(
key
) ??
null;
}

const fromLs =
lsGet(
key
);

if(
fromLs !=
null
){
cache.set(
key,
fromLs
);
}

return fromLs;

}

/**
 * @param {string} key
 * @param {string} value
 */
export function drawingsKvSet(
key,
value
){

const v =
String(
value ??
""
);

if(
!shouldUseKv(
key
)
){
lsSet(
key,
v
);
return;
}

cache.set(
key,
v
);

/* Dual-write: LS keeps cross-tab `storage` events + rollback safety. */
lsSet(
key,
v
);

if(
drawingsIdbAvailable()
){
void drawingsIdbSet(
key,
v
).catch(
()=>{
/* ignore */
}
);
}

}

/**
 * @param {string} key
 */
export function drawingsKvRemove(
key
){

if(
!shouldUseKv(
key
)
){
lsRemove(
key
);
return;
}

cache.delete(
key
);
lsRemove(
key
);

if(
drawingsIdbAvailable()
){
void drawingsIdbDelete(
key
).catch(
()=>{
/* ignore */
}
);
}

}

/**
 * Keys present in memory cache and/or localStorage for an exchange scan.
 * @param {(key: string) => boolean} [predicate]
 * @returns {string[]}
 */
export function drawingsKvListKeys(
predicate
){

const keys =
new Set();

for(
const key of
cache.keys()
){

if(
!predicate ||
predicate(
key
)
){
keys.add(
key
);
}

}

try{

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

if(
!key
){
continue;
}

if(
predicate &&
!predicate(
key
)
){
continue;
}

if(
shouldUseKv(
key
)
){
keys.add(
key
);
}

}

}catch{
/* ignore */
}

return [
...keys
];

}

async function migrateLocalStorageToIdb(){

if(
!drawingsIdbAvailable()
){
return;
}

if(
lsGet(
DRAWINGS_IDB_MIGRATED_KEY
) ===
"1"
){
return;
}

try{

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

if(
!key ||
!shouldUseKv(
key
)
){
continue;
}

const raw =
lsGet(
key
);

if(
raw ==
null
){
continue;
}

await drawingsIdbSet(
key,
raw
);
cache.set(
key,
raw
);

}

lsSet(
DRAWINGS_IDB_MIGRATED_KEY,
"1"
);

}catch{
/* leave flag unset — retry next boot */
}

}

async function hydrateFromIdb(){

if(
!drawingsIdbAvailable()
){
hydrated =
true;
return;
}

await migrateLocalStorageToIdb();

const all =
await drawingsIdbGetAll();

for(
const [
key,
value
] of
all
){

if(
!shouldUseKv(
key
)
){
continue;
}

cache.set(
key,
value
);

/* Keep LS mirror for cross-tab + older tabs. */
if(
lsGet(
key
) ==
null
){
lsSet(
key,
value
);
}

}

hydrated =
true;

}

/**
 * Background hydrate. Safe to call many times; never await on critical path.
 * @returns {Promise<void>}
 */
export function ensureDrawingsKvReady(){

if(
hydratePromise
){
return hydratePromise;
}

hydratePromise =
hydrateFromIdb().catch(
()=>{
hydrated =
true;
}
);

return hydratePromise;

}

export function isDrawingsKvHydrated(){

return hydrated;

}

/* Kick hydrate on import — idle-ish, non-blocking. */
try{

if(
typeof requestIdleCallback ===
"function"
){
requestIdleCallback(
()=>{
void ensureDrawingsKvReady();
},
{
timeout:
2500
}
);
}else if(
typeof setTimeout ===
"function"
){
setTimeout(
()=>{
void ensureDrawingsKvReady();
},
0
);
}

}catch{
void ensureDrawingsKvReady();
}
