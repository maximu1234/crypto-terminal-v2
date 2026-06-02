import test from "node:test";
import assert from "node:assert/strict";

function withPath(
pathname,
fn
){

const prev =
globalThis.location;

globalThis.location =
{
pathname
};

try{
fn();
}finally{

if(
prev ===
undefined
){
delete globalThis.location;
}else{
globalThis.location =
prev;
}

}

}

test(
"page route detection",
async()=>{

const mod =
await import(
"../js/page-routes.js"
);

withPath(
"/alerts/",
()=>{
assert.equal(
mod.isAlertsPage(),
true
);
assert.equal(
mod.isCoinsPage(),
false
);
}
);

withPath(
"/coins.html",
()=>{
assert.equal(
mod.isCoinsPage(),
true
);
assert.equal(
mod.isDrawingsUiPage(),
true
);
}
);

withPath(
"/",
()=>{
assert.equal(
mod.isScreenerPage(),
true
);
}
);

withPath(
"/terminal.html",
()=>{
assert.equal(
mod.isTerminalDashboardPage(),
true
);
}
);

}
);
