import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { Module } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function loadExecutorWithStubs(
  restStub =
  null,
  savedPending =
  null
){
  const originalLoad = Module._load;
  Module._load = function(
    request,
    parent,
    isMain
  ){
    if(
      restStub &&
      request === "./algo-bybit-rest.cjs"
    ){
      return restStub;
    }
    if(
      savedPending &&
      request === "./algo-bot-store.cjs"
    ){
      return {
        ...originalLoad(
          request,
          parent,
          isMain
        ),
        readPendingBotOrders:()=>
          savedPending,
        writePendingBotOrders:()=>({
          ok:
          true
        })
      };
    }
    if(
      request === "electron"
    ){
      return {
        app:{
          getPath:()=>
            "/tmp"
        },
        net:{
          request:()=>{
            throw new Error(
              "net stub"
            );
          }
        }
      };
    }
    if(
      request === "electron-log"
    ){
      return {
        info:()=>{},
        warn:()=>{},
        error:()=>{},
        debug:()=>{}
      };
    }
    if(
      request === "ws"
    ){
      return function WsStub(){};
    }
    return originalLoad(
      request,
      parent,
      isMain
    );
  };
  try{
    delete require.cache[
      require.resolve(
        "../desktop/trading/algo-bot-order-executor.cjs"
      )
    ];
    return require(
      "../desktop/trading/algo-bot-order-executor.cjs"
    );
  }finally{
    Module._load =
      originalLoad;
  }
}

const executor =
loadExecutorWithStubs();

/**
 * Minimal algo REST double: records placed orders, can fail chosen TP slots.
 */
function makeRestStub(
{
  size =
  1,
  orders =
  [],
  failPrices =
  [],
  positions =
  null
} =
{}
){
  const placed =
  [];
  const cancelled =
  [];

  return {
    placed,
    cancelled,
    getPositions:
      async ()=>({
        ok:
        true,
        positions:
        positions ||
        [
          {
            symbol:
            "BTCUSDT",
            size
          }
        ]
      }),
    cancelTradeOrder:
      async (
        symbol,
        orderId
      )=>{
        cancelled.push(
          `${symbol}:${orderId}`
        );
        return {
          ok:
          true
        };
      },
    getInstrumentRulesMinQty:
      undefined,
    getPosition:
      async ()=>({
        ok:
        true,
        position:{
          size,
          side:
          "Buy"
        }
      }),
    getOpenOrders:
      async ()=>({
        ok:
        true,
        orders
      }),
    getInstrumentRules:
      async ()=>({
        qtyStep:
        "0.1",
        minOrderQty:
        0.1
      }),
    formatQtyValue:
      (
        value,
        decimals
      )=>
        Number(
          value
        ).toFixed(
          decimals
        ),
    placeTradeOrder:
      async payload=>{
        if(
          failPrices.includes(
            payload.price
          )
        ){
          return {
            ok:
            false,
            message:
            "rejected"
          };
        }
        placed.push(
          payload
        );
        return {
          ok:
          true,
          orderId:
          `id-${placed.length}`
        };
      },
    setPositionStop:
      async ()=>({
        ok:
        true
      }),
    cancelPositionStop:
      async (
        symbol,
        target
      )=>{
        cancelled.push(
          `stop:${symbol}:${target}`
        );
        return {
          ok:
          true
        };
      },
    closePositionAtMarket:
      async symbol=>{
        cancelled.push(
          `market:${symbol}`
        );
        return {
          ok:
          true
        };
      }
  };
}

const partialMeta =
()=>({
  side:
  "long",
  fingerprint:
  "BTCUSDT:long:t1754006400:113234.50000000",
  placedAt:
  1754006400123,
  tpPrices:[
    100,
    110,
    120
  ],
  shares:[
    25,
    25,
    50
  ],
  tpsHit:
  0,
  tpOrderIds:[]
});

test(
"each TP gets its own orderLinkId within the 36-char limit",
()=>{
const meta =
partialMeta();
const ids =
[
  0,
  1,
  2
].map(
index=>
executor.tpOrderLinkId(
meta,
"BTCUSDT",
index
)
);
assert.equal(
new Set(
ids
).size,
3
);
ids.forEach(
id=>{
assert.ok(
id.length <=
36,
`too long: ${id}`
);
assert.equal(
executor.isAlgoBotOrderLinkId(
id
),
true
);
}
);
/* Same setup must map to the same ids across restarts. */
assert.deepEqual(
[
  0,
  1,
  2
].map(
index=>
executor.tpOrderLinkId(
partialMeta(),
"BTCUSDT",
index
)
),
ids
);
}
);

