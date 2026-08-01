/**
 * TEMPORARY — pullback-before-arm filter for Algo «Данные» + bot strategies.
 *
 * Easy removal: delete this file, drop imports/opts/UI wired with
 * `TEMP_PULLBACK_BEFORE_ARM` / `temp-pullback-before-arm`, and revert
 * the arm gate in pattern-entry-logic.js + bot engine/prefs/UI.
 *
 * Rule (long; short mirrored): after pt4 is found, do not arm until price
 * pulls back toward pt3 by N% of X (log span pt4→pt3). Entry remains the
 * first pt4 cross after that. If price pierces pt4 before the pullback,
 * the setup is cancelled (no second-chance entry later).
 *
 * No imports from pattern-entry-positions / drawings — safe for Electron main
 * pattern-loader ESM cache.
 */

/** Marker for grepping temporary wiring. */
export const TEMP_PULLBACK_BEFORE_ARM =
true;

export const DEFAULT_PULLBACK_BEFORE_ARM_PCT =
38.2;

export const MIN_PULLBACK_BEFORE_ARM_PCT =
1;

export const MAX_PULLBACK_BEFORE_ARM_PCT =
100;

const DEFAULT_TIMEOUT_BARS =
300;

/**
 * Log-price interpolate from→to by t in [0,1].
 * @param {number} from
 * @param {number} to
 * @param {number} t01
 * @returns {number|null}
 */
function interpolateLogPrice(
from,
to,
t01
){

const a =
Number(
from
);
const b =
Number(
to
);
const t =
Math.min(
1,
Math.max(
0,
Number(
t01
)
)
);

if(
!(
a >
0
) ||
!(
b >
0
) ||
!Number.isFinite(
t
)
){
return null;
}

if(
a ===
b
){
return a;
}

return Math.exp(
Math.log(
a
) *
(
1 -
t
) +
Math.log(
b
) *
t
);

}

/**
 * @param {unknown} raw
 * @param {number} [fallback]
 * @returns {number}
 */
export function clampPullbackBeforeArmPct(
raw,
fallback =
DEFAULT_PULLBACK_BEFORE_ARM_PCT
){

const n =
Number(
raw
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
MAX_PULLBACK_BEFORE_ARM_PCT,
Math.max(
MIN_PULLBACK_BEFORE_ARM_PCT,
Math.round(
n *
10
) /
10
)
);

}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function normalizePullbackBeforeArmEnabled(
raw
){

return raw ===
true ||
raw ===
1 ||
raw ===
"1" ||
raw ===
"true";

}

/**
 * Pullback arm level: N% of X from pt4 toward pt3 (log).
 * @param {number} pt3
 * @param {number} pt4
 * @param {number} pct 1…100
 * @returns {number|null}
 */
export function computePullbackArmLevel(
pt3,
pt4,
pct
){

return interpolateLogPrice(
pt4,
pt3,
clampPullbackBeforeArmPct(
pct
) /
100
);

}

/**
 * @param {"long"|"short"} side
 * @param {{ high?: number, low?: number }} candle
 * @param {number} level
 * @returns {boolean}
 */
export function candleTouchesPullbackLevel(
side,
candle,
level
){

if(
!(
Number.isFinite(
level
) &&
level >
0
)
){
return false;
}

if(
side ===
"short"
){
return Number.isFinite(
candle?.high
) &&
candle.high >=
level;
}

return Number.isFinite(
candle?.low
) &&
candle.low <=
level;

}

/**
 * Any touch of pt4 before pullback arm = invalid (first pierce already spent).
 * @param {"long"|"short"} side
 * @param {{ high?: number, low?: number }} candle
 * @param {number} pt4
 * @returns {boolean}
 */
export function candlePiercesPt4BeforeArm(
side,
candle,
pt4
){

if(
!(
Number.isFinite(
pt4
) &&
pt4 >
0
)
){
return false;
}

if(
side ===
"short"
){
return Number.isFinite(
candle?.low
) &&
candle.low <=
pt4;
}

return Number.isFinite(
candle?.high
) &&
candle.high >=
pt4;

}

/**
 * Live bot gate before placing trigger/alert.
 * @param {Array} candles
 * @param {{ side?: string, b4?: number, p3?: number, p4?: number }} setup
 * @param {{ pullbackBeforeArm?: unknown, pullbackBeforeArmPct?: unknown, timeoutBars?: unknown }} [opts]
 * @returns {"ready"|"wait"|"cancel"}
 */
export function evaluatePullbackArmGate(
candles,
setup,
opts =
{}
){

if(
!normalizePullbackBeforeArmEnabled(
opts.pullbackBeforeArm
)
){
return "ready";
}

const side =
setup?.side ===
"short"
? "short"
: "long";
const b4 =
Number(
setup?.b4
);
const p3 =
Number(
setup?.p3
);
const p4 =
Number(
setup?.p4
);
const level =
computePullbackArmLevel(
p3,
p4,
opts.pullbackBeforeArmPct
);

if(
!(
Number.isFinite(
b4
) &&
b4 >=
0
) ||
!Number.isFinite(
level
)
){
return "ready";
}

const timeoutRaw =
Math.round(
Number(
opts.timeoutBars
)
);
const timeoutBars =
Number.isFinite(
timeoutRaw
) &&
timeoutRaw >=
1
? Math.min(
10000,
timeoutRaw
)
: DEFAULT_TIMEOUT_BARS;
const last =
Array.isArray(
candles
)
? candles.length -
1
: -1;
const scanEnd =
Math.min(
last,
b4 +
timeoutBars
);

let armed =
false;

for(
let i =
b4 +
1;
i <=
scanEnd;
i++
){

const cur =
candles[
i
];

if(
!cur
){
continue;
}

if(
!armed &&
candleTouchesPullbackLevel(
side,
cur,
level
)
){
armed =
true;
}

if(
!armed &&
candlePiercesPt4BeforeArm(
side,
cur,
p4
)
){
return "cancel";
}

}

return armed
? "ready"
: "wait";

}

/**
 * @param {Array} candles
 * @param {object} setup
 * @param {object} [opts]
 * @returns {boolean}
 */
export function isPullbackReadyToArm(
candles,
setup,
opts
){

return evaluatePullbackArmGate(
candles,
setup,
opts
) ===
"ready";

}
