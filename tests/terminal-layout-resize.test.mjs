import {
test
} from "node:test";
import assert from "node:assert/strict";

import {
COINS_LIST_DEFAULT_PX,
COINS_LIST_MIN_PX,
COINS_RSI_MIN_DESKTOP_PX,
COINS_DRAW_TOOLBAR_WIDTH_PX,
computeCoinsLayoutLimits,
computeIndicatorPaneHeightLimits,
computeVolumeHeightLimits,
computeAoHeightLimits,
computeMacdHeightLimits,
clampCoinsListWidth,
clampCoinsRsiHeight,
clampCoinsVolumeHeight,
clampCoinsAoHeight,
clampCoinsMacdHeight,
coinsMainChartWidthPx,
defaultRsiHeightPx,
defaultVolumeHeightPx,
defaultAoHeightPx,
defaultMacdHeightPx
} from "../js/terminal-layout-math.js";

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
"defaultVolumeHeightPx and defaultAoHeightPx match RSI default",
()=>{

assert.equal(
defaultVolumeHeightPx(
800
),
defaultRsiHeightPx(
800
)
);

assert.equal(
defaultAoHeightPx(
800
),
defaultRsiHeightPx(
800
)
);

assert.equal(
defaultMacdHeightPx(
800
),
defaultRsiHeightPx(
800
)
);

}
);

test(
"computeIndicatorPaneHeightLimits: 50%–200% of default",
()=>{

const limits =
computeIndicatorPaneHeightLimits(
800
);

assert.equal(
limits.defaultH,
141
);

assert.equal(
limits.minH,
71
);

assert.equal(
limits.maxH,
282
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
"computeCoinsLayoutLimits: subtracts AO and Volume from RSI headroom",
()=>{

const limits =
computeCoinsLayoutLimits(
{
appWidth:
1000,
chartsStackHeight:
700,
innerHeight:
800,
volumeOccupiedHeight:
140,
aoOccupiedHeight:
120
}
);

assert.equal(
limits.maxRsiH,
Math.round(
Math.max(
COINS_RSI_MIN_DESKTOP_PX,
700 -
140 -
120 -
limits.minChartH
)
)
);

}
);

test(
"computeVolumeHeightLimits: 50%–200% of default",
()=>{

const limits =
computeVolumeHeightLimits(
{
innerHeight:
800
}
);

assert.equal(
limits.defaultVolumeH,
141
);

assert.equal(
limits.minVolumeH,
71
);

assert.equal(
limits.maxVolumeH,
282
);

}
);

test(
"computeAoHeightLimits: 50%–200% of default",
()=>{

const limits =
computeAoHeightLimits(
{
innerHeight:
800
}
);

assert.equal(
limits.defaultAoH,
141
);

assert.equal(
limits.minAoH,
71
);

assert.equal(
limits.maxAoH,
282
);

}
);

test(
"computeMacdHeightLimits: 50%–200% of default",
()=>{

const limits =
computeMacdHeightLimits(
{
innerHeight:
800
}
);

assert.equal(
limits.defaultMacdH,
141
);

assert.equal(
limits.minMacdH,
71
);

assert.equal(
limits.maxMacdH,
282
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
"clampCoinsVolumeHeight: 50%–200% of default",
()=>{

const limits =
computeVolumeHeightLimits(
{
innerHeight:
800
}
);

assert.equal(
clampCoinsVolumeHeight(
50,
limits
),
limits.minVolumeH
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

test(
"clampCoinsAoHeight: 50%–200% of default",
()=>{

const limits =
computeAoHeightLimits(
{
innerHeight:
800
}
);

assert.equal(
clampCoinsAoHeight(
50,
limits
),
limits.minAoH
);

assert.equal(
clampCoinsAoHeight(
limits.maxAoH +
50,
limits
),
limits.maxAoH
);

assert.equal(
clampCoinsAoHeight(
150,
limits
),
150
);

}
);

test(
"coinsMainChartWidthPx: subtracts list and vertical toolbar",
()=>{

const leftPaneW =
1252;

assert.equal(
coinsMainChartWidthPx(
leftPaneW
),
leftPaneW -
COINS_LIST_DEFAULT_PX -
COINS_DRAW_TOOLBAR_WIDTH_PX
);

assert.equal(
coinsMainChartWidthPx(
leftPaneW,
{
drawToolbarWidth:
0
}
),
leftPaneW -
COINS_LIST_DEFAULT_PX
);

assert.equal(
coinsMainChartWidthPx(
300,
{
listWidth:
COINS_LIST_MIN_PX
}
),
Math.max(
0,
300 -
COINS_LIST_MIN_PX -
COINS_DRAW_TOOLBAR_WIDTH_PX
)
);

}
);
