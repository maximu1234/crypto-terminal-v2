import test from "node:test";
import assert from "node:assert/strict";

import {
countBarsBetween,
computeChartRulerMetrics,
formatRulerDuration,
formatRulerPercent
} from "../js/drawings/chart-ruler.js";

const candles = [
{ time: 1000, open: 100, high: 101, low: 99, close: 100 },
{ time: 1060, open: 100, high: 102, low: 99, close: 101 },
{ time: 1120, open: 101, high: 103, low: 100, close: 102 },
{ time: 1180, open: 102, high: 104, low: 101, close: 103 }
];

test(
"countBarsBetween uses candle indices",
()=>{

assert.equal(
countBarsBetween(
candles,
1000,
1180
),
3
);

assert.equal(
countBarsBetween(
candles,
1180,
1000
),
3
);

}
);

test(
"formatRulerDuration",
()=>{

assert.equal(
formatRulerDuration(
120
),
"2 мин"
);

assert.equal(
formatRulerDuration(
61200
),
"17ч"
);

assert.equal(
formatRulerDuration(
432000
),
"5д"
);

}
);

test(
"formatRulerPercent keeps sign",
()=>{

assert.equal(
formatRulerPercent(
28.35
),
"+28.35%"
);

assert.equal(
formatRulerPercent(
-5
),
"-5.00%"
);

}
);

test(
"computeChartRulerMetrics",
()=>{

const metrics =
computeChartRulerMetrics(
{ time: 1000, price: 100 },
{ time: 1180, price: 128.35 },
candles
);

assert.equal(
metrics.bars,
3
);
assert.equal(
metrics.pctLabel,
"+28.35%"
);
assert.match(
metrics.barsLabel,
/^3 bars, /
);

}
);
