/**
 * Draw tool defaults / global style / user prefs (localStorage).
 */
import {
  STROKE,
  USER_PREFS_KEY,
  GLOBAL_STYLE_KEY,
  RECT_DEFAULT_COLOR,
  migrateRectangleToolDefaults
} from "./constants.js?v=13";

import {
  normalizeRectangleShape
} from "./arrow-rect.js?v=2";

import {
  migrateFvpToolDefaults,
  isFvpType
} from "./fixed-volume-profile.js?v=3";

import {
  migrateFibToolDefaults,
  migrateFibExtToolDefaults,
  ensureFibLevelsVisible,
  isFibType,
  isFibExtType,
  resolveFibTrendLineColor
} from "./fib-spec.js?v=17";

import {
  isPositionType
} from "./position.js?v=11";

import {
  migrateTextToolDefaults,
  TEXT_DEFAULT_COLOR,
  TEXT_DEFAULT_SIZE
} from "./text.js?v=3";

import {
  migrateChannelToolDefaults
} from "./channel-spec.js?v=1";

import {
  ELLIOTT_TOOL_TYPES,
  isElliottType,
  migrateElliottToolDefaults
} from "./elliott-spec.js?v=5";

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
"fib-ext",
"channel",
"arrow",
"rectangle",
"fvp",
"text",
"long",
"short",
...ELLIOTT_TOOL_TYPES
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
"fib-ext"
){

const migrated =
migrateFibExtToolDefaults(
toolDefaults["fib-ext"]
);

toolDefaults["fib-ext"] =
migrated;

localStorage.setItem(
defaultsStorageKey(
"fib-ext"
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

if(
name ===
"fvp"
){

const migrated =
migrateFvpToolDefaults(
toolDefaults.fvp
);

toolDefaults.fvp =
migrated;

localStorage.setItem(
defaultsStorageKey(
"fvp"
),
JSON.stringify(
migrated
)
);

}

if(
name ===
"text"
){

const migrated =
migrateTextToolDefaults(
toolDefaults.text
);

toolDefaults.text =
migrated;

localStorage.setItem(
defaultsStorageKey(
"text"
),
JSON.stringify(
migrated
)
);

}

if(
name ===
"channel"
){

const migrated =
migrateChannelToolDefaults(
toolDefaults.channel
);

toolDefaults.channel =
migrated;

localStorage.setItem(
defaultsStorageKey(
"channel"
),
JSON.stringify(
migrated
)
);

}

if(
isElliottType(
name
)
){

const migrated =
migrateElliottToolDefaults(
toolDefaults[
name
]
);

toolDefaults[
name
] =
migrated;

localStorage.setItem(
defaultsStorageKey(
name
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
isFibType(
type
)
){

const migrate =
isFibExtType(
type
)
? migrateFibExtToolDefaults
: migrateFibToolDefaults;
const fibStore =
migrate(
toolDefaults[type] ||
saved
);

out.fibLevels =
JSON.parse(
JSON.stringify(
ensureFibLevelsVisible(
fibStore.fibLevels,
type
)
)
);

out.fibShowTrendLine =
typeof fibStore.fibShowTrendLine ===
"boolean"
? fibStore.fibShowTrendLine
: isFibExtType(
type
);

out.fibTrendLineColor =
resolveFibTrendLineColor(
fibStore.fibTrendLineColor
);

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

if(
isFvpType(
type
)
){

const fvpSaved =
migrateFvpToolDefaults(
toolDefaults.fvp ||
saved ||
null
);

Object.assign(
out,
fvpSaved
);

}

if(
type ===
"text"
){

const textSaved =
migrateTextToolDefaults(
toolDefaults.text ||
saved ||
null
);

out.color =
textSaved.color ||
TEXT_DEFAULT_COLOR;
out.fontSize =
textSaved.fontSize ||
TEXT_DEFAULT_SIZE;

}

if(
type ===
"channel"
){

const channelSaved =
migrateChannelToolDefaults(
toolDefaults.channel ||
saved ||
null
);

out.color =
channelSaved.color;
out.lineWidth =
channelSaved.lineWidth ??
1;
out.channelLevels =
JSON.parse(
JSON.stringify(
channelSaved.channelLevels
)
);

}

if(
isElliottType(
type
)
){

const elliottSaved =
migrateElliottToolDefaults(
toolDefaults[
type
] ||
saved ||
null
);

out.color =
elliottSaved.color;
out.lineWidth =
elliottSaved.lineWidth ??
1;
out.degree =
elliottSaved.degree;
out.showWave =
elliottSaved.showWave !==
false;

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
