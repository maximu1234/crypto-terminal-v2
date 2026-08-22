/**
 * Сцена 1-2 EARLY T3 на Терминале.
 * Не бот и не оригинал js/indicators/pattern-12*.
 */
import {
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-early-t3-math.js?v=1";

/** @type {{ key: string, scene: object|null }} */
let cache = {
key:
"",
scene:
null
};

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
last?.close ??
""
].join(
"|"
);

}

export function getOrComputePattern12EarlyT3Scene(
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
