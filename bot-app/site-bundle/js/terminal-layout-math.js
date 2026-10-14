/** Чистая математика layout /coins — без DOM и localStorage (unit tests). */

export const COINS_LIST_DEFAULT_PX =
252;

export const COINS_LIST_MIN_PX =
252;

export const COINS_RSI_MIN_DESKTOP_PX =
102;

/** Desktop vertical draw toolbar width (css/terminal-layout.css). */
export const COINS_DRAW_TOOLBAR_WIDTH_PX =
49.5;

/** Volume / AO: min 50% и max 200% от дефолтной высоты (как у RSI). */
export const COINS_INDICATOR_PANE_MIN_RATIO =
0.5;

export const COINS_INDICATOR_PANE_MAX_RATIO =
2;

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

export function defaultVolumeHeightPx(
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
){

return defaultRsiHeightPx(
innerHeight
);

}

export function defaultAoHeightPx(
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
){

return defaultRsiHeightPx(
innerHeight
);

}

export function defaultMacdHeightPx(
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
){

return defaultRsiHeightPx(
innerHeight
);

}

/**
 * Дефолтная высота индикаторной панели (Volume, AO): как RSI;
 * сжатие до 50%, растяжение до 200%.
 */
export function computeIndicatorPaneHeightLimits(
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
){

const defaultH =
defaultRsiHeightPx(
innerHeight
);

const minH =
Math.max(
1,
Math.round(
defaultH *
COINS_INDICATOR_PANE_MIN_RATIO
)
);

const maxH =
Math.round(
defaultH *
COINS_INDICATOR_PANE_MAX_RATIO
);

return {
defaultH,
minH,
maxH
};

}

/**
 * Plot width for #chart-wrap inside .coins-chart-pane (list + optional toolbar).
 */
export function coinsMainChartWidthPx(
leftPaneWidth,
{
listWidth = COINS_LIST_DEFAULT_PX,
drawToolbarWidth = COINS_DRAW_TOOLBAR_WIDTH_PX
} = {}
){

const paneW =
Math.max(
0,
(
Number(
leftPaneWidth
) ||
0
) -
listWidth
);

return Math.max(
0,
paneW -
Math.max(
0,
Number(
drawToolbarWidth
) ||
0
)
);

}

export function computeVolumeHeightLimits(
{
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
} = {}
){

const {
defaultH,
minH,
maxH
} =
computeIndicatorPaneHeightLimits(
innerHeight
);

return {
defaultVolumeH:
defaultH,
minVolumeH:
minH,
maxVolumeH:
maxH
};

}

export function computeAoHeightLimits(
{
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
} = {}
){

const {
defaultH,
minH,
maxH
} =
computeIndicatorPaneHeightLimits(
innerHeight
);

return {
defaultAoH:
defaultH,
minAoH:
minH,
maxAoH:
maxH
};

}

export function computeMacdHeightLimits(
{
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT
} = {}
){

const {
defaultH,
minH,
maxH
} =
computeIndicatorPaneHeightLimits(
innerHeight
);

return {
defaultMacdH:
defaultH,
minMacdH:
minH,
maxMacdH:
maxH
};

}

export function clampCoinsVolumeHeight(
volumeHeight,
limits
){

const h =
Number(
volumeHeight
);

if(
!Number.isFinite(
h
)
){
return limits.defaultVolumeH;
}

return Math.round(
Math.min(
limits.maxVolumeH,
Math.max(
limits.minVolumeH,
h
)
)
);

}

export function clampCoinsAoHeight(
aoHeight,
limits
){

const h =
Number(
aoHeight
);

if(
!Number.isFinite(
h
)
){
return limits.defaultAoH;
}

return Math.round(
Math.min(
limits.maxAoH,
Math.max(
limits.minAoH,
h
)
)
);

}

export function clampCoinsMacdHeight(
macdHeight,
limits
){

const h =
Number(
macdHeight
);

if(
!Number.isFinite(
h
)
){
return limits.defaultMacdH;
}

return Math.round(
Math.min(
limits.maxMacdH,
Math.max(
limits.minMacdH,
h
)
)
);

}

export function computeCoinsLayoutLimits(
{
appWidth,
chartsStackHeight,
innerHeight =
COINS_LAYOUT_DEFAULT_INNER_HEIGHT,
volumeOccupiedHeight = 0,
aoOccupiedHeight = 0,
macdOccupiedHeight = 0
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

const volumeH =
Math.max(
0,
Number(
volumeOccupiedHeight
) ||
0
);

const aoH =
Math.max(
0,
Number(
aoOccupiedHeight
) ||
0
);

const macdH =
Math.max(
0,
Number(
macdOccupiedHeight
) ||
0
);

const stackForChartRsi =
Math.max(
0,
stackH -
volumeH -
aoH -
macdH
);

const defaultChartH =
Math.max(
0,
stackForChartRsi -
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
Math.round(
Math.max(
COINS_LIST_MIN_PX,
appW -
minChartW
)
),
maxRsiH:
Math.round(
Math.max(
COINS_RSI_MIN_DESKTOP_PX,
stackForChartRsi -
minChartH
)
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
