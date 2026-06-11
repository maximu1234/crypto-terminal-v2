/** Чистая математика layout /coins — без DOM и localStorage (unit tests). */

export const COINS_LIST_DEFAULT_PX =
252;

export const COINS_LIST_MIN_PX =
252;

export const COINS_RSI_MIN_DESKTOP_PX =
102;

export const COINS_PANEL_MIN_RATIO =
0.2;

export const COINS_LAYOUT_DEFAULT_INNER_HEIGHT =
800;

export function defaultRsiHeightPx(
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
){

return Math.round(
Math.min(
160,
Math.max(
COINS_RSI_MIN_DESKTOP_PX,
innerHeight *
0.176
)
)
);

}

export function computeCoinsLayoutLimits(
{
appWidth,
chartsStackHeight,
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
} = {}
){

const appW =
Math.max(
0,
Number(
appWidth
) ||
0
);

const stackH =
Math.max(
0,
Number(
chartsStackHeight
) ||
0
);

const defaultListW =
COINS_LIST_DEFAULT_PX;

const defaultChartW =
Math.max(
0,
appW -
defaultListW
);

const defaultRsiH =
defaultRsiHeightPx(
innerHeight
);

const defaultChartH =
Math.max(
0,
stackH -
defaultRsiH
);

const minChartW =
defaultChartW *
COINS_PANEL_MIN_RATIO;

const minChartH =
defaultChartH *
COINS_PANEL_MIN_RATIO;

return {
appW,
stackH,
defaultListW,
defaultChartW,
defaultRsiH,
defaultChartH,
minChartW,
minChartH,
minListW:
COINS_LIST_MIN_PX,
minRsiH:
COINS_RSI_MIN_DESKTOP_PX,
maxListW:
Math.max(
COINS_LIST_MIN_PX,
appW -
minChartW
),
maxRsiH:
Math.max(
COINS_RSI_MIN_DESKTOP_PX,
stackH -
minChartH
)
};

}

export function clampCoinsListWidth(
listWidth,
limits
){

const w =
Number(
listWidth
);

if(
!Number.isFinite(
w
)
){
return limits.defaultListW;
}

return Math.round(
Math.min(
limits.maxListW,
Math.max(
limits.minListW,
w
)
)
);

}

export function clampCoinsRsiHeight(
rsiHeight,
limits
){

const h =
Number(
rsiHeight
);

if(
!Number.isFinite(
h
)
){
return limits.defaultRsiH;
}

return Math.round(
Math.min(
limits.maxRsiH,
Math.max(
limits.minRsiH,
h
)
)
);

}
