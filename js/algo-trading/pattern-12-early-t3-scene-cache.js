/**
 * Сцена индикатора 1-2 EARLY T3 (не бот, не оригинал Паттерн 1-2).
 */
import {
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-early-t3-math.js?v=2";

/** @type {{ key: string, scene: object|null }} */
let cache = {
key:
"",
scene:
null
};

/**
 * @param {unknown} settings
 * @returns {string}
 */
function settingsCacheKey(
settings
){

try{
return JSON.stringify(
normalizePattern12Settings(
settings ||
defaultPattern12Settings()
)
);
}catch{
return "";
}

}

/**
 * @param {Array<{ time?: number, close?: number }>|null|undefined} candles
 * @param {string} [scope]
 * @returns {string}
 */
function candlesCacheKey(
candles,
scope =
""
){

if(
!Array.isArray(
candles
) ||
!candles.length
){
return `${scope || "0"}|0`;
}

const first =
candles[
0
];
const last =
candles[
candles.length -
1
];
/* scope (symbol) обязателен: на одном ТФ length/first/last.time часто совпадают
   у разных тикеров → без scope «Подобрать для всех» брал чужую сцену. */
const id =
String(
scope ||
""
).trim().toUpperCase() ||
"_";

return [
id,
candles.length,
first?.time ??
"",
last?.time ??
"",
last?.open ??
"",
last?.high ??
"",
last?.low ??
"",
last?.close ??
""
].join(
"|"
);

}

/**
 * @param {Array} candles
 * @param {object} [settings]
 * @param {string} [scope] symbol / уникальный ключ серии
 * @returns {object|null}
 */
export function getOrComputeAlgoPattern12Scene(
candles,
settings,
scope =
""
){

if(
!Array.isArray(
candles
) ||
candles.length <
3
){
cache =
{
key:
"",
scene:
null
};
return null;
}

const normalized =
normalizePattern12Settings(
settings ||
defaultPattern12Settings()
);
const key =
`${candlesCacheKey(
candles,
scope
)}::${settingsCacheKey(
normalized
)}`;

if(
cache.key ===
key &&
cache.scene
){
return cache.scene;
}

const scene =
computePattern12Scene(
candles,
normalized
);

cache =
{
key,
scene
};

return scene;

}

export function invalidateAlgoPattern12SceneCache(){

cache =
{
key:
"",
scene:
null
};

}

/** @type {Set<string>|null} */
let paintHideKeys =
null;

/**
 * @param {unknown} side
 * @param {unknown} b4
 * @param {unknown} p4
 * @returns {string}
 */
function setupPaintKey(
side,
b4,
p4
){

const n =
Number(
p4
);

return [
side ===
"short"
? "s"
: "l",
Number(
b4
),
Number.isFinite(
n
)
? n.toPrecision(
10
)
: ""
].join(
"|"
);

}

function eventPaintSide(
event
){

if(
event?.setupSide ===
"short" ||
event?.setupSide ===
"long"
){
return event.setupSide;
}

return event?.side ===
"short"
? "short"
: "long";

}

/**
 * @param {unknown} bar
 * @param {unknown} price
 * @returns {string}
 */
function pointPaintKey(
bar,
price
){

const n =
Number(
price
);

return [
Number(
bar
),
Number.isFinite(
n
)
? n.toPrecision(
10
)
: ""
].join(
"|"
);

}

/**
 * После анализа: скрыть только сетапы, чей entry отсёк фильтр (Supertrend).
 * Pending, отмена по таймауту и прочие линии Паттерн 1-2 остаются —
 * иначе при открытой панели «Данные» пропадают Short/Long, как при свёрнутой.
 * @param {Array|null|undefined} events filtered entry/cancel events
 * @param {{ pendingSetups?: Array|null, rawEvents?: Array|null }} [opts]
 */
export function setAlgoPattern12PaintEntryFilter(
events,
opts =
{}
){

const filtered =
Array.isArray(
events
)
? events
: [];
const raw =
Array.isArray(
opts.rawEvents
)
? opts.rawEvents
: filtered;
const kept =
new Set();

for(
const event of filtered
){

if(
event?.type !==
"entry"
){
continue;
}

kept.add(
setupPaintKey(
eventPaintSide(
event
),
event.setupBar,
event.pt4
)
);

}

const hide =
new Set();

for(
const event of raw
){

if(
event?.type !==
"entry"
){
continue;
}

const key =
setupPaintKey(
eventPaintSide(
event
),
event.setupBar,
event.pt4
);

if(
!kept.has(
key
)
){
hide.add(
key
);
}

}

paintHideKeys =
hide;

}

export function clearAlgoPattern12PaintEntryFilter(){

paintHideKeys =
null;

}

/**
 * Сцена для paint/легенды.
 * null — фильтр выключен (панель свёрнута / анализ не бежал) → полная сцена.
 * Set — скрыть только Supertrend-rejected entry; пустой Set = фильтры выключены → тоже полная сцена.
 * @param {object|null|undefined} scene
 * @returns {object|null|undefined}
 */
export function applyAlgoPattern12PaintEntryFilter(
scene
){

if(
!scene ||
!(
paintHideKeys instanceof Set
) ||
!paintHideKeys.size
){
return scene;
}

const setups =
Array.isArray(
scene.setups
)
? scene.setups.filter(
setup=>
!paintHideKeys.has(
setupPaintKey(
setup.side,
setup.b4,
setup.p4
)
)
)
: [];

const keepSetup =
new Set(
setups.map(
setup=>
setupPaintKey(
setup.side,
setup.b4,
setup.p4
)
)
);

const keepPoints =
new Set();

for(
const setup of setups
){

keepPoints.add(
pointPaintKey(
setup.b1,
setup.p1
)
);
keepPoints.add(
pointPaintKey(
setup.b2,
setup.p2
)
);
keepPoints.add(
pointPaintKey(
setup.b3,
setup.p3
)
);
keepPoints.add(
pointPaintKey(
setup.b4,
setup.p4
)
);

}

/** @type {Array} */
const patternLines =
[];

/* Не восстанавливаем линии, если в настройках индикатора они выключены
   (тогда в исходной сцене patternLines пустой). */
if(
Array.isArray(
scene.patternLines
) &&
scene.patternLines.length
){

for(
const setup of setups
){

patternLines.push(
{
barA:
setup.b1,
priceA:
setup.p1,
barB:
setup.b3,
priceB:
setup.p3
},
{
barA:
setup.b2,
priceA:
setup.p2,
barB:
setup.b4,
priceB:
setup.p4
}
);

}

}

return {
...scene,
setups,
patternLines,
pt4Dots:
Array.isArray(
scene.pt4Dots
)
? scene.pt4Dots.filter(
dot=>
keepSetup.has(
setupPaintKey(
dot.side,
dot.bar,
dot.price
)
)
)
: [],
pt4Marks:
Array.isArray(
scene.pt4Marks
)
? scene.pt4Marks.filter(
mark=>
keepSetup.has(
setupPaintKey(
mark.side,
mark.bar,
mark.price
)
)
)
: [],
badges:
Array.isArray(
scene.badges
)
? scene.badges.filter(
badge=>
keepPoints.has(
pointPaintKey(
badge.bar,
badge.price
)
)
)
: []
};

}
