import test from "node:test";
import assert from "node:assert/strict";

test(
"drawingsKv falls back to localStorage when IndexedDB is unavailable",
async()=>{

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

delete globalThis.indexedDB;

const {
drawingsKvGet,
drawingsKvSet,
drawingsKvRemove
} =
await import(
`../js/drawings-kv.js?t=${Date.now()}`
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
'[{"id":"d_1"}]'
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
