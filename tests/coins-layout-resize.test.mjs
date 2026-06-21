import {
test
} from "node:test";
import assert from "node:assert/strict";

import {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
computeCoinsLayoutLimits,
computeVolumeHeightLimits,
clampCoinsListWidth,
clampCoinsRsiHeight,
clampCoinsVolumeHeight,
defaultRsiHeightPx,
defaultVolumeHeightPx
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
"defaultVolumeHeightPx matches RSI default",
()=>{

assert.equal(
defaultVolumeHeightPx(
800
),
defaultRsiHeightPx(
800
)
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
Math.round(
Math.max(
COINS_RSI_MIN_DESKTOP_PX,
600 -
limits.minChartH
)
)
);

}
);

test(
"computeVolumeHeightLimits: max 50% of chart area",
()=>{

const limits =
computeVolumeHeightLimits(
{
stackH:
900,
rsiOccupiedHeight:
140,
innerHeight:
800
}
);

assert.equal(
limits.defaultVolumeH,
defaultVolumeHeightPx(
800
)
);

assert.equal(
limits.maxVolumeH,
253
);

const chartH =
900 -
253 -
140;

assert.ok(
253 <=
chartH *
0.5 +
0.51
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

test(
"clampCoinsVolumeHeight: min 102, max by chart ratio",
()=>{

const limits =
computeVolumeHeightLimits(
{
stackH:
600,
rsiOccupiedHeight:
120,
innerHeight:
800
}
);

assert.equal(
clampCoinsVolumeHeight(
80,
limits
),
COINS_RSI_MIN_DESKTOP_PX
);

assert.equal(
clampCoinsVolumeHeight(
limits.maxVolumeH +
50,
limits
),
limits.maxVolumeH
);

assert.equal(
clampCoinsVolumeHeight(
150,
limits
),
150
);

}
);
