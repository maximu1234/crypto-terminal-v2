/**
 * Подсчёт завершённых паттернов 1-2 на загруженных свечах (АлгоТрейдинг).
 * Использует КОПИЮ math, не оригинал индикатора.
 */
import {
computePattern12Scene,
defaultPattern12Settings
} from "./pattern-12-math.js?v=21";

/**
 * @param {object|null|undefined} scene
 * @returns {{ long: number, short: number, total: number }}
 */
export function countPattern12SetupsFromScene(
scene
){

const dots =
Array.isArray(
scene?.pt4Dots
)
? scene.pt4Dots
: [];

let long =
0;
let short =
0;

for(
const dot of dots
){

if(
dot?.side ===
"long"
){
long +=
1;
}else if(
dot?.side ===
"short"
){
short +=
1;
}

}

return {
long,
short,
total:
long +
short
};

}

/**
 * @param {Array} candles
 * @returns {{ long: number, short: number, total: number }}
 */
export function countPattern12Setups(
candles
){

return countPattern12SetupsFromScene(
computePattern12Scene(
candles,
defaultPattern12Settings()
)
);

}

/**
 * @param {{ long: number, short: number, total?: number }|null} counts
 * @param {ParentNode|Document} [root]
 */
export function renderAlgoPatternCounts(
counts,
root =
document
){

const longEl =
root.querySelector?.(
"[data-algo-stat-long]"
) ||
root.getElementById?.(
"algo-stat-long"
);
const shortEl =
root.querySelector?.(
"[data-algo-stat-short]"
) ||
root.getElementById?.(
"algo-stat-short"
);

const long =
counts &&
Number.isFinite(
counts.long
)
? counts.long
: "—";
const short =
counts &&
Number.isFinite(
counts.short
)
? counts.short
: "—";

if(
longEl
){
longEl.textContent =
String(
long
);
}

if(
shortEl
){
shortEl.textContent =
String(
short
);
}

}
