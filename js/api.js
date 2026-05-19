const TWELVE_KEY =
"d6b45dcb1abf4b3ebe020038e41864fb";

/* =========================================================
   BYBIT HISTORY
========================================================= */

export async function loadBybitHistory(symbol, tf, requests=6){

let all = [];

let end = Date.now();

for(let i=0;i<requests;i++){

const url =
`https://api.bybit.com/v5/market/kline?category=linear&symbol=${symbol}&interval=${tf}&limit=1000&end=${end}`;

const res =
await fetch(url);

const json =
await res.json();

if(
!json.result ||
!json.result.list
){
break;
}

const batch =
json.result.list;

if(!batch.length){
break;
}

all = [...all, ...batch];

end =
Number(batch[batch.length-1][0]) - 1;

}

const unique =
new Map();

all.forEach(k=>{

unique.set(k[0],{

time:Number(k[0])/1000,
open:Number(k[1]),
high:Number(k[2]),
low:Number(k[3]),
close:Number(k[4])

});

});

return Array
.from(unique.values())
.sort((a,b)=>a.time-b.time);

}

/* =========================================================
   BYBIT SYMBOLS
========================================================= */

export async function loadBybitSymbols(){

const res = await fetch(
"https://api.bybit.com/v5/market/instruments-info?category=linear&limit=1000"
);

const json = await res.json();

return json.result.list;

}

/* =========================================================
   TWELVEDATA
========================================================= */

export async function loadTwelveData(symbol, tf){

let interval = "1h";

if(tf === "1"){
interval = "1min";
}

if(tf === "5"){
interval = "5min";
}

if(tf === "15"){
interval = "15min";
}

if(tf === "60"){
interval = "1h";
}

if(tf === "240"){
interval = "4h";
}

if(tf === "D"){
interval = "1day";
}

const url =
`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=2500&apikey=${TWELVE_KEY}`;

const res = await fetch(url);

const json = await res.json();

if(!json.values){
return [];
}

return json.values.reverse().map(v=>({

time:
Math.floor(new Date(v.datetime).getTime()/1000),

open:Number(v.open),
high:Number(v.high),
low:Number(v.low),
close:Number(v.close)

}));

}
