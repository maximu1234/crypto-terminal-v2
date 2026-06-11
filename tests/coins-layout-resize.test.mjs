import {
test
} from "node:test";
import assert from "node:assert/strict";

import {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
computeCoinsLayoutLimits,
clampCoinsListWidth,
clampCoinsRsiHeight,
defaultRsiHeightPx
} from "../js/coins-layout-math.js";

test(
"defaultRsiHeightPx: clamp 102–160",
()=>{

assert.equal(
defaultRsiHeightPx(
400
),
102
);

assert.equal(
defaultRsiHeightPx(
800
),
141
);

assert.equal(
defaultRsiHeightPx(
1200
),
160
);

}
);

test(
"computeCoinsLayoutLimits: chart min 20% of default",
()=>{

const limits =
computeCoinsLayoutLimits(
{
appWidth:
1252,
chartsStackHeight:
600,
innerHeight:
800
}
);

assert.equal(
limits.defaultChartW,
1252 -
COINS_LIST_DEFAULT_PX
);

assert.equal(
limits.minChartW,
limits.defaultChartW *
0.2
);

assert.equal(
limits.maxListW,
1252 -
limits.minChartW
);

assert.equal(
limits.defaultRsiH,
defaultRsiHeightPx(
800
)
);

assert.equal(
limits.minChartH,
limits.defaultChartH *
0.2
);

assert.equal(
limits.maxRsiH,
600 -
limits.minChartH
);

}
);

test(
"clampCoinsListWidth: min 252, max by chart floor",
()=>{

const limits =
computeCoinsLayoutLimits(
{
appWidth:
1000,
chartsStackHeight:
500,
innerHeight:
800
}
);

assert.equal(
clampCoinsListWidth(
200,
limits
),
COINS_LIST_MIN_PX
);

assert.equal(
clampCoinsListWidth(
limits.maxListW +
100,
limits
),
limits.maxListW
);

assert.equal(
clampCoinsListWidth(
300,
limits
),
300
);

}
);

test(
"clampCoinsRsiHeight: min 102, max by chart floor",
()=>{

const limits =
computeCoinsLayoutLimits(
{
appWidth:
1000,
chartsStackHeight:
500,
innerHeight:
800
}
);

assert.equal(
clampCoinsRsiHeight(
80,
limits
),
COINS_RSI_MIN_DESKTOP_PX
);

assert.equal(
clampCoinsRsiHeight(
limits.maxRsiH +
50,
limits
),
limits.maxRsiH
);

assert.equal(
clampCoinsRsiHeight(
130,
limits
),
130
);

}
);
