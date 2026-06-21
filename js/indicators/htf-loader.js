/**
 * Кеш HTF-свечей для индикаторов с request.security-подобной логикой.
 */
const cache =
new Map();

export function clearAllHtfCache(){

cache.clear();

}

export function clearHtfCache(
symbol
){

const prefix =
`${String(
symbol ||
""
).trim().toUpperCase()}|`;

for(
const key of cache.keys()
){

if(
key.startsWith(
prefix
)
){
cache.delete(
key
);

}

}

}

export async function fetchHtfCandles(
symbol,
tf,
loadHistory
){

const sym =
String(
symbol ||
""
).trim().toUpperCase();
const timeframe =
String(
tf ||
""
).trim();

if(
!sym ||
!timeframe ||
typeof loadHistory !==
"function"
){
return [];
}

const key =
`${sym}|${timeframe}`;

const existing =
cache.get(
key
);

if(
existing?.candles
){
return existing.candles;
}

if(
existing?.promise
){
return existing.promise;
}

const entry =
{
candles:
null,
promise:
null
};

entry.promise =
loadHistory(
sym,
timeframe
).then(
candles=>{

entry.candles =
Array.isArray(
candles
)
? candles
: [];
return entry.candles;

}).catch(
()=>{

entry.candles =
[];
return entry.candles;

});

cache.set(
key,
entry
);

return entry.promise;

}
