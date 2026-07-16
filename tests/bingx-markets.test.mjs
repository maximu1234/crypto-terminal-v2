import test from "node:test";
import assert from "node:assert/strict";

import {
classifyBingxContract,
buildBingxMarketLists
} from "../js/exchanges/bingx/markets.js";

test(
"classifyBingxContract: crypto USDT (hyphenated)",
()=>{
assert.equal(
classifyBingxContract({
symbol:
"BTC-USDT",
status:
1
}),
"crypto"
);
}
);

test(
"classifyBingxContract: crypto USDT (canonical)",
()=>{
assert.equal(
classifyBingxContract({
symbol:
"BTCUSDT",
status:
1
}),
"crypto"
);
}
);

test(
"classifyBingxContract: USDC excluded",
()=>{
assert.equal(
classifyBingxContract({
symbol:
"ETH-USDC",
status:
1
}),
null
);
assert.equal(
classifyBingxContract({
symbol:
"ETHUSDC",
status:
1
}),
null
);
}
);

test(
"classifyBingxContract: TradFi prefixes",
()=>{
assert.equal(
classifyBingxContract({
symbol:
"NCSKTSLA2USD-USDT",
status:
1
}),
"stocks"
);
assert.equal(
classifyBingxContract({
symbol:
"NCSKTSLA2USDUSDT",
status:
1
}),
"stocks"
);
assert.equal(
classifyBingxContract({
symbol:
"NCSINASDAQ1002USD-USDT",
status:
1
}),
"indices"
);
assert.equal(
classifyBingxContract({
symbol:
"SPX-USDT",
status:
1
}),
"indices"
);
assert.equal(
classifyBingxContract({
symbol:
"SPXUSDT",
status:
1
}),
"indices"
);
assert.equal(
classifyBingxContract({
symbol:
"NCCOGOLD2USD-USDT",
status:
1
}),
"commodities"
);
assert.equal(
classifyBingxContract({
symbol:
"NCFXEUR2USD-USDT",
status:
1
}),
"forex"
);
}
);

test(
"buildBingxMarketLists splits categories",
()=>{

const lists =
buildBingxMarketLists([
{
symbol:
"BTC-USDT",
status:
1,
launchTime:
Date.now()
},
{
symbol:
"ETHUSDC",
status:
1
},
{
symbol:
"NCSKTSLA2USD-USDT",
status:
1
},
{
symbol:
"NCFXGBP2USD-USDT",
status:
1
}
]);

assert.ok(
lists.all.includes(
"BTCUSDT"
)
);
assert.ok(
lists.crypto.includes(
"BTCUSDT"
)
);
assert.ok(
!lists.usdc.includes(
"ETHUSDC"
)
);
assert.equal(
lists.usdc.length,
0
);
assert.ok(
lists.stocks.includes(
"NCSKTSLA2USDUSDT"
)
);
assert.ok(
lists.forex.includes(
"NCFXGBP2USDUSDT"
)
);
assert.equal(
lists.innovation.length,
0
);

}
);

test(
"buildBingxMarketLists: canonical rows classify crypto",
()=>{

const lists =
buildBingxMarketLists([
{
symbol:
"BTCUSDT",
status:
1
},
{
symbol:
"ETHUSDT",
status:
1
}
]);

assert.deepEqual(
lists.crypto,
[
"BTCUSDT",
"ETHUSDT"
]
);
assert.deepEqual(
lists.all,
[
"BTCUSDT",
"ETHUSDT"
]
);

}
);
