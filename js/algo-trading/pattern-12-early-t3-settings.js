/**
 * Снимок настроек индикатора 1-2 EARLY T3 с графика АлгоТрейдинг.
 */
import {
ALGO_INDICATORS_STORAGE_KEY
} from "./indicators-storage.js?v=1";

import {
PATTERN_12_EARLY_T3_ID,
defaultPattern12Settings,
normalizePattern12Settings
} from "./pattern-12-early-t3-math.js?v=2";

/**
 * @returns {ReturnType<typeof defaultPattern12Settings>}
 */
export function readAlgoPattern12EarlyT3Settings(){

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
`settings_${PATTERN_12_EARLY_T3_ID}`
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
