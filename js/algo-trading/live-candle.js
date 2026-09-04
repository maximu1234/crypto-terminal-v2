/**
 * Live kline append for the Algo chart.
 * Split from js/algo-trading.js — поведение 1:1 plus late confirm of a
 * already-closed bar after wall-clock rollover.
 */
import {
applyLiveOhlcBar
} from "../chart/live-bar-roll.js?v=2";

export function mergeLiveCandle(
candles,
candle,
maxLen
){

return applyLiveOhlcBar(
candles,
candle,
maxLen
) !=
null;

}
