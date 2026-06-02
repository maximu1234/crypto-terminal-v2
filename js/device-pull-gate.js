/**
 * @module device-pull-gate
 * Один debounced pull device state на login / cloud sync change.
 */

import {
createPullCoalescer
} from "./cloud-sync-throttle.js?v=3";

/** @type {ReturnType<createPullCoalescer> | null} */
let coalescer =
null;

/**
 * @param {() => Promise<unknown>} fn
 */
export function scheduleDevicePull(
fn
){

if(
!coalescer
){
coalescer =
createPullCoalescer({
minIntervalMs: 2200,
errorBackoffMs: 9000
});
}

void coalescer(
fn
);

}
