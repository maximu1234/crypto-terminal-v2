/**
 * Точки входа / отмены паттерна 1-2 (АлгоТрейдинг).
 * Long: pt4 активен → вход = первое пересечение pt4 снизу вверх;
 * отмена = ниже pt3 до входа, либо окно > 300 баров.
 * Short — зеркально.
 *
 * TEMP: optional pullback-before-arm gate — see temp-pullback-before-arm.js
 */
import {
computePattern12Scene,
defaultPattern12Settings
} from "./pattern-12-math.js?v=6";
import {
TEMP_PULLBACK_BEFORE_ARM,
clampPullbackBeforeArmPct,
computePullbackArmLevel,
candleTouchesPullbackLevel,
candlePiercesPt4BeforeArm,
normalizePullbackBeforeArmEnabled
} from "./temp-pullback-before-arm.js?v=3";

export {
evaluatePullbackArmGate,
isPullbackReadyToArm,
clampPullbackBeforeArmPct,
normalizePullbackBeforeArmEnabled,
DEFAULT_PULLBACK_BEFORE_ARM_PCT
} from "./temp-pullback-before-arm.js?v=3";

export const ENTRY_TIMEOUT_BARS =
300;

/** Макс. расстояние pt1→pt4 (баров); null/пусто в prefs = без ограничения. */
export const ENTRY_MAX_PT1_PT4_BARS =
null;

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function clampEntryTimeoutBars(
raw
){

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
) ||
n <
1
){
return ENTRY_TIMEOUT_BARS;
}

return Math.min(
10000,
n
);

}

/**
 * @param {unknown} raw
 * @returns {number|null} лимит баров, или null = без ограничения
 */
export function clampMaxPt1Pt4Bars(
raw
){

if(
raw ==
null
){
return null;
}

if(
typeof raw ===
"string" &&
!String(
raw
).trim()
){
return null;
}

const n =
Math.round(
Number(
raw
)
);

if(
!Number.isFinite(
n
) ||
n <
1
){
return null;
}

return Math.min(
10000,
n
);

}

/**
 * Prefs: отсутствующий ключ → default; явный null/пусто → без лимита.
 * @param {object} raw
 * @param {string} key
 * @param {number} whenMissing
 * @returns {number|null}
 */
export function resolveMaxPt1Pt4BarsFromPrefs(
raw,
key =
"maxPt1Pt4Bars",
whenMissing =
ENTRY_MAX_PT1_PT4_BARS
){

if(
!raw ||
typeof raw !==
"object" ||
!Object.prototype.hasOwnProperty.call(
raw,
key
)
){
return whenMissing;
}

return clampMaxPt1Pt4Bars(
raw[key]
);

}

/**
 * @typedef {"long"|"short"} PatternSide
 * @typedef {"entry"|"cancel"} EntryEventType
 * @typedef {"below_pt3"|"above_pt3"|"timeout"|"pt4_before_pullback"} CancelReason
 *
 * @typedef {{
 *   type: EntryEventType,
 *   side: PatternSide,
 *   bar: number,
 *   price: number,
 *   reason?: CancelReason,
 *   setupBar: number,
 *   pt3: number,
 *   pt4: number
 * }} PatternEntryEvent
 */

/**
 * @param {Array} candles
 * @param {object} [settings]
 * @returns {PatternEntryEvent[]}
 */
export function detectPatternEntryEvents(
candles,
settings =
defaultPattern12Settings(),
opts =
{}
){

if(
!Array.isArray(
candles
) ||
candles.length <
3
){
return [];
}

const scene =
computePattern12Scene(
candles,
settings
);

return detectPatternEntryEventsFromSetups(
candles,
scene?.setups,
opts
);

}

/**
 * @param {Array} candles
 * @param {Array|null|undefined} setups
 * @returns {PatternEntryEvent[]}
 */
export function detectPatternEntryEventsFromSetups(
candles,
setups,
opts =
{}
){

const list =
Array.isArray(
setups
)
? setups
: [];
const events =
[];

for(
const setup of list
){

const event =
resolvePatternSetupEvent(
candles,
setup,
opts
);

if(
event
){
events.push(
event
);
}

}

return events;

}

