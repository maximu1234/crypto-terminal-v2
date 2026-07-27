import {
getActiveExchangeId
} from "./context.js?v=1";

/** @typedef {{ id: string, label: string, realtime?: boolean }} ExchangeMarketType */

/** @typedef {{ id: string, name: string, sortOrder: number, markets: ExchangeMarketType[] }} ExchangeDefinition */

/** @type {Record<string, ExchangeDefinition>} */
export const EXCHANGE_DEFINITIONS =
Object.freeze({

bybit:{
id:
"bybit",
name:
"Bybit",
sortOrder:
0,
markets:[
{
id:
"all",
label:
"Все",
realtime:
true
},
{
id:
"crypto",
label:
"Крипто",
realtime:
true
},
{
id:
"new",
label:
"Новые",
realtime:
true
},
{
id:
"innovation",
label:
"Innovation",
realtime:
true
},
{
id:
"stocks",
label:
"Акции",
realtime:
true
},
{
id:
"commodities",
label:
"Сырьё",
realtime:
true
},
{
id:
"forex",
label:
"Forex",
realtime:
true
}
]
},

bingx:{
id:
"bingx",
name:
"BingX",
sortOrder:
1,
markets:[
{
id:
"all",
label:
"Все",
realtime:
true
},
{
id:
"crypto",
label:
"Крипто",
realtime:
true
},
{
id:
"new",
label:
"Новые",
realtime:
true
},
{
id:
"stocks",
label:
"Акции",
realtime:
true
},
{
id:
"indices",
label:
"Индексы",
realtime:
true
},
{
id:
"commodities",
label:
"Сырьё",
realtime:
true
},
{
id:
"forex",
label:
"Forex",
realtime:
true
}
]

}

});

export const EXCHANGE_IDS =
Object.freeze(
Object.keys(
EXCHANGE_DEFINITIONS
).sort(
(
a,
b
)=>
EXCHANGE_DEFINITIONS[
a
].sortOrder -
EXCHANGE_DEFINITIONS[
b
].sortOrder
)
);

export function getExchangeDefinition(
exchangeId
){

const id =
String(
exchangeId ||
""
).trim().toLowerCase();

return EXCHANGE_DEFINITIONS[
id
] ||
EXCHANGE_DEFINITIONS.bybit;

}

export function getActiveExchangeDefinition(){

return getExchangeDefinition(
getActiveExchangeId()
);

}

export function getExchangeMarketIds(
exchangeId
){

return getExchangeDefinition(
exchangeId
).markets.map(
m=>
m.id
);

}

export function getActiveCoinsMarkets(){

return getExchangeMarketIds(
getActiveExchangeId()
);

}

export function getAllCoinsMarketIds(){

const set =
new Set();

for(
const def of
Object.values(
EXCHANGE_DEFINITIONS
)
){
for(
const m of
def.markets
){
set.add(
m.id
);
}

}

return [
...set
];

}

export function isRealtimeMarketDataset(
exchangeId,
dataset
){

const def =
getExchangeDefinition(
exchangeId
);
const row =
def.markets.find(
m=>
m.id ===
dataset
);

if(
row
){
return row.realtime !==
false;
}

return true;

}
