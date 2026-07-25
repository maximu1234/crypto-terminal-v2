/** @module drawings/constants */
export const DEFAULT_FIB_SPEC = Object.freeze([
{ v:0, enabled:true, color:"#facc15" },
{ v:0.25, enabled:true, color:"#ef4444" },
{ v:0.382, enabled:true, color:"#ffa726" },
{ v:0.5, enabled:true, color:"#ffffff" },
{ v:0.618, enabled:true, color:"#ffa726" },
{ v:0.75, enabled:true, color:"#ef4444" },
{ v:1, enabled:true, color:"#facc15" },
{ v:1.25, enabled:true, color:"#ef4444" },
{ v:2, enabled:true, color:"#facc15" },
{ v:1.5, enabled:true, color:"#9ca3af" },
{ v:2.44, enabled:true, color:"#66bb6a" },
{ v:0.75, enabled:false, color:"#ffffff" },
{ v:2.5, enabled:true, color:"#66bb6a" },
{ v:-0.5, enabled:false, color:"#ffffff" },
{ v:3, enabled:true, color:"#facc15" },
{ v:-1.44, enabled:false, color:"#ffffff" },
{ v:-1.44, enabled:false, color:"#ffffff" },
{ v:-2.618, enabled:false, color:"#ffffff" }
]);

export const STROKE = "#3b82f6";
export const HANDLE_FILL = "#000000";
export const HANDLE_STROKE = "#ffffff";
export const WIDTH_OPTIONS = [1, 2, 3, 4];

/** Horizontal Ray / Horizontal Line — одна опорная точка (time, price). */
export function isHorizPriceTool(
type
){

return type ===
"hray" ||
type ===
"hline";

}

/** X начала сегмента: луч — от якоря вправо; линия — через весь plot. */
export function horizPriceLineX1(
type,
anchorX
){

return type ===
"hline"
? 0
: anchorX;

}
export const USER_PREFS_KEY = "draw_user_prefs";
export const GLOBAL_STYLE_KEY = "draw_style_global_v1";
/** Смена — полный сброс draw_defaults_fib (v5: repair invisible fib after c088d9f) */
export const FIB_TOOL_DEFAULTS_VERSION = 5;

export const FIB_LINE_DASH = Object.freeze({
solid: [],
dashed: [8, 6],
dotted: [2, 3]
});

/** Мин. горизонтальный span якорей; уже — span уровней расширяется вокруг середины */
export const FIB_MIN_ANCHOR_SPAN_PX =
12;

/** Hit-test: допуск по X вокруг span уровня (touch / iPad) */
export const FIB_HIT_X_PAD_PX =
8;

/** Hit-test: desktop — только линия уровня, без горизонтального «коридора» */
export const FIB_HIT_X_PAD_DESKTOP_PX =
0;

/** Perpendicular hit distance: тело линии (touch) */
export const DRAW_BODY_HIT_THRESHOLD_TOUCH =
8;

/** Perpendicular hit distance: тело линии (desktop mouse) — ≈ толщина линии */
export const DRAW_BODY_HIT_THRESHOLD_DESKTOP =
2;

/** Handle hit radius: desktop (≈ anchor r=5 + 1px) */
export const DRAW_HANDLE_HIT_THRESHOLD_DESKTOP =
6;

/** Handle hit radius: desktop position tool (≈ drawPositionAnchor r=7) */
export const DRAW_HANDLE_HIT_THRESHOLD_DESKTOP_POSITION =
8;

export const FIB_LABEL_X_PAD_PX =
4;

export const FIB_LABEL_RIGHT_RESERVE_PX =
28;

export const POSITION_ENTRY_COLOR = "#FACC15";
export const POSITION_TP_FILL = "rgba(20, 83, 45, 0.58)";
export const POSITION_SL_FILL = "rgba(127, 29, 29, 0.58)";
/** Фон меток уровней Long/Short на ценовой шкале */
export const POSITION_SCALE_TP_BG = "rgba(22, 101, 52, 0.95)";
export const POSITION_SCALE_SL_BG = "rgba(127, 29, 29, 0.95)";
export const POSITION_SCALE_ENTRY_BG = "rgba(113, 63, 18, 0.95)";
/** Запасной %, если не удалось перевести пиксели в цену */
export const POSITION_DEFAULT_TP_PCT = 0.03;
export const POSITION_DEFAULT_SL_PCT = 0.015;
/** Высота зон TP/SL при создании Long/Short (×3 от базы; ширина не меняется) */
export const POSITION_DEFAULT_ZONE_HEIGHT_MULT =
3;

export const POSITION_DEFAULT_TP_ZONE_PX =
56 *
POSITION_DEFAULT_ZONE_HEIGHT_MULT;

export const POSITION_DEFAULT_SL_ZONE_PX =
28 *
POSITION_DEFAULT_ZONE_HEIGHT_MULT;

export const POSITION_DEFAULT_WIDTH_BARS = 14;
export const POSITION_RR_LABEL_SAMPLE =
"Risk/reward ratio: 9.99";

export const RECT_DEFAULT_COLOR =
"#a855f7";

export const RECT_DEFAULT_FILL_COLOR =
RECT_DEFAULT_COLOR;

export const RECT_DEFAULT_FILL_OPACITY =
0.15;

export const RECT_TOOL_DEFAULTS_VERSION =
1;

export function createRectangleToolDefaults(
overrides =
{}
){

return {
rectDefaultsVersion:
RECT_TOOL_DEFAULTS_VERSION,
color:
RECT_DEFAULT_COLOR,
lineWidth:
1,
lineStyle:
"solid",
showFill:
true,
fillColor:
RECT_DEFAULT_FILL_COLOR,
fillOpacity:
RECT_DEFAULT_FILL_OPACITY,
showMedian:
false,
medianColor:
RECT_DEFAULT_COLOR,
medianLineWidth:
1,
medianLineStyle:
"dashed",
...overrides
};

}

export function migrateRectangleToolDefaults(
saved
){

if(
saved?.rectDefaultsVersion ===
RECT_TOOL_DEFAULTS_VERSION
){
return saved;
}

return createRectangleToolDefaults();

}
