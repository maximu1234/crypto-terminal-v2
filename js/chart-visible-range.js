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

let preserveDepth =
0;

export function invalidatePreservedVisibleLogicalRange(){

restoreGeneration +=
1;

}

/** True while setData is restoring the previous logical range. */
export function isPreservingVisibleLogicalRange(){

return preserveDepth >
0;

}

/** True while indicator settings modal is open (body class). */
export function isIndicatorSettingsModalOpen(){

try{
return document.body.classList.contains(
"chart-indicator-modal-open"
);
}catch{
return false;
}

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

preserveDepth +=
1;

try{

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

fn();

}finally{

if(
range
){
restoreVisibleLogicalRange(
chart,
range
);
}else{
preserveDepth =
Math.max(
0,
preserveDepth -
1
);
}

}

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

preserveDepth +=
1;

try{

try{
range =
chart.timeScale().getVisibleLogicalRange();
}catch{
range =
null;
}

await fn();

}finally{

if(
range
){
restoreVisibleLogicalRange(
chart,
range
);
}else{
preserveDepth =
Math.max(
0,
preserveDepth -
1
);
}

}

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

const release =
()=>{

preserveDepth =
Math.max(
0,
preserveDepth -
1
);

};

const apply =
()=>{

if(
gen !==
restoreGeneration
){
return false;
}

try{
chart.timeScale().setVisibleLogicalRange(
range
);
}catch{
/* ignore */
}

return true;

};

apply();
requestAnimationFrame(
()=>{

if(
!apply()
){
release();
return;
}

requestAnimationFrame(
()=>{
apply();
release();
}
);

}
);

}
