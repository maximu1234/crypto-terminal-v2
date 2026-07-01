/**
 * LW Charts: setData on any series can shift the visible logical range.
 * Capture before overlay updates, restore immediately after.
 */
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

const range =
chart.timeScale().getVisibleLogicalRange();

fn();

if(
!range
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

}
