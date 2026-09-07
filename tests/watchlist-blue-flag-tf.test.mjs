import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/stub-browser.mjs";

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
}
};

const {
loadWidgetStateBySymbol,
saveWidgetStateBySymbol,
seedWatchlistTfOnBlueFlag
} =
await import(
"../js/storage.js"
);

test("seedWatchlistTfOnBlueFlag writes the terminal TF for a new watchlist widget", ()=>{

store.clear();

assert.equal(
seedWatchlistTfOnBlueFlag(
"btcusdt",
"5"
),
true
);

assert.deepEqual(
loadWidgetStateBySymbol(
"BTCUSDT"
),
{
symbol:
"BTCUSDT",
tf:
"5"
}
);

});

test("seedWatchlistTfOnBlueFlag overwrites a leftover default 15m on re-add", ()=>{

store.clear();

saveWidgetStateBySymbol(
"ETHUSDT",
"15"
);

assert.equal(
seedWatchlistTfOnBlueFlag(
"ETHUSDT",
"60"
),
true
);

assert.equal(
loadWidgetStateBySymbol(
"ETHUSDT"
).tf,
"60"
);

});

test("seedWatchlistTfOnBlueFlag ignores unknown timeframes", ()=>{

store.clear();

assert.equal(
seedWatchlistTfOnBlueFlag(
"SOLUSDT",
"3"
),
false
);

assert.equal(
loadWidgetStateBySymbol(
"SOLUSDT"
),
null
);

});
