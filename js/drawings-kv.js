/**
 * Sync facade for drawings payloads: memory → IndexedDB.
 * Cross-tab via BroadcastChannel (no LS dual-write for payloads).
 * Callers keep sync get/set; hydrate runs in background and must not be
 * awaited on the candle / alert critical path.
 *
 * Meta keys (tombstones, sync flags) stay in localStorage only.
 * If IndexedDB is unavailable, payloads fall back to localStorage alone.
 */
import {
isDrawingsStorageKey,
isDrawingsMetaStorageKey,
migrateLegacyDrawingsStorage,
parseDrawingsStorageKey
} from "./drawings-exchange-key.js?v=4";

import {
drawingsIdbAvailable,
drawingsIdbDelete,
drawingsIdbGetAll,
drawingsIdbSet
} from "./drawings-idb.js?v=2";

export const DRAWINGS_IDB_MIGRATED_KEY =
"drawings_idb_migrated_v1";

export const DRAWINGS_IDB_LS_PURGED_KEY =
"drawings_idb_ls_purged_v1";

const BC_NAME =
"multichart-drawings-kv-v1";

/** @type {Map<string, string>} */
const cache =
new Map();

/** @type {Set<(key: string, value: string|null) => void>} */
const externalListeners =
new Set();

/** @type {Promise<void>|null} */
let hydratePromise =
null;

let hydrated =
false;

const tabId =
typeof globalThis.crypto?.randomUUID ===
"function"
? globalThis.crypto.randomUUID()
: `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** @type {BroadcastChannel|null} */
let broadcastChannel =
null;

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

function lsPayloadsPurged(){

return lsGet(
DRAWINGS_IDB_LS_PURGED_KEY
) ===
"1";

}

function idbReady(){

return drawingsIdbAvailable();

}

function notifyExternal(
key,
value
){

for(
const fn of
externalListeners
){

try{
fn(
key,
value
);
}catch{
/* ignore listener errors */
}

}

}

function ensureBroadcast(){

if(
broadcastChannel
){
return broadcastChannel;
}

if(
typeof BroadcastChannel ===
"undefined"
){
return null;
}

try{

broadcastChannel =
new BroadcastChannel(
BC_NAME
);

broadcastChannel.onmessage =
(
ev
)=>{

const msg =
ev?.data;

if(
!msg ||
msg.tabId ===
tabId
){
return;
}

const key =
String(
msg.key ||
""
);

if(
!shouldUseKv(
key
)
){
return;
}

if(
msg.type ===
"set" &&
typeof msg.value ===
"string"
){
cache.set(
key,
msg.value
);
notifyExternal(
key,
msg.value
);
return;
}

if(
msg.type ===
"remove"
){
cache.delete(
key
);
notifyExternal(
key,
null
);
}

};

}catch{
broadcastChannel =
null;
}

return broadcastChannel;

}

function broadcast(
payload
){

try{

ensureBroadcast()?.postMessage(
{
...payload,
tabId
}
);

}catch{
/* ignore */
}

}

/**
 * Other tabs / poller — not fired for local set/remove.
 * @param {(key: string, value: string|null) => void} fn
 * @returns {() => void}
 */
export function onDrawingsKvExternalChange(
fn
){

if(
typeof fn !==
"function"
){
return ()=>{};
}

externalListeners.add(
fn
);
ensureBroadcast();

return ()=>{
externalListeners.delete(
fn
);
};

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

/* Migration window / IDB-down fallback — never await IDB on critical path. */
if(
!lsPayloadsPurged() ||
!idbReady()
){

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
return fromLs;
}

}

return null;

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

if(
idbReady()
){

void drawingsIdbSet(
key,
v
).catch(
()=>{
/* ignore */
}
);

}else{
lsSet(
key,
v
);
}

broadcast({
type:
"set",
key,
value:
v
});

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

if(
idbReady()
){

void drawingsIdbDelete(
key
).catch(
()=>{
/* ignore */
}
);

}

/* Always drop any leftover LS mirror (migration / IDB-down cleanup). */
lsRemove(
key
);

broadcast({
type:
"remove",
key
});

}

/**
 * Keys present in memory cache and (until LS purge) localStorage.
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
!shouldUseKv(
key
)
){
continue;
}

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

if(
!lsPayloadsPurged()
){

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

if(
predicate &&
!predicate(
key
)
){
continue;
}

keys.add(
key
);

}

}catch{
/* ignore */
}

}

return [
...keys
];

}

/**
 * Main (non-tf) drawing keys for an exchange — replaces LS scan helper.
 * @param {string} [exchangeId]
 * @param {{ includeTf?: boolean }} [opts]
 * @returns {string[]}
 */
export function drawingsKvListKeysForExchange(
exchangeId,
opts = {}
){

const ex =
String(
exchangeId ||
""
).trim().toLowerCase();
const includeTf =
opts.includeTf ===
true;

return drawingsKvListKeys(
(
key
)=>{

const parsed =
parseDrawingsStorageKey(
key
);

if(
!parsed
){
return false;
}

if(
ex &&
parsed.exchangeId !==
ex
){
return false;
}

if(
!includeTf &&
parsed.tfSuffix
){
return false;
}

return true;

}
);

}

async function migrateLocalStorageToIdb(){

if(
!idbReady()
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

migrateLegacyDrawingsStorage();

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

function purgeLocalStoragePayloads(){

if(
!idbReady()
){
return;
}

if(
lsPayloadsPurged()
){
return;
}

try{

const toRemove =
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

if(
key &&
shouldUseKv(
key
)
){
toRemove.push(
key
);
}

}

for(
const key of
toRemove
){
lsRemove(
key
);
}

lsSet(
DRAWINGS_IDB_LS_PURGED_KEY,
"1"
);

}catch{
/* leave flag unset — retry next boot */
}

}

async function hydrateFromIdb(){

if(
!idbReady()
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

}

purgeLocalStoragePayloads();

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
