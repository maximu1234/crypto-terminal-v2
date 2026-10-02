/** Pure helpers: last chart symbol per exchange. */

export const DEFAULT_CHART_SYMBOL =
"BTCUSDT";

export const DEFAULT_MOEX_SYMBOL =
"SBER";

/**
 * @param {string} [exchangeId]
 */
export function defaultChartSymbolForExchange(
exchangeId
){

return String(
exchangeId ||
""
).trim().toLowerCase() ===
"moex"
? DEFAULT_MOEX_SYMBOL
: DEFAULT_CHART_SYMBOL;

}

/**
 * @param {{ symbol?: string|null }} last
 * @param {string[]} symbols
 * @param {() => string|null|undefined} [getFallbackSymbol]
 * @param {string} [defaultSymbol]
 */
export function pickSymbolFromLastView(
last,
symbols,
getFallbackSymbol,
defaultSymbol =
DEFAULT_CHART_SYMBOL
){

const fallbackDefault =
String(
defaultSymbol ||
DEFAULT_CHART_SYMBOL
).trim().toUpperCase() ||
DEFAULT_CHART_SYMBOL;

const saved =
typeof last?.symbol ===
"string" &&
last.symbol.trim()
? last.symbol.trim().toUpperCase()
: null;

if(
saved
){

if(
!Array.isArray(
symbols
) ||
symbols.length ===
0
){
/*
  Список ещё не загружен.
  Для Мосбиржи не держим крипто-тикер (BTCUSDT) — иначе пустой график.
*/
if(
fallbackDefault ===
DEFAULT_MOEX_SYMBOL &&
/USDT$/i.test(
saved
)
){
return fallbackDefault;
}

return saved;
}

if(
symbols.includes(
saved
)
){
return saved;
}

}

if(
Array.isArray(
symbols
) &&
symbols.includes(
fallbackDefault
)
){
return fallbackDefault;
}

const fallback =
typeof getFallbackSymbol ===
"function"
? getFallbackSymbol()
: null;

return (
fallback ||
(
Array.isArray(
symbols
) &&
symbols[0]
) ||
fallbackDefault
);

}
