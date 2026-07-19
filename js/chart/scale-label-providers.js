/**
 * Extra right-scale price plaques (trade levels, alerts, …).
 * Providers return { yIdeal, price, color }[]; no exchange logic here.
 */

/** @type {Set<() => { yIdeal: number, price: number, color: string }[]>} */
const providers =
new Set();

/**
 * @param {() => { yIdeal: number, price: number, color: string }[]} fn
 * @returns {() => void} unregister
 */
export function registerChartScaleLabelProvider(
fn
){

if(
typeof fn !==
"function"
){
return ()=>{};
}

providers.add(
fn
);

return ()=>{
providers.delete(
fn
);
};

}

export function collectChartScaleLabelEntries(){

const out =
[];

for(
const fn of
providers
){

try{
const chunk =
fn();

if(
!Array.isArray(
chunk
)
){
continue;
}

for(
const entry of
chunk
){
const yIdeal =
Number(
entry?.yIdeal
);
const price =
Number(
entry?.price
);

if(
!Number.isFinite(
yIdeal
) ||
!Number.isFinite(
price
)
){
continue;
}

out.push(
{
yIdeal,
price,
color:
entry.color ||
"rgba(30, 41, 59, 0.95)",
/* Stay on price line — collision layout was shifting plaques on zoom. */
pinToPrice:
true
}
);
}
}catch{
/* ignore provider errors */
}

}

return out;

}
