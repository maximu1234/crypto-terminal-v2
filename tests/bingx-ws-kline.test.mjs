import test from "node:test";
import assert from "node:assert/strict";

import {
extractKlineRow,
extractKlineTimestamp
} from "../js/exchanges/bingx/ws.js";

test(
"BingX WS kline: data array with T timestamp",
()=>{

const msg =
{
code:
0,
dataType:
"ACH-USDT@kline_1m",
data:[
{
c:
"0.004429",
o:
"0.004429",
T:
1783938480000
}
]
};

const row =
extractKlineRow(
msg
);

assert.ok(
row
);
assert.equal(
row.c,
"0.004429"
);
assert.equal(
extractKlineTimestamp(
row
),
1783938480000
);

}
);

test(
"BingX WS kline: legacy object shape",
()=>{

const msg =
{
dataType:
"BTC-USDT@kline_5m",
data:{
kline:{
c:
"1",
t:
1700000000
}
}
};

const row =
extractKlineRow(
msg
);

assert.equal(
row.c,
"1"
);
assert.equal(
extractKlineTimestamp(
row
),
1700000000
);

}
);
