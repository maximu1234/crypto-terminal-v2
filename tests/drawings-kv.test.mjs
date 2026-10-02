import test from "node:test";
import assert from "node:assert/strict";

function installLocalStorage(){

const store =
new Map();

globalThis.localStorage =
{
getItem(
key
){
return store.has(
key
)
? store.get(
key
)
: null;
},
setItem(
key,
value
){
store.set(
key,
String(
value
)
);
},
removeItem(
key
){
store.delete(
key
);
},
key(
i
){
return [
...store.keys()
][
i
] ??
null;
},
get length(){
return store.size;
}
};

return store;

}

function installFailingIndexedDb(){

globalThis.indexedDB =
{
open(){

const req =
{};

/* Defer so openDb can assign onerror before it fires. */
setTimeout(
()=>{
req.error =
new Error(
"idb mock fail"
);
req.onerror?.(
new Event(
"error"
)
);
},
0
);

return req;

}
};

}

test(
"drawingsKv falls back to localStorage when IndexedDB is unavailable",
async()=>{

const store =
installLocalStorage();

delete globalThis.indexedDB;
delete globalThis.BroadcastChannel;

const {
drawingsKvGet,
drawingsKvSet,
drawingsKvRemove
} =
await import(
`../js/drawings-kv.js?t=${Date.now()}-noidb`
);

const key =
"drawings_bybit_BTCUSDT";

drawingsKvSet(
key,
'[{"id":"d_1"}]'
);

assert.equal(
drawingsKvGet(
key
),
'[{"id":"d_1"}]'
);
assert.equal(
store.get(
key
),
'[{"id":"d_1"}]',
"IDB-down path must persist to LS"
);

drawingsKvRemove(
key
);

assert.equal(
drawingsKvGet(
key
),
null
);
assert.equal(
store.has(
key
),
false
);

}
);

test(
"drawingsKv skips LS dual-write when IndexedDB is available",
async()=>{

const store =
installLocalStorage();

store.set(
"drawings_idb_migrated_v1",
"1"
);
store.set(
"drawings_idb_ls_purged_v1",
"1"
);

installFailingIndexedDb();

const posts =
[];

globalThis.BroadcastChannel =
class {
constructor(){
this.onmessage =
null;
}
postMessage(
msg
){
posts.push(
msg
);
}
};

const {
drawingsKvGet,
drawingsKvSet,
drawingsKvRemove
} =
await import(
`../js/drawings-kv.js?t=${Date.now()}-idb`
);

const key =
"drawings_bybit_ETHUSDT";

drawingsKvSet(
key,
'[{"id":"e_1"}]'
);

assert.equal(
drawingsKvGet(
key
),
'[{"id":"e_1"}]'
);
assert.equal(
store.has(
key
),
false,
"must not dual-write payload to LS when IDB is up"
);
assert.ok(
posts.some(
(
p
)=>
p?.type ===
"set" &&
p.key ===
key
),
"BroadcastChannel set"
);

drawingsKvRemove(
key
);

assert.equal(
drawingsKvGet(
key
),
null
);
assert.ok(
posts.some(
(
p
)=>
p?.type ===
"remove" &&
p.key ===
key
),
"BroadcastChannel remove"
);

}
);
