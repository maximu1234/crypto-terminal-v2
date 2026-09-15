import test from "node:test";
import assert from "node:assert/strict";

import "./helpers/stub-browser.mjs";

const memory =
new Map();

globalThis.localStorage = {
getItem(
key
){

return memory.has(
key
)
? memory.get(
key
)
: null;

},
setItem(
key,
value
){

memory.set(
key,
String(
value
)
);

},
removeItem(
key
){

memory.delete(
key
);

}
};

if(
typeof globalThis.CustomEvent !==
"function"
){
globalThis.CustomEvent =
class CustomEvent{

constructor(
type,
init =
{}
){

this.type =
type;
this.detail =
init.detail;

}

};
}

if(
typeof globalThis.window.dispatchEvent !==
"function"
){
globalThis.window.dispatchEvent =
()=>true;
}

const {
SUPABASE_USAGE_PREFS_KEY,
setSupabaseUsagePref,
isFavoritesCloudDisabled,
isFavoritesAutoCloudDisabled,
isSupabaseRealtimeDisabled,
isAlertsCloudDisabled
} =
await import(
"../js/supabase-usage-prefs.js"
);

test("Terminal flag event-sync follows the cloud-flags toggle, not the realtime cut", ()=>{

memory.delete(
SUPABASE_USAGE_PREFS_KEY
);

assert.equal(
isFavoritesCloudDisabled(),
false
);
assert.equal(
isFavoritesAutoCloudDisabled(),
false
);
assert.equal(
isSupabaseRealtimeDisabled(),
true
);

setSupabaseUsagePref(
"disableFavoritesCloud",
true
);

assert.equal(
isFavoritesCloudDisabled(),
true
);
assert.equal(
isFavoritesAutoCloudDisabled(),
true
);

setSupabaseUsagePref(
"disableFavoritesCloud",
false
);

assert.equal(
isFavoritesAutoCloudDisabled(),
false
);
assert.equal(
isAlertsCloudDisabled(),
false
);

});
