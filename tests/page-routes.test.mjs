import test from "node:test";
import assert from "node:assert/strict";

function withPath(
pathname,
fn,
{
desktop = false
} = {}
){

const prevPath =
globalThis.location;
const prevDesktop =
globalThis.window?.cryptoTerminalDesktop;

globalThis.location =
{
pathname
};

if(
desktop
){
globalThis.window =
globalThis.window ||
{};
globalThis.window.cryptoTerminalDesktop =
{
isDesktop:
true
};
}else if(
globalThis.window
){
delete globalThis.window.cryptoTerminalDesktop;
}

try{
fn();
}finally{

if(
prevPath ===
undefined
){
delete globalThis.location;
}else{
globalThis.location =
prevPath;
}

if(
prevDesktop ===
undefined
){
if(
globalThis.window
){
delete globalThis.window.cryptoTerminalDesktop;
}
}else{
globalThis.window.cryptoTerminalDesktop =
prevDesktop;
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
mod.isTerminalPage(),
false
);
assert.equal(
mod.isTradePage(),
false
);
}
);

withPath(
"/terminal.html",
()=>{
assert.equal(
mod.isTerminalPageOnly(),
true
);
assert.equal(
mod.isTerminalPage(),
true
);
assert.equal(
mod.isTradePage(),
false
);
assert.equal(
mod.isDrawingsUiPage(),
true
);
}
);

withPath(
"/coins.html",
()=>{
assert.equal(
mod.isTerminalPageOnly(),
true
);
assert.equal(
mod.isTerminalPage(),
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
assert.equal(
mod.isTradePage(),
false
);
}
);

withPath(
"/screener.html",
()=>{
assert.equal(
mod.isScreenerPage(),
true
);
}
);

withPath(
"/watchlist.html",
()=>{
assert.equal(
mod.isWatchlistPage(),
true
);
assert.equal(
mod.isTradePage(),
false
);
}
);

}
);

test(
"isTradePage: desktop /terminal only",
async()=>{

const mod =
await import(
"../js/page-routes.js"
);

withPath(
"/terminal.html",
()=>{
assert.equal(
mod.isTradePage(),
false
);
},
{
desktop:
false
}
);

withPath(
"/terminal.html",
()=>{
assert.equal(
mod.isTradePage(),
true
);
assert.equal(
mod.isTerminalPage(),
true
);
},
{
desktop:
true
}
);

withPath(
"/trade.html",
()=>{
assert.equal(
mod.isTradePage(),
true
);
},
{
desktop:
false
}
);

withPath(
"/screener.html",
()=>{
assert.equal(
mod.isTradePage(),
false
);
},
{
desktop:
true
}
);

}
);