test(
"places all three TPs as reduce-only limits by shares",
async ()=>{
const rest =
makeRestStub();
const local =
loadExecutorWithStubs(
rest
);
const result =
await local.ensurePartialTpLimits(
{
symbol:
"BTCUSDT",
meta:
partialMeta()
}
);
assert.equal(
result.ok,
true
);
assert.equal(
result.placed,
3
);
assert.deepEqual(
rest.placed.map(
order=>
order.price
),
[
  100,
  110,
  120
]
);
assert.deepEqual(
rest.placed.map(
order=>
Number(
order.qty
)
),
[
  0.2,
  0.2,
  0.6
]
);
assert.equal(
new Set(
rest.placed.map(
order=>
order.orderLinkId
)
).size,
3
);
rest.placed.forEach(
order=>{
assert.equal(
order.forceReduceOnly,
true
);
}
);
}
);

test(
"one rejected TP leg does not block the other",
async ()=>{
const rest =
makeRestStub(
{
failPrices:[
100
]
}
);
const local =
loadExecutorWithStubs(
rest
);
const result =
await local.ensurePartialTpLimits(
{
symbol:
"BTCUSDT",
meta:
partialMeta()
}
);
assert.equal(
result.ok,
false
);
assert.deepEqual(
result.missing,
[
  0
]
);
assert.deepEqual(
rest.placed.map(
order=>
order.price
),
[
  110,
  120
]
);
assert.match(
result.message,
/TP1/
);
}
);

test(
"restores only the missing TP leg and keeps the live one",
async ()=>{
const meta =
partialMeta();
const liveLinkId =
executor.tpOrderLinkId(
meta,
"BTCUSDT",
0
);
const rest =
makeRestStub(
{
orders:[
{
orderId:
"live-1",
orderLinkId:
liveLinkId,
orderKind:
"limit",
reduceOnly:
true,
side:
"Sell",
price:
100,
qty:
0.2,
leavesQty:
0.2,
symbol:
"BTCUSDT"
}
]
}
);
const local =
loadExecutorWithStubs(
rest
);
const result =
await local.ensurePartialTpLimits(
{
symbol:
"BTCUSDT",
meta
}
);
assert.equal(
result.ok,
true
);
assert.equal(
result.placed,
2
);
assert.equal(
result.tpOrderIds[
0
],
"live-1"
);
/* 0.8 left after live TP1: remainder split 25:50 → 0.2 and 0.6. */
assert.deepEqual(
rest.placed.map(
order=>
Number(
order.qty
)
),
[
  0.2,
  0.6
]
);
assert.deepEqual(
rest.placed.map(
order=>
order.price
),
[
  110,
  120
]
);
}
);

test(
"cancels leftover TP legs of a closed position",
async ()=>{
const rest =
makeRestStub(
{
orders:[
{
orderId:
"leg-1",
orderLinkId:
"algo-tp0-abc-1",
orderKind:
"limit",
reduceOnly:
true,
side:
"Sell",
price:
100,
qty:
0.2,
symbol:
"BTCUSDT"
},
{
orderId:
"foreign-1",
orderLinkId:
"manual-order",
orderKind:
"limit",
reduceOnly:
true,
side:
"Sell",
price:
101,
qty:
0.2,
symbol:
"BTCUSDT"
}
]
}
);
rest.getPosition =
async ()=>({
ok:
true,
position:
null
});
const local =
loadExecutorWithStubs(
rest
);
const result =
await local.cancelPartialTpLimits(
"BTCUSDT"
);
assert.equal(
result.ok,
true
);
assert.equal(
result.cancelled,
1
);
assert.deepEqual(
rest.cancelled,
[
  "BTCUSDT:leg-1"
]
);
}
);

test(
"orphan sweep keeps TP legs of open positions",
async ()=>{
const rest =
makeRestStub(
{
positions:[
{
symbol:
"BTCUSDT",
size:
1
},
{
symbol:
"ETHUSDT",
size:
0
}
],
orders:[
{
orderId:
"keep-1",
orderLinkId:
"algo-tp0-abc-1",
orderKind:
"limit",
reduceOnly:
true,
side:
"Sell",
price:
100,
qty:
0.2,
symbol:
"BTCUSDT"
},
{
orderId:
"drop-1",
orderLinkId:
"algo-tp1-abc-1",
orderKind:
"limit",
reduceOnly:
true,
side:
"Sell",
price:
200,
qty:
0.2,
symbol:
"ETHUSDT"
},
{
orderId:
"drop-2",
orderLinkId:
"algo-tp0-def-2",
orderKind:
"limit",
reduceOnly:
true,
side:
"Buy",
price:
300,
qty:
0.2,
symbol:
"SOLUSDT"
}
]
}
);
const local =
loadExecutorWithStubs(
rest
);
const result =
await local.cancelOrphanTpLimits();
assert.equal(
result.ok,
true
);
assert.equal(
result.cancelled,
2
);
assert.deepEqual(
rest.cancelled.sort(),
[
  "ETHUSDT:drop-1",
  "SOLUSDT:drop-2"
]
);
}
);

