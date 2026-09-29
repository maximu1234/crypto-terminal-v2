/** Pure helpers: last chart symbol per exchange. */

export const DEFAULT_CHART_SYMBOL =
"BTCUSDT";

/**
 * @param {{ symbol?: string|null }} last
 * @param {string[]} symbols
 * @param {() => string|null|undefined} [getFallbackSymbol]
 */
export function pickSymbolFromLastView(
last,
symbols,
getFallbackSymbol
){

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
/* Список ещё не загружен — не мигаем BTC поверх последнего тикера. */
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
DEFAULT_CHART_SYMBOL
)
){
return DEFAULT_CHART_SYMBOL;
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
DEFAULT_CHART_SYMBOL
);

}
