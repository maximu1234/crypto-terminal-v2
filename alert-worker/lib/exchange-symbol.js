/** Canonical + wire symbols per exchange (worker). */

export function normalizeExchangeId(
exchangeId
){

const id =
String(
exchangeId ||
"bybit"
).trim().toLowerCase();

return id ===
"bingx"
? "bingx"
: "bybit";

}

export function normalizeAlertSymbol(
symbol,
exchangeId
){

return String(
symbol ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
).replace(
/-/g,
""
);

}

export function toBingxWireSymbol(
symbol
){

const raw =
normalizeAlertSymbol(
symbol,
"bingx"
);

if(
!raw
){
return "";
}

if(
raw.includes(
"-"
)
){
return raw;
}

if(
raw.endsWith(
"USDT"
)
){
return `${raw.slice(
0,
-4
)}-USDT`;
}

return raw;

}

export function symbolsMatch(
alertSymbol,
marketSymbol,
exchangeId
){

const ex =
normalizeExchangeId(
exchangeId
);
const a =
normalizeAlertSymbol(
alertSymbol,
ex
);
const m =
normalizeAlertSymbol(
marketSymbol,
ex
);

return !!(
a &&
m &&
a ===
m
);

}
