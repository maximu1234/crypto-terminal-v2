/**
 * Deep link multichart://open → смена тикера в уже открытом Терминале (без полной перезагрузки).
 */
import {
getActiveExchangeId,
setActiveExchangeId
} from "./market-api.js?v=5";

/**
 * @param {{
 *   loadSymbol: (symbol: string) => Promise<void>|void,
 *   setTimeframe?: (tf: string) => Promise<void>|void,
 *   getSymbol?: () => string,
 * }} deps
 * @returns {() => void}
 */
export function mountDesktopOpenChartHandler(
deps
){

const api =
window.cryptoTerminalDesktop;

if(
!api?.isDesktop ||
typeof api.onOpenChart !==
"function"
){
return ()=>{};
}

return api.onOpenChart(
async payload=>{

const symbol =
String(
payload?.symbol ||
""
).trim().toUpperCase().replace(
/\.P$/i,
""
);

if(
!symbol
){
return;
}

const tf =
String(
payload?.tf ||
""
).trim();
const exchange =
String(
payload?.exchange ||
""
).trim().toLowerCase();

try{

if(
(
exchange ===
"bybit" ||
exchange ===
"bingx"
) &&
exchange !==
getActiveExchangeId()
){
/*
 * Смена биржи перезагружает страницу — кладём deep link в URL,
 * чтобы после reload сработал readUrlParams.
 */
const params =
new URLSearchParams({
symbol,
tf:
tf ||
"60",
exchange
});
const next =
`/terminal.html?${params}`;

window.location.assign(
next
);
return;
}

if(
tf &&
typeof deps.setTimeframe ===
"function"
){
await deps.setTimeframe(
tf
);
}

await deps.loadSymbol(
symbol
);

try{
const params =
new URLSearchParams({
symbol,
tf:
tf ||
"60"
});

if(
exchange ===
"bybit" ||
exchange ===
"bingx"
){
params.set(
"exchange",
exchange
);
}

history.replaceState(
null,
"",
`/terminal.html?${params}`
);
}catch{
/* ignore */
}

}catch(
err
){
console.warn(
"[desktop] open-chart:",
err
);
}

}
);

}
