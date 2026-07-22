/**
 * LW Charts: setData on any series can shift the visible logical range.
 * Capture before overlay updates, restore after.
 *
 * Delayed restores use a generation token so a later intentional zoom
 * (fit / applyDefaultZoom / settle) cancels stale rAF restores — otherwise
 * coin switches reopen mid-history.
 */
let restoreGeneration =
0;

export function invalidatePreservedVisibleLogicalRange(){

restoreGeneration +=
1;

}

export function runWithPreservedVisibleLogicalRange(
chart,
fn
){

if(
!chart ||
typeof fn !==
"function"
){
fn?.();
return;
}

let range =
null;

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

fn();

restoreVisibleLogicalRange(
chart,
range
);

}

export async function runWithPreservedVisibleLogicalRangeAsync(
chart,
fn
){

if(
!chart ||
typeof fn !==
"function"
){
await fn?.();
return;
}

let range =
null;

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

await fn();

restoreVisibleLogicalRange(
chart,
range
);

}

function restoreVisibleLogicalRange(
chart,
range
){

if(
!chart ||
!range
){
return;
}

const gen =
++restoreGeneration;

const apply =
()=>{

if(
gen !==
restoreGeneration
){
return;
}

try{
chart.timeScale().setVisibleLogicalRange(
range
);
}catch{
/* ignore */
}

};

apply();
requestAnimationFrame(
()=>{

if(
gen !==
restoreGeneration
){
return;
}

apply();
requestAnimationFrame(
apply
);

}
);

}
