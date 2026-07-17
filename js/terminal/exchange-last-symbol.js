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

if(
last?.symbol &&
symbols.length >
0 &&
symbols.includes(
last.symbol
)
){
return last.symbol;
}

if(
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
symbols[0] ||
DEFAULT_CHART_SYMBOL
);

}
