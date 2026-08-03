/**
 * Extra right-scale price plaques (trade levels, alerts, …).
 * Providers are scoped to a chart instance so multi-widget pages
 * (Watchlist) do not paint every chart's levels on every scale.
 * Providers return { yIdeal, price, color }[]; no exchange logic here.
 */

/** @type {WeakMap<object, Set<() => { yIdeal: number, price: number, color: string }[]>>} */
const providersByScope =
new WeakMap();

/** @type {Set<() => { yIdeal: number, price: number, color: string }[]>} */
const globalProviders =
new Set();

/**
 * @param {object|null|undefined} scope
 * @returns {Set<() => { yIdeal: number, price: number, color: string }[]>}
 */
function bucketFor(
scope
){

if(
scope ==
null
){
return globalProviders;
}

let set =
providersByScope.get(
scope
);

if(
!set
){
set =
new Set();
providersByScope.set(
scope,
set
);
}

return set;

}

/**
 * @param {() => { yIdeal: number, price: number, color: string }[]} fn
 * @param {object|null|undefined} [scope] chart (or other host key); omit only for tests
 * @returns {() => void} unregister
 */
export function registerChartScaleLabelProvider(
fn,
scope
){

if(
typeof fn !==
"function"
){
return ()=>{};
}

const bucket =
bucketFor(
scope
);

bucket.add(
fn
);

return ()=>{
bucket.delete(
fn
);
};

}

/**
 * @param {object|null|undefined} [scope] same key used at register
 * @returns {{ yIdeal: number, price: number, color: string, pinToPrice: true }[]}
 */
export function collectChartScaleLabelEntries(
scope
){

const bucket =
scope ==
null
? globalProviders
: providersByScope.get(
scope
);

const out =
[];

if(
!bucket ||
!bucket.size
){
return out;
}

for(
const fn of
bucket
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
