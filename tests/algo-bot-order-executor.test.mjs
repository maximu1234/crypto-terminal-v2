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
"splits entry quantity into step-rounded thirds",
()=>{
assert.deepEqual(
executor.splitQtyIntoThirds(
1,
{
qtyStep:
"0.1"
}
),
[
0.3,
0.3,
0.4
]
);
assert.deepEqual(
executor.splitQtyIntoThirds(
0.007,
{
qtyStep:
"0.001"
}
),
[
0.002,
0.002,
0.003
]
);
assert.equal(
executor.splitQtyIntoThirds(
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
