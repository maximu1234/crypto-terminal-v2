/**
 * Счёт Pattern 1-2 вне главного потока, чтобы свечи не делили кадр со сканом.
 */
import {
findPattern12HitsInLookback
} from "./pattern-12-scanner.js?v=27";

self.onmessage =
event=>{

const data =
event.data ||
{};
const hits =
findPattern12HitsInLookback(
data.candles,
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
