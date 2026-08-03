/**
 * Shared Pattern-12 scene for algo chart indicator + bottom stats.
 * Avoids computing the same scene twice on one candle update.
 */
import {
computePattern12Scene,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-math.js?v=5";

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
 * @param {Array<{ time?: number }>|null|undefined} candles
 * @returns {string}
 */
function candlesCacheKey(
candles
){

if(
!Array.isArray(
candles
) ||
!candles.length
){
return "0";
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

return [
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

/**
 * @param {Array} candles
 * @param {object} [settings]
 * @returns {object|null}
 */
export function getOrComputeAlgoPattern12Scene(
candles,
settings
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
candles
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
