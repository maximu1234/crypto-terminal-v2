/**
 * Draw tool defaults / global style / user prefs (localStorage).
 */
import {
  STROKE,
  USER_PREFS_KEY,
  GLOBAL_STYLE_KEY,
  RECT_DEFAULT_COLOR,
  migrateRectangleToolDefaults
} from "./constants.js?v=11";

import {
  normalizeRectangleShape
} from "./arrow-rect.js?v=2";

import {
  migrateFibToolDefaults,
  ensureFibLevelsVisible
} from "./fib-spec.js?v=13";

import {
  isPositionType
} from "./position.js?v=9";

/**
 * @returns {{
 *   loadToolDefaults: () => void,
 *   loadGlobalStyle: () => object,
 *   saveGlobalStyle: (partial: object) => void,
 *   saveToolDefaults: (name: string, data: object) => void,
 *   loadUserPrefs: () => object,
 *   saveUserPrefs: (partial: object) => void,
 *   baseDefaultStyle: (type: string) => object,
 *   getToolDefaults: () => Record<string, object|null>
 * }}
 */
export function createDrawPrefs(){

const toolDefaults =
{};

function defaultsStorageKey(
name
){

return `draw_defaults_${name}`;

}

function loadToolDefaults(){

[
"trendline",
"brush",
"hray",
"hline",
"fib",
"channel",
"arrow",
"rectangle",
"long",
"short"
].forEach(
name=>{

try{

const raw =
localStorage.getItem(
defaultsStorageKey(
name
)
);

toolDefaults[
name
] =
raw
? JSON.parse(
raw
)
: null;

}catch{

toolDefaults[
name
] =
null;

}

if(
name ===
"fib"
){

const migrated =
migrateFibToolDefaults(
toolDefaults.fib
);

toolDefaults.fib =
migrated;

localStorage.setItem(
defaultsStorageKey(
"fib"
),
JSON.stringify(
migrated
)
);

}

if(
name ===
"rectangle"
){

const migrated =
migrateRectangleToolDefaults(
toolDefaults.rectangle
);

toolDefaults.rectangle =
migrated;

localStorage.setItem(
defaultsStorageKey(
"rectangle"
),
JSON.stringify(
migrated
)
);

}

}
);

}

function loadGlobalStyle(){

try{

return JSON.parse(
localStorage.getItem(
GLOBAL_STYLE_KEY
) ||
"{}"
);

}catch{

return {};

}

}

function saveGlobalStyle(
partial
){

const next =
{
...loadGlobalStyle(),
...partial
};

localStorage.setItem(
GLOBAL_STYLE_KEY,
JSON.stringify(
next
)
);

}

function saveToolDefaults(
name,
data
){

const next =
{
...(
toolDefaults[
name
] ||
{}
),
...data
};

toolDefaults[
name
] =
next;

localStorage.setItem(
defaultsStorageKey(
name
),
JSON.stringify(
next
)
);

}

function loadUserPrefs(){

try{

return JSON.parse(
localStorage.getItem(
USER_PREFS_KEY
) ||
"{}"
);

}catch{

return {};

}

}

function saveUserPrefs(
partial
){

const next =
{
...loadUserPrefs(),
...partial
};

localStorage.setItem(
USER_PREFS_KEY,
JSON.stringify(
next
)
);

}

function baseDefaultStyle(
type
){

const global =
loadGlobalStyle();

const saved =
toolDefaults[
type
] ||
{};

const out =
{
color:
saved.color ||
global.color ||
STROKE,
lineWidth:
saved.lineWidth ??
global.lineWidth ??
1
};

if(
isPositionType(
type
)
){

const prefs =
loadUserPrefs();

const risk =
saved.riskUsd ??
prefs.positionRiskUsd;

if(
risk !=
null &&
Number(
risk
) >
0
){
out.riskUsd =
Number(
risk
);
}

}

if(
type ===
"fib"
){

const fibStore =
migrateFibToolDefaults(
toolDefaults.fib ||
saved
);

out.fibLevels =
JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
fibStore.fibLevels
)
)
);

out.fibShowTrendLine =
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: false;

if(
saved?.color
){
out.color =
saved.color;
}

if(
saved?.lineWidth !=
null
){
out.lineWidth =
saved.lineWidth;
}

}

if(
type ===
"rectangle"
){

const rectSaved =
migrateRectangleToolDefaults(
toolDefaults.rectangle ||
saved ||
null
);

out.color =
rectSaved.color ||
RECT_DEFAULT_COLOR;
out.lineWidth =
rectSaved.lineWidth ??
1;

normalizeRectangleShape(
out,
rectSaved
);

}

return out;

}

return {
loadToolDefaults,
loadGlobalStyle,
saveGlobalStyle,
saveToolDefaults,
loadUserPrefs,
saveUserPrefs,
baseDefaultStyle,
getToolDefaults:()=>
toolDefaults
};

}
