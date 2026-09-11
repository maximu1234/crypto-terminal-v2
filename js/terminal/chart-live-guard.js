/**
 * Live last-price ticks must only mutate candles that still belong
 * to the same chart symbol. During loadSymbol, currentSymbol flips
 * immediately while candles[] stay on the previous ticker — applying
 * the new last price there stretches the last bar across both ranges.
 */

export function canonicalChartSymbol(
symbol
){

return String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

}

export function shouldApplyLivePriceToChart(
{
sourceSymbol,
currentSymbol,
chartCandlesSymbol
}
){

const src =
canonicalChartSymbol(
sourceSymbol
);

if(
!src
){
return false;
}

return (
src ===
canonicalChartSymbol(
currentSymbol
) &&
src ===
canonicalChartSymbol(
chartCandlesSymbol
)
);

}
