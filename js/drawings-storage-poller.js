/**
 * Один poller localStorage для всех initDrawings (dashboard 4/6/9 виджетов).
 * Cross-tab: window "storage".
 */
const POLL_MS =
400;

const KEY_PREFIX =
"drawings_";

/** @type {Map<string, { getKey: ()=>string, shouldRun: ()=>boolean, onChanged: ()=>void }>} */
const subscribers =
new Map();

/** @type {Map<string, string>} */
const keySnaps =
new Map();

let pollTimer =
null;

let storageListenerBound =
false;

function readStorageRaw(
key
){

try{
return localStorage.getItem(
key
) ||
"[]";
}catch{
return null;
}

}

function notifyKey(
key
){

for(
const sub of
subscribers.values()
){

if(
!sub.shouldRun()
){
continue;
}

if(
sub.getKey() !==
key
){
continue;
}

sub.onChanged();

}

}

function pollKey(
key
){

const raw =
readStorageRaw(
key
);

if(
raw ==
null
){
return;
}

const prev =
keySnaps.get(
key
);

if(
raw ===
prev
){
return;
}

keySnaps.set(
key,
raw
);
notifyKey(
key
);

}

function pollAll(){

if(
document.visibilityState !==
"visible"
){
return;
}

const keys =
new Set();

for(
const sub of
subscribers.values()
){

if(
!sub.shouldRun()
){
continue;
}

keys.add(
sub.getKey()
);

}

for(
const key of
keys
){
pollKey(
key
);
}

}

function ensurePollTimer(){

if(
pollTimer
){
return;
}

pollTimer =
setInterval(
pollAll,
POLL_MS
);

if(
!storageListenerBound
){

storageListenerBound =
true;

window.addEventListener(
"storage",
onStorageEvent
);

}

}

function stopPollTimerIfIdle(){

if(
subscribers.size >
0
){
return;
}

if(
pollTimer
){
clearInterval(
pollTimer
);
pollTimer =
null;
}

}

function onStorageEvent(
e
){

if(
!e.key?.startsWith?.(
KEY_PREFIX
)
){
return;
}

if(
e.newValue !=
null
){
keySnaps.set(
e.key,
e.newValue
);
}else{
keySnaps.delete(
e.key
);
}

notifyKey(
e.key
);

}

/**
 * @param {{
 *   getKey: ()=>string,
 *   shouldRun: ()=>boolean,
 *   onChanged: ()=>void
 * }} opts
 * @returns {()=>void} unregister
 */
export function registerDrawingsStoragePoller(
opts
){

const id =
globalThis.crypto?.randomUUID?.() ||
`ds-${Date.now()}-${Math.random()}`;

subscribers.set(
id,
opts
);

const key =
opts.getKey();

if(
!keySnaps.has(
key
)
){

const raw =
readStorageRaw(
key
);

if(
raw !=
null
){
keySnaps.set(
key,
raw
);
}

}

ensurePollTimer();

return ()=>{
subscribers.delete(
id
);
stopPollTimerIfIdle();
};

}

/** После локальной записи — не считать своё изменение «remote». */
export function touchDrawingsStorageSnap(
key,
raw = null
){

const value =
raw ??
readStorageRaw(
key
);

if(
value !=
null
){
keySnaps.set(
key,
value
);
}

}

export function invalidateDrawingsStorageSnap(
key
){

keySnaps.delete(
key
);

}

/** Тесты / pagehide flush */
export function flushDrawingsStoragePoll(){

pollAll();

}

export function getDrawingsStoragePollerStats(){

return {
subscribers: subscribers.size,
trackedKeys: keySnaps.size,
polling: !!pollTimer
};

}
