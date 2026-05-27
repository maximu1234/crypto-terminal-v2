/**
 * Ограничение частоты облачных pull/reconcile (Яндекс: ERR_INSUFFICIENT_RESOURCES).
 */

const IS_YANDEX =
typeof navigator !==
"undefined" &&
/YaBrowser|Yandex/i.test(
navigator.userAgent ||
""
);

export function isDrawingsUiPage(){

const path =
typeof location !==
"undefined"
? (
location.pathname ||
""
)
: "";

return (
/\/coins(\.html)?\/?$/i.test(
path
) ||
/\/terminal/i.test(
path
) ||
/\/index(\.html)?\/?$/i.test(
path
)
);

}

export function createPullCoalescer(
options = {}
){

const minIntervalMs =
options.minIntervalMs ??
(
IS_YANDEX
? 3500
: 1800
);
const errorBackoffMs =
options.errorBackoffMs ??
(
IS_YANDEX
? 12000
: 6000
);

let inflight =
null;
let lastRunMs =
0;
let backoffUntil =
0;

return async function runPull(
fn
){

const now =
Date.now();

if(
now <
backoffUntil
){
return 0;
}

if(
inflight
){
return inflight;
}

if(
now -
lastRunMs <
minIntervalMs
){
return 0;
}

inflight =
(
async()=>{

try{
const result =
await fn();
lastRunMs =
Date.now();
return result;
}catch(
err
){

const msg =
String(
err?.message ||
err ||
""
);

if(
/INSUFFICIENT_RESOURCES|Failed to fetch|NetworkError|Load failed/i.test(
msg
)
){
backoffUntil =
Date.now() +
errorBackoffMs;
}

throw err;
}finally{
inflight =
null;
}

}
)();

return inflight;

};

}

export function createNotifyDebouncer(
delayMs = 400
){

let timer =
null;
let pending =
false;

return function notifyDebounced(
fire
){

pending =
true;

if(
timer
){
return;
}

timer =
setTimeout(
()=>{

timer =
null;

if(
!pending
){
return;
}

pending =
false;

fire();

},
delayMs
);

};

}
