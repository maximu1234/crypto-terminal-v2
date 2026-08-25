/**
 * Настройки Pattern 1-2 из prefs меню индикаторов АлгоТрейдинг.
 */
import {
ALGO_INDICATORS_STORAGE_KEY
} from "./indicators-storage.js?v=1";

import {
PATTERN_12_ID,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-math.js?v=21";

/**
 * @returns {ReturnType<typeof defaultPattern12Settings>}
 */
export function readAlgoPattern12Settings(){

try{
const raw =
localStorage.getItem(
ALGO_INDICATORS_STORAGE_KEY
);

if(
!raw
){
return defaultPattern12Settings();
}

const prefs =
JSON.parse(
raw
);
const stored =
prefs &&
typeof prefs ===
"object"
? prefs[
`settings_${PATTERN_12_ID}`
]
: null;

return normalizePattern12Settings(
stored &&
typeof stored ===
"object"
? stored
: defaultPattern12Settings()
);
}catch{
return defaultPattern12Settings();
}

}

/**
 * Стабильный ключ для кэша скана избранных.
 * @param {object} [settings]
 * @returns {string}
 */
export function pattern12SettingsCacheKey(
settings
){

const s =
normalizePattern12Settings(
settings ||
readAlgoPattern12Settings()
);

return [
s.patternMode,
s.decLowsBeforePt1,
s.ascHighsBeforePt1,
s.waveAMode,
s.lngWaveCMode,
s.shtWaveCMode,
s.rsiOverbought,
s.rsiOversold,
s.lngRsiLength,
s.lngMicRsiLength,
s.shtRsiLength,
s.shtMicRsiLength,
s.requirePt3ConfirmBeforePt4
? 1
: 0,
s.earlyPt3Confirm
? 1
: 0,
s.reverseLogic
? 1
: 0,
s.tempFastPt4
? 1
: 0,
s.tempFastPt4Bars
].join(
":"
);

}
