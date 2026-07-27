/**
 * @module ticker-update-batch
 * Coalesce high-frequency ticker WS updates to one rAF flush per frame.
 */

/**
 * @param {() => void} onFlush Called once per animation frame when updates occurred.
 * @returns {() => void} Call after each ticker map update.
 */
export function createTickerUiBatcher(
onFlush
){

let rafId =
0;
let dirty =
false;

function flush(){

rafId =
0;

if(
!dirty
){
return;
}

dirty =
false;
onFlush();

}

return function scheduleTickerUiFlush(){

dirty =
true;

if(
!rafId
){
rafId =
requestAnimationFrame(
flush
);
}

};

}