test(
"reconcile restores TP legs, keeps its own trail and drops orphans",
async ()=>{
const rest =
makeRestStub(
{
positions:[
{
symbol:
"BTCUSDT",
size:
0.8
}
],
orders:[
{
orderId:
"orphan-1",
orderLinkId:
"algo-tp0-abc-1",
orderKind:
"limit",
reduceOnly:
true,
side:
"Sell",
price:
50,
qty:
0.2,
symbol:
"ETHUSDT"
}
]
}
);
const setStops =
[];
rest.setPositionStop =
async (
symbol,
target,
price
)=>{
setStops.push(
`${symbol}:${target}:${price}`
);
return {
ok:
true
};
};
rest.getPosition =
async ()=>({
ok:
true,
position:
{
symbol:
"BTCUSDT",
size:
0.8
}
});
const local =
loadExecutorWithStubs(
rest,
{
pendingEntries:
{
BTCUSDT:
{
...partialMeta(),
pt3:
95,
pt4:
100,
slPrice:
95,
tpPrice:
120,
initialQty:
1,
entryQty:
1,
trailSl:
true,
trailSlX1:
-0.25,
trailSlX2:
0,
exitKind:
"partial-x",
tpOrderIds:[
  "gone-1",
  "gone-2"
],
tpQtys:[
  0.2,
  0.2
]
}
}
}
);
local.hydratePendingFromDisk();

const reports =
await local.reconcileTriggersAndStops(
[
{
symbol:
"BTCUSDT",
size:
0.8,
stopLoss:
95,
takeProfit:
120
},
{
symbol:
"ETHUSDT",
size:
0
}
]
);
const entry =
local.getPendingEntries().get(
"BTCUSDT"
);
/* TP1 counted as hit by closed quantity, so TP2+TP3 are restored. */
assert.deepEqual(
rest.placed.map(
order=>
order.price
),
[
  110,
  120
]
);
assert.equal(
entry.tpsHit,
1
);
/* Our own trail must not look like a manual edit. */
assert.equal(
entry.stopsManagedByUser,
false
);
assert.deepEqual(
rest.cancelled.filter(
row=>
!row.startsWith(
"stop:"
)
).sort(),
[
  "ETHUSDT:orphan-1"
]
);
assert.ok(
reports.some(
report=>
report.action ===
"cancel-orphan-tp" &&
report.symbol ===
"ETHUSDT"
)
);
assert.ok(
setStops.some(
row=>
row.startsWith(
"BTCUSDT:sl:"
)
)
);
}
);

test(
"partial exits only require a position stop loss",
()=>{
assert.equal(
executor.positionMissingStops(
{
stopLoss:
90,
takeProfit:
0
}
),
true
);
assert.equal(
executor.positionMissingStops(
{
stopLoss:
90,
takeProfit:
0
},
true
),
false
);
assert.equal(
executor.positionMissingStops(
{
stopLoss:
90,
takeProfit:
120
}
),
false
);
}
);

test(
"weights allocation lets the last part absorb the remainder",
()=>{
assert.deepEqual(
executor.allocateQtyByWeights(
1,
{
qtyStep:
"0.1"
},
[
  25,
  50
]
),
[
  0.3,
  0.7
]
);
assert.equal(
executor.allocateQtyByWeights(
0.05,
{
qtyStep:
"0.1"
},
[
  25,
  50
]
),
null
);
/* Enough steps for all legs: redistribute so early TPs are not collapsed to 0. */
assert.deepEqual(
executor.allocateQtyByWeights(
0.003,
{
qtyStep:
"0.001"
},
[
  25,
  25,
  50
]
),
[
  0.001,
  0.001,
  0.001
]
);
/* Only two steps — keep last non-zero, fund earliest early leg. */
assert.deepEqual(
executor.allocateQtyByWeights(
0.002,
{
qtyStep:
"0.001"
},
[
  25,
  25,
  50
]
),
[
  0.001,
  0,
  0.001
]
);
const parts =
executor.allocateQtyByWeights(
1.2345,
{
qtyStep:
"0.001"
},
[
  10,
  10,
  80
]
);
assert.deepEqual(
parts,
[
  0.123,
  0.123,
  0.988
]
);
assert.equal(
Number(
parts.reduce(
(
a,
b
)=>
a +
b,
0
).toFixed(
3
)
),
1.234
);
}
);

