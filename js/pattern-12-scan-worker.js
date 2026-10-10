/**
 * Счёт Pattern 1-2 вне главного потока, чтобы свечи не делили кадр со сканом.
 */
import {
findPattern12HitsInLookback
} from "./pattern-12-scanner.js?v=31";

import {
unpackCandles
} from "./candle-columns.js?v=2";

self.onmessage =
event=>{

const data =
event.data ||
{};
const candles =
data.packed
? unpackCandles(
data.packed,
data.rows
)
: data.candles;
const hits =
findPattern12HitsInLookback(
candles,
data.lookbackBars,
data.sideFilter,
data.patternSettings,
data.indicatorId
);

self.postMessage(
{
id: data.id,
hits
}
);

};
