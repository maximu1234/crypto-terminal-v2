/**
 * Loads TradingView Lightweight Charts (global LightweightCharts).
 * Local copy first — works when CDN (jsdelivr) is blocked.
 */
const CHART_LIB_SOURCES = [
"/vendor/lightweight-charts.standalone.production.js",
"https://cdn.jsdelivr.net/npm/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"
];

function loadScript(src){

return new Promise((resolve, reject)=>{

if(
typeof LightweightCharts !==
"undefined"
){
resolve();
return;
}

const existing =
document.querySelector(
`script[data-lwc-src="${src}"]`
);

if(existing){

existing.addEventListener("load", ()=>resolve(), { once: true });
existing.addEventListener("error", ()=>reject(new Error(src)), { once: true });
return;

}

const el =
document.createElement("script");

el.src = src;
el.dataset.lwcSrc = src;
el.async = false;

el.onload = ()=>resolve();
el.onerror = ()=>reject(new Error(`Failed to load ${src}`));

document.head.appendChild(el);

});

}

export async function loadLightweightCharts(){

if(
typeof LightweightCharts !==
"undefined"
){
return;
}

let lastErr = null;

for(const src of CHART_LIB_SOURCES){

try{

await loadScript(src);

if(
typeof LightweightCharts !==
"undefined"
){
return;
}

}catch(err){

lastErr = err;

}

}

throw new Error(
lastErr?.message ||
"LightweightCharts is not defined"
);

}
