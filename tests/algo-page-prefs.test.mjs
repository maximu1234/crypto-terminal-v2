import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/stub-browser.mjs";

const store =
new Map();

globalThis.localStorage =
{
getItem(
key
){
return store.has(
key
)
? store.get(
key
)
: null;
},
setItem(
key,
value
){
store.set(
key,
String(
value
)
);
},
removeItem(
key
){
store.delete(
key
);
}
};

import {
DEFAULT_SYMBOL,
DEFAULT_TF,
normalizeSymbol,
displaySymbol,
chartStrategyIdFromPositions,
clampScanMinWinRate,
normalizeAlgoScanTfPref,
readPrefs,
writePrefs
} from "../js/algo-trading/page-prefs.js";

test("normalizeSymbol strips .P and uppercases", ()=>{

assert.equal(
normalizeSymbol(
"btcusdt.p"
),
"BTCUSDT"
);
assert.equal(
normalizeSymbol(
""
),
DEFAULT_SYMBOL
);

});

test("displaySymbol adds .P", ()=>{

assert.equal(
displaySymbol(
"ethusdt"
),
"ETHUSDT.P"
);

});

test("chartStrategyIdFromPositions maps overlay ids", ()=>{

assert.equal(
chartStrategyIdFromPositions(
"fixed-tp"
),
"st1"
);
assert.equal(
chartStrategyIdFromPositions(
"partial-tp"
),
"st2"
);
assert.equal(
chartStrategyIdFromPositions(
"partial-tp-y"
),
"st3"
);

});

test("clampScanMinWinRate stays in 10..100", ()=>{

assert.equal(
clampScanMinWinRate(
undefined
),
50
);
assert.equal(
clampScanMinWinRate(
null
),
10
);
assert.equal(
clampScanMinWinRate(
5
),
10
);
assert.equal(
clampScanMinWinRate(
140
),
100
);

});

test("normalizeAlgoScanTfPref falls back to 1", ()=>{

assert.equal(
normalizeAlgoScanTfPref(
"60"
),
"60"
);
assert.equal(
normalizeAlgoScanTfPref(
"7"
),
"1"
);

});

test("readPrefs/writePrefs round-trip symbol and tf", ()=>{

store.clear();
const empty =
readPrefs();
assert.equal(
empty.symbol,
DEFAULT_SYMBOL
);
assert.equal(
empty.tf,
DEFAULT_TF
);

writePrefs(
{
...empty,
symbol:
"ETHUSDT",
tf:
"15"
}
);
const next =
readPrefs();
assert.equal(
next.symbol,
"ETHUSDT"
);
assert.equal(
next.tf,
"15"
);

});
