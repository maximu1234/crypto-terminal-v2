import test from "node:test";
import assert from "node:assert/strict";

import {
ALGO_TRADING_NAV_ENABLED_KEY,
SCRIPT_NAV_ENABLED_KEY,
isAlgoTradingNavEnabled,
isScriptNavEnabled,
setAlgoTradingNavEnabled,
setScriptNavEnabled,
shouldRunAlgoBackgroundJobs,
shouldRunScriptBackgroundJobs
} from "../js/desktop-feature-nav-prefs.js";

const store =
new Map();

function installDesktopShell(){

globalThis.window =
globalThis.window ||
{};
globalThis.window.cryptoTerminalDesktop =
{
isDesktop:
true
};
globalThis.window.dispatchEvent =
globalThis.window.dispatchEvent ||
(()=>{});
globalThis.window.CustomEvent =
globalThis.window.CustomEvent ||
class CustomEvent{
constructor(
type,
init
){
this.type =
type;
this.detail =
init?.detail;
}
};
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
}
};

}

function resetFlags(){

store.clear();

}

test("script and algo background jobs stay off until System toggles are on", ()=>{

installDesktopShell();
resetFlags();

assert.equal(
isScriptNavEnabled(),
false
);
assert.equal(
isAlgoTradingNavEnabled(),
false
);
assert.equal(
shouldRunScriptBackgroundJobs(),
false
);
assert.equal(
shouldRunAlgoBackgroundJobs(),
false
);

setScriptNavEnabled(
true
);
setAlgoTradingNavEnabled(
true
);

assert.equal(
store.get(
SCRIPT_NAV_ENABLED_KEY
),
"1"
);
assert.equal(
store.get(
ALGO_TRADING_NAV_ENABLED_KEY
),
"1"
);
assert.equal(
shouldRunScriptBackgroundJobs(),
true
);
assert.equal(
shouldRunAlgoBackgroundJobs(),
true
);

setScriptNavEnabled(
false
);
setAlgoTradingNavEnabled(
false
);

assert.equal(
shouldRunScriptBackgroundJobs(),
false
);
assert.equal(
shouldRunAlgoBackgroundJobs(),
false
);

});

test("web (no desktop shell) never runs script/algo background jobs", ()=>{

installDesktopShell();
resetFlags();
delete globalThis.window.cryptoTerminalDesktop;
store.set(
SCRIPT_NAV_ENABLED_KEY,
"1"
);
store.set(
ALGO_TRADING_NAV_ENABLED_KEY,
"1"
);

assert.equal(
shouldRunScriptBackgroundJobs(),
false
);
assert.equal(
shouldRunAlgoBackgroundJobs(),
false
);

});
