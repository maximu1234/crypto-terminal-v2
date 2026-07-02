/**
 * Нормализация символов между биржами (внутренний ключ — BTCUSDT).
 */

export function toCanonicalSymbol(
raw
){

const s =
String(
raw ||
""
).trim().toUpperCase();

if(
!s
){
return "";
}

return s.replace(
/-/g,
""
);

}

/** Внутренний ключ linear USDT (без USDC и прочих quote). */
export function isUsdtMarginedSymbol(
canonical
){

const sym =
toCanonicalSymbol(
canonical
);

return (
sym.length >
4 &&
sym.endsWith(
"USDT"
)
);

}

export function toBingxSymbol(
canonical
){

const s =
toCanonicalSymbol(
canonical
);

if(
!s
){
return "";
}

if(
s.endsWith(
"USDT"
) &&
s.length >
4
){
return `${s.slice(
0,
-4
)}-USDT`;
}

return s;

}

export function formatExchangeDisplayLabel(
exchangeId,
canonical
){

const sym =
toCanonicalSymbol(
canonical
);

if(
!sym
){
return "";
}

if(
exchangeId ===
"bybit"
){
return `${sym}.P`;
}

return sym;

}
