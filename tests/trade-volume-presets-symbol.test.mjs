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
getActiveTradeVolumeUsdt,
saveVolumeStateForSymbol
} =
await import(
"../js/trade/bybit/volume-presets.js"
);

test("pending order volume for a widget must be read by symbol, not terminal memory", ()=>{

assert.equal(
getActiveTradeVolumeUsdt(),
0
);

saveVolumeStateForSymbol(
"BTCUSDT",
{
slots:
[
250,
0,
0,
0,
0,
0
],
activeIndex:
0
}
);

assert.equal(
getActiveTradeVolumeUsdt(
"BTCUSDT"
),
250
);
assert.equal(
getActiveTradeVolumeUsdt(
"BTCUSDT.P"
),
250
);
assert.equal(
getActiveTradeVolumeUsdt(),
0
);

});
