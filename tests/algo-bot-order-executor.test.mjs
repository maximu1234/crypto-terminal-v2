import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { Module } from "node:module";

const require = createRequire(import.meta.url);

function loadExecutorWithStubs(){
  const originalLoad = Module._load;
  Module._load = function(
    request,
    parent,
    isMain
  ){
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
assert.equal(
executor.splitQtyByShares(
0.002,
{
qtyStep:
"0.001"
}
),
null
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
