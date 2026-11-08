/**
 * Один setInterval(1s) на процесс страницы для OHLC rollover.
 * Виджеты/Zoom подписываются, вместо N независимых таймеров.
 */

const subscribers =
new Set();

let timerId =
null;

function flush(){

for(
const fn of
[
...subscribers
]
){

try{
fn();
}catch{
/* subscriber disposed mid-tick */
}

}

}

function ensureTimer(){

if(
timerId != null
){
return;
}

timerId =
setInterval(
flush,
1000
);

}

function stopTimerIfIdle(){

if(
subscribers.size >
0 ||
timerId == null
){
return;
}

clearInterval(
timerId
);
timerId =
null;

}

/**
 * @param {() => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribeOhlcSecondTick(
fn
){

if(
typeof fn !==
"function"
){
return ()=>{};
}

subscribers.add(
fn
);
ensureTimer();

return ()=>{

subscribers.delete(
fn
);
stopTimerIfIdle();

};

}

/** @returns {number} */
export function ohlcSecondTickSubscriberCount(){

return subscribers.size;

}

/** Test helper */
export function _resetOhlcSecondTickForTests(){

subscribers.clear();
stopTimerIfIdle();

}
