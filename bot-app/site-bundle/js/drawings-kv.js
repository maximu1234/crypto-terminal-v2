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
} from "./drawings-exchange-key.js?v=5";

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

/** IDB present and recent writes/opens have not failed. */
let idbHealthy =
drawingsIdbAvailable();

function idbUsable(){

return drawingsIdbAvailable() &&
idbHealthy;

}

function markIdbUnhealthy(){

if(
!idbHealthy
){
return;
}

idbHealthy =
false;

try{

for(
const [
key,
value
] of
cache
){

if(
shouldUseKv(
key
)
){
lsSet(
key,
value
);
}

}

lsRemove(
DRAWINGS_IDB_LS_PURGED_KEY
);

}catch{
/* ignore */
}

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

if(
!hydrated
){
void ensureDrawingsKvReady();
}

/* LS mirror: migration window, IDB-down, or unhealthy fallback. */
if(
!lsPayloadsPurged() ||
!idbUsable()
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
idbUsable()
){

void drawingsIdbSet(
key,
v
).catch(
()=>{
markIdbUnhealthy();
lsSet(
key,
v
);
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
idbUsable()
){

void drawingsIdbDelete(
key
).catch(
()=>{
markIdbUnhealthy();
}
);

}

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
!lsPayloadsPurged() ||
!idbUsable() ||
!hydrated
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
!idbUsable()
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
!idbUsable()
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
!drawingsIdbAvailable()
){
hydrated =
true;
return;
}

try{

await migrateLocalStorageToIdb();

const all =
await drawingsIdbGetAll();

const changed =
[];

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

const prev =
cache.has(
key
)
? cache.get(
key
)
: undefined;

cache.set(
key,
value
);

if(
prev !==
value
){
changed.push(
[
key,
value
]
);
}

}

purgeLocalStoragePayloads();

hydrated =
true;

for(
const [
key,
value
] of
changed
){
notifyExternal(
key,
value
);
}

try{

if(
typeof window !==
"undefined"
){
window.dispatchEvent(
new CustomEvent(
"drawings-kv-ready"
)
);
}

}catch{
/* ignore */
}

}catch{

markIdbUnhealthy();
hydrated =
true;

}

}

/**
 * Background hydrate. Safe to call many times; never await on candle paint.
 * Prefer awaiting before enumerate / first chart load.
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
markIdbUnhealthy();
hydrated =
true;
}
);

return hydratePromise;

}

export function isDrawingsKvHydrated(){

return hydrated;

}

export function isDrawingsIdbHealthy(){

return idbUsable();

}

async function refreshCacheFromIdb(){

if(
!idbUsable() ||
typeof document !==
"undefined" &&
document.visibilityState !==
"visible"
){
return;
}

try{

const all =
await drawingsIdbGetAll();
const seen =
new Set();

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

seen.add(
key
);

const prev =
cache.get(
key
);

if(
prev ===
value
){
continue;
}

cache.set(
key,
value
);
notifyExternal(
key,
value
);

}

}catch{
markIdbUnhealthy();
}

}

/* Kick hydrate immediately — do not wait for idle (avoids empty first paint). */
void ensureDrawingsKvReady();

try{

if(
typeof document !==
"undefined"
){
document.addEventListener(
"visibilitychange",
()=>{
if(
document.visibilityState ===
"visible"
){
void refreshCacheFromIdb();
}
}
);
}

}catch{
/* ignore */
}
