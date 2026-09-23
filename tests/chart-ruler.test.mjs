import test from "node:test";
import assert from "node:assert/strict";

import {
countBarsBetween,
computeChartRulerMetrics,
containingBarOpenTime,
formatRulerDuration,
formatRulerPercent,
CHART_RULER_SHOULDER_HALF,
chartRulerShoulderSpan,
crispCanvasLineCoord
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
"containingBarOpenTime snaps LTF time to HTF bar open",
()=>{

const daily = [
{ time: 0, open: 1, high: 2, low: 0.5, close: 1.5 },
{ time: 86400, open: 1.5, high: 3, low: 1, close: 2 },
{ time: 172800, open: 2, high: 2.5, low: 1.8, close: 2.2 }
];

/* 14:00 UTC on day 1 → still day-0 open (0). */
assert.equal(
containingBarOpenTime(
daily,
14 * 3600
),
0
);

/* Exact day open stays itself. */
assert.equal(
containingBarOpenTime(
daily,
86400
),
86400
);

/* Mid day-1 → day-1 open. */
assert.equal(
containingBarOpenTime(
daily,
86400 + 14 * 3600
),
86400
);

assert.equal(
containingBarOpenTime(
[],
100
),
null
);

assert.equal(
containingBarOpenTime(
daily,
null
),
null
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

test(
"chartRulerShoulderSpan: ±20px at crisp cursor",
()=>{

const bx =
crispCanvasLineCoord(
150
);
const span =
chartRulerShoulderSpan(
bx
);

assert.equal(
span.x0,
bx -
CHART_RULER_SHOULDER_HALF
);
assert.equal(
span.x1,
bx +
CHART_RULER_SHOULDER_HALF
);

}
);

test(
"crispCanvasLineCoord: half-pixel snap",
()=>{

assert.equal(
crispCanvasLineCoord(
100.2
),
100.5
);

assert.equal(
crispCanvasLineCoord(
100.6
),
101.5
);

}
);
