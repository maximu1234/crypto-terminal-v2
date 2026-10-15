import {
loadBybitHistory,
loadBybitSymbols,
loadBybitOrderbook
} from "../../api.js?v=071ede04";

import {
fetchBybitBulk
} from "../../bybit-fetch.js?v=e4bd7f1f";

import {
buildCoinsMarketLists
} from "../../bybit-listings.js?v=e4b02e33";

import {
pingBybitPublicFromAdapter
} from "./ping.js?v=d0c65280";

function isBybitRateLimit(
json
){

const code =
Number(
json?.retCode
);
const msg =
String(
json?.retMsg ||
""
).toLowerCase();

return (
code ===
10006 ||
msg.includes(
"too many"
) ||
msg.includes(
"too frequent"
) ||
msg.includes(
"access too frequent"
)
);

}

async function fetchBybitDailyCandles(
symbol,
limit = 375
){

const path =
`/v5/market/kline?category=linear&symbol=${encodeURIComponent(symbol)}&interval=D&limit=${limit}`;

for(
let attempt =
0;
attempt <
3;
attempt++
){

try{

const { json } =
await fetchBybitBulk(
path,
{
timeoutMs:12000
}
);

if(
isBybitRateLimit(
json
)
){
await new Promise(
resolve=>
setTimeout(
resolve,
1500 *
(
attempt +
1
)
)
);
continue;
}

if(
json.retCode !==
0 ||
!json.result?.list?.length
){
return null;
}

return json.result.list
.map(
k=>({
time:Number(
k[0]
) /
1000,
open:Number(
k[1]
),
close:Number(
k[4]
)
})
)
.sort(
(
a,
b
)=>
a.time -
b.time
);

}catch{
/* retry */
}

}

return null;

}

export const bybitPublicAdapter =
{

id:
"bybit",

async loadHistory(
symbol,
tf,
requests,
options
){

return loadBybitHistory(
symbol,
tf,
requests,
options
);

},

async loadSymbols(
options
){

return loadBybitSymbols(
options
);

},

buildMarketLists(
instruments
){

return buildCoinsMarketLists(
instruments
);

},

async loadOrderbook(
symbol,
depth
){

return loadBybitOrderbook(
symbol,
depth
);

},

async pingPublic(){

return pingBybitPublicFromAdapter();

},

async fetchDailyCandles(
symbol,
limit
){

return fetchBybitDailyCandles(
symbol,
limit
);

}

};