/**
 * @param {Array} candles
 * @param {{
 *   side: PatternSide,
 *   b1?: number,
 *   b3?: number,
 *   p3: number,
 *   b4: number,
 *   p4: number
 * }} setup
 * @param {{ timeoutBars?: unknown, maxPt1Pt4Bars?: unknown, pullbackBeforeArm?: unknown, pullbackBeforeArmPct?: unknown }} [opts]
 * @returns {PatternEntryEvent|null}
 */
export function resolvePatternSetupEvent(
candles,
setup,
opts =
{}
){

const side =
setup?.side ===
"short"
? "short"
: "long";
const b1 =
Number(
setup.b1
);
const b4 =
Number(
setup.b4
);
const p4 =
Number(
setup.p4
);
const p3 =
Number(
setup.p3
);

if(
!Number.isFinite(
b4
) ||
!Number.isFinite(
p4
) ||
!Number.isFinite(
p3
) ||
b4 <
0 ||
b4 >=
candles.length -
1
){
return null;
}

const maxPt1Pt4Bars =
clampMaxPt1Pt4Bars(
opts.maxPt1Pt4Bars
);

if(
maxPt1Pt4Bars !=
null &&
Number.isFinite(
b1
) &&
b4 -
b1 >
maxPt1Pt4Bars
){
/* Сетап слишком растянут — cancel, не null (null → bot tryArm ложно «пропущен вход»). */
return makeEvent(
"cancel",
side,
b4,
p4,
"max_pt1_pt4",
setup
);
}

const last =
candles.length -
1;
const timeoutBars =
clampEntryTimeoutBars(
opts.timeoutBars ??
ENTRY_TIMEOUT_BARS
);
const deadline =
b4 +
timeoutBars;
const scanEnd =
Math.min(
last,
deadline
);

/* TEMP_PULLBACK_BEFORE_ARM — remove with temp-pullback-before-arm.js */
const pullbackBeforeArm =
TEMP_PULLBACK_BEFORE_ARM &&
normalizePullbackBeforeArmEnabled(
opts.pullbackBeforeArm
);
const pullbackLevel =
pullbackBeforeArm
? computePullbackArmLevel(
p3,
p4,
clampPullbackBeforeArmPct(
opts.pullbackBeforeArmPct
)
)
: null;
let armed =
!pullbackBeforeArm ||
!Number.isFinite(
pullbackLevel
);

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
const prev =
candles[
i -
1
];

if(
!cur ||
!prev
){
continue;
}

if(
side ===
"long" &&
Number.isFinite(
cur.low
) &&
cur.low <
p3
){
return makeEvent(
"cancel",
side,
i,
p3,
"below_pt3",
setup
);
}

if(
side ===
"short" &&
Number.isFinite(
cur.high
) &&
cur.high >
p3
){
return makeEvent(
"cancel",
side,
i,
p3,
"above_pt3",
setup
);
}

if(
!armed
){
if(
candleTouchesPullbackLevel(
side,
cur,
pullbackLevel
)
){
armed =
true;
}
}

/* TEMP: pierce of pt4 before pullback spends the first cross — cancel. */
if(
!armed &&
candlePiercesPt4BeforeArm(
side,
cur,
p4
)
){
return makeEvent(
"cancel",
side,
i,
p4,
"pt4_before_pullback",
setup
);
}

if(
armed &&
isEntryCross(
side,
prev,
cur,
p4
)
){
return makeEvent(
"entry",
side,
i,
p4,
null,
setup
);
}

}

if(
last <
deadline
){
return null;
}

return makeEvent(
"cancel",
side,
deadline,
p4,
"timeout",
setup
);

}

function isEntryCross(
side,
prev,
cur,
level
){

if(
side ===
"long"
){
return (
Number.isFinite(
prev.close
) &&
Number.isFinite(
cur.high
) &&
prev.close <
level &&
cur.high >=
level
);
}

return (
Number.isFinite(
prev.close
) &&
Number.isFinite(
cur.low
) &&
prev.close >
level &&
cur.low <=
level
);

}

function makeEvent(
type,
side,
bar,
price,
reason,
setup
){

return {
type,
side,
bar,
price,
reason:
reason ||
undefined,
setupBar:
Number(
setup.b4
),
pt1:
Number(
setup.p1
),
pt2:
Number(
setup.p2
),
pt3:
Number(
setup.p3
),
pt4:
Number(
setup.p4
)
};

}
