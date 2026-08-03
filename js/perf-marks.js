/**
 * Optional Performance marks for cold-start / page boot diagnostics.
 */

function enabled(){

try{
return (
typeof performance !==
"undefined" &&
typeof performance.mark ===
"function" &&
(
localStorage.getItem(
"mc_perf_marks"
) ===
"1" ||
/\bmcperf=1\b/i.test(
location.search ||
""
)
)
);
}catch{
return false;
}

}

/**
 * @param {string} name
 */
export function perfMark(
name
){

if(
!enabled()
){
return;
}

try{
performance.mark(
`mc:${name}`
);
}catch{
/* ignore */
}

}

/**
 * @param {string} name
 * @param {string} startMark
 * @param {string} [endMark]
 */
export function perfMeasure(
name,
startMark,
endMark
){

if(
!enabled()
){
return;
}

try{
performance.measure(
`mc:${name}`,
`mc:${startMark}`,
endMark
? `mc:${endMark}`
: undefined
);
}catch{
/* ignore */
}

}
