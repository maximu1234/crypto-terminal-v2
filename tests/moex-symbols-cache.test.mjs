import assert from "node:assert/strict";
import test from "node:test";

function memoryStorage(initial){

const store = new Map(initial || []);

return {
getItem(key){
return store.has(key)
? store.get(key)
: null;
},
setItem(key, value){
store.set(key, String(value));
},
removeItem(key){
store.delete(key);
}
};

}

function issPage(symbols){

return {
securities:{
columns:[
"SECID",
"SHORTNAME",
"STATUS",
"PREVPRICE"
],
data:symbols.map(symbol=>[
symbol,
symbol,
"A",
1
])
},
marketdata:{
columns:[
"SECID",
"LAST"
],
data:symbols.map(symbol=>[
symbol,
10
])
}
};

}

test("TQBR funds open on the ETF tab without another download", async ()=>{

const {
buildMoexMarketLists
} = await import(
"../js/exchanges/moex/listings.js"
);
const lists =
buildMoexMarketLists([
{
symbol:"SBER",
moexCategory:"shares",
instrId:"EQIN"
},
{
symbol:"TMOS",
moexCategory:"shares",
raw:{
securities:{
INSTRID:"IFTF"
}
}
},
{
symbol:"USD000UTSTOM",
moexCategory:"currency"
}
]);

assert.deepEqual(
lists.shares,
["SBER"]
);
assert.deepEqual(
lists.etf,
["TMOS"]
);
assert.deepEqual(
lists.currency,
["USD000UTSTOM"]
);

});

test("moex symbol list opens from cache without calling ISS", async ()=>{

global.localStorage = memoryStorage([
[
"moex_symbols_v2",
JSON.stringify({
savedAt:Date.now(),
instruments:[
{
symbol:"SBER",
engine:"stock",
market:"shares",
board:"TQBR",
last:300
}
]
})
]
]);

let calls = 0;
global.fetch = async ()=>{
calls += 1;
throw new Error("ISS should not be called");
};

const { loadMoexSymbols } = await import(
"../js/exchanges/moex/public.js"
);
const started = Date.now();
const list = await loadMoexSymbols();

assert.equal(list[0].symbol, "SBER");
assert.equal(calls, 0);
assert.ok(Date.now() - started < 200);

});

test("cold moex list requests boards in parallel", async ()=>{

global.localStorage = memoryStorage();

let active = 0;
let maxActive = 0;

global.fetch = async url=>{

active += 1;
maxActive = Math.max(maxActive, active);
await new Promise(resolve=>setTimeout(resolve, 15));
active -= 1;

const path = decodeURIComponent(
String(url).split("path=")[1] || ""
);
let symbols = [];

if(path.includes("/boards/TQBR/")){
const start = Number(
new URLSearchParams(path.split("?")[1] || "").get("start") || 0
);
symbols = start === 0
? Array.from({ length:100 }, (_, i)=>`T${String(i).padStart(3, "0")}`)
: [`T${start}`];
}else if(path.includes("/boards/SNDX/")){
symbols = ["IMOEX"];
}else if(path.includes("/boards/CETS/")){
symbols = ["USD000UTSTOM"];
}

const body = issPage(symbols);

return {
ok:true,
status:200,
json:async ()=>body,
text:async ()=>""
};

};

const { loadMoexSymbols } = await import(
"../js/exchanges/moex/public.js"
);
const list = await loadMoexSymbols({ forceNetwork:true });
const symbols = new Set(list.map(item=>item.symbol));

assert.ok(symbols.has("T000"));
assert.ok(symbols.has("IMOEX"));
assert.ok(symbols.has("USD000UTSTOM"));
assert.ok(
maxActive >= 3,
`expected parallel board requests, max in flight was ${maxActive}`
);

});