test(
"dust below the instrument step is closed at market on the final TP",
async ()=>{
const rest =
makeRestStub(
{
size:
0.0005
}
);
rest.getInstrumentRules =
async ()=>({
qtyStep:
"0.001",
minOrderQty:
0.001
});
const local =
loadExecutorWithStubs(
rest
);
const result =
await local.ensurePartialTpLimits(
{
symbol:
"BTCUSDT",
meta:
partialMeta()
}
);
assert.equal(
result.ok,
true
);
assert.equal(
result.placed,
0
);
assert.ok(
rest.cancelled.includes(
"market:BTCUSDT"
)
);
assert.match(
result.message,
/dust/i
);
}
);

test(
"recognizes only AlgoTrading bot order links",
()=>{
assert.equal(
executor.isAlgoBotOrderLinkId(
"algo-tp-BTCUSDT-0"
),
true
);
assert.equal(
executor.isAlgoBotOrderLinkId(
"algo-setup_1-2"
),
true
);
assert.equal(
executor.isAlgoBotOrderLinkId(
"aSetup_1-2"
),
false
);
assert.equal(
executor.isAlgoBotOrderLinkId(
"manual-stop"
),
false
);
assert.equal(
executor.isAlgoBotOrderLinkId(
""
),
false
);
}
);

test(
"splits entry quantity by TP shares (default 25/25/50)",
()=>{
assert.deepEqual(
executor.splitQtyByShares(
1,
{
qtyStep:
"0.1"
}
),
[
0.2,
0.2,
0.6
]
);
assert.deepEqual(
executor.splitQtyByShares(
1,
{
qtyStep:
"0.1"
},
[
50,
25,
25
]
),
[
0.5,
0.2,
0.3
]
);
assert.deepEqual(
executor.splitQtyByShares(
1,
{
qtyStep:
"0.1"
},
[
34,
33,
33
]
),
[
0.3,
0.3,
0.4
]
);
assert.deepEqual(
executor.splitQtyByShares(
0.007,
{
qtyStep:
"0.001"
}
),
[
0.001,
0.001,
0.005
]
);
assert.deepEqual(
executor.splitQtyByShares(
0.002,
{
qtyStep:
"0.001"
}
),
[
0.001,
0,
0.001
]
);
}
);

test(
"closed quantity maps to TP hits by shares, not equal thirds",
()=>{
const shares =
[
  25,
  25,
  50
];
assert.equal(
executor.countTpsHitByClosedQty(
1,
1,
shares
),
0
);
assert.equal(
executor.countTpsHitByClosedQty(
1,
0.75,
shares
),
1
);
assert.equal(
executor.countTpsHitByClosedQty(
1,
0.5,
shares
),
2
);
assert.equal(
executor.countTpsHitByClosedQty(
1,
0,
shares
),
3
);
/* Step-rounded leg quantities win over raw shares. */
assert.equal(
executor.countTpsHitByClosedQty(
1,
0.8,
shares,
[
  0.2,
  0.2
]
),
1
);
assert.equal(
executor.countTpsHitByClosedQty(
1,
0.6,
shares,
[
  0.2,
  0.2
]
),
2
);
assert.equal(
executor.countTpsHitByClosedQty(
1,
0.9,
shares,
[
  0.2,
  0.2
]
),
0
);
/* Zero early legs must not discard tpQtys — skip empties, count real fills. */
assert.equal(
executor.countTpsHitByClosedQty(
0.003,
0.002,
shares,
[
  0.001,
  0,
  0.002
]
),
1
);
/* 10/10/80: first two TPs close only a fifth of the position. */
assert.equal(
executor.countTpsHitByClosedQty(
1,
0.8,
[
  10,
  10,
  80
]
),
2
);
}
);

test(
"St1 take-profit uses linear dollar RR (matches chart)",
()=>{
const longTp =
executor.computeAlgoTakeProfit(
"long",
110,
105,
2
);
assert.equal(
longTp,
120
);
const shortTp =
executor.computeAlgoTakeProfit(
"short",
110,
115,
2
);
assert.equal(
shortTp,
100
);
}
);

test(
"executor keeps open size, tpQtys and retries failed trail SL",
()=>{
for(
const rel of [
"desktop/trading/algo-bot-order-executor.cjs",
"bot-app/trading/algo-bot-order-executor.cjs"
]
){
const src =
fs.readFileSync(
path.join(
root,
rel
),
"utf8"
);
assert.ok(
src.includes(
"Do not advance tpsHit on amend failure"
),
`${rel}: trail must retry after failed SL amend`
);
assert.ok(
src.includes(
"Never shrink"
),
`${rel}: must not shrink initialQty to live size`
);
assert.ok(
src.includes(
"Steal whole steps from the last leg"
),
`${rel}: allocateQty must redistribute collapsed early TPs`
);
assert.ok(
/\btpQtys:\s*\nArray\.isArray\(\s*\nmeta\.tpQtys/.test(
src
) ||
src.includes(
"...meta.tpQtys"
),
`${rel}: pendingEntries must persist tpQtys`
);
}
}
);
