import "./helpers/stub-browser.mjs";
import assert from "node:assert/strict";
import test from "node:test";

if(
typeof globalThis.document ===
"undefined"
){
globalThis.document =
{
documentElement:{},
body:{
classList:{
toggle(){}
}
}
};
}

if(
typeof globalThis.window.matchMedia !==
"function"
){
globalThis.window.matchMedia =
()=>({
matches:
false,
addEventListener(){},
removeEventListener(){}
});
}

if(
typeof globalThis.getComputedStyle !==
"function"
){
globalThis.getComputedStyle =
()=>({
getPropertyValue(){
return "";
}
});
}

const {
computeCoinsChartViewportPlan
} =
await import(
"../js/chart/chart-factory.js"
);

function candlesWithFuture(
realCount,
futureCount
){

const out =
[];

for(
let i =
0;
i <
realCount +
futureCount;
i++
){

const bar =
{
time:
1_700_000_000 +
i *
60
};

if(
i <
realCount
){
bar.open =
100;
bar.high =
101;
bar.low =
99;
bar.close =
100;
}

out.push(
bar
);

}

return out;

}

test(
"viewport plan keeps last index on future whitespace, not last real bar",
()=>{

const realCount =
200;
const futureCount =
30;
const candles =
candlesWithFuture(
realCount,
futureCount
);
const plan =
computeCoinsChartViewportPlan(
candles,
"60",
800,
realCount,
120,
700
);

assert.ok(
plan
);
assert.equal(
plan.futureMargin,
futureCount
);
assert.equal(
plan.range.to,
candles.length -
1
);
assert.ok(
plan.range.to >
realCount -
1
);
assert.equal(
plan.timeOpts.rightOffset,
4
);
assert.ok(
plan.timeOpts.barSpacing >
0
);

}
);
