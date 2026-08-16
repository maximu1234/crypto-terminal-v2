/**
 * Renderer bridge → main algo bot (start/stop/status + config mirror).
 */
import {
loadBotStrategiesPrefs
} from "./bot-strategy-prefs.js?v=28";
import {
readAlgoPattern12Settings
} from "./pattern-12-settings.js?v=3";
import {
loadAlgoTickerFlags,
ALGO_TICKER_FLAGS_KEY,
applyAlgoTickerFlagsRoot
} from "./ticker-flags.js?v=8";
import {
acquireAlgoBotLock,
releaseAlgoBotLock,
clearAlgoBotLock,
fetchAlgoBotLock,
ensureAlgoBotLockHeld
} from "./bot-cloud-lock.js?v=11";
import {
freezeBotTickerBookSnapshot
} from "./bot-ticker-book.js?v=4";

function desktopAlgoApi(){

return window.cryptoTerminalDesktop?.algoTrading ||
null;

}

export function isAlgoBotDesktop(){

return !!desktopAlgoApi()?.getBotStatus;

}

export async function syncBotStrategiesToMain(){

const api =
desktopAlgoApi();

if(
!api?.syncBotStrategies
){
return {
ok:
false,
message:
"desktop only"
};
}

const prefs =
loadBotStrategiesPrefs();

return api.syncBotStrategies(
{
...prefs,
pattern12Settings:
readAlgoPattern12Settings()
}
);

}

export async function syncTickerFlagsToMain(
exchangeId
){

const api =
desktopAlgoApi();

if(
!api?.syncTickerFlags
){
return {
ok:
false,
message:
"desktop only"
};
}

const id =
String(
exchangeId ||
"bybit"
).trim().toLowerCase() ||
"bybit";

return api.syncTickerFlags(
{
exchangeId:
id,
flags:
loadAlgoTickerFlags(
id
)
}
);

}

export async function syncAllTickerFlagsRootToMain(){

const api =
desktopAlgoApi();

if(
!api?.syncTickerFlags
){
return {
ok:
false,
message:
"desktop only"
};
}

try{
const raw =
localStorage.getItem(
ALGO_TICKER_FLAGS_KEY
);
const root =
raw
? JSON.parse(
raw
)
: {};

return api.syncTickerFlags(
{
root
}
);
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
String(
err
)
};
}

}

export async function startAlgoBot(
strategyId =
"st1"
){

const api =
desktopAlgoApi();

if(
!api?.startBot
){
return {
ok:
false,
message:
"desktop only"
};
}

const lock =
await acquireAlgoBotLock();

if(
!lock.ok
){
return {
ok:
false,
code:
lock.code,
message:
lock.message ||
"Бот уже работает в другом приложении",
cloudLock:
lock
};
}

await syncBotStrategiesToMain();
await syncAllTickerFlagsRootToMain();

const prefs =
loadBotStrategiesPrefs();
const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";

const tickerBookSnapshot =
freezeBotTickerBookSnapshot(
id
);
const bookTickers =
tickerBookSnapshot?.tickers &&
typeof tickerBookSnapshot.tickers ===
"object"
? Object.keys(
tickerBookSnapshot.tickers
)
: [];

if(
!bookTickers.length
){
await releaseAlgoBotLock();

return {
ok:
false,
message:
"Нет загруженной книги параметров. Сначала «Применить к боту», затем в настройках бота — «Загрузить книгу параметров»."
};
}

const result =
await api.startBot(
{
strategyId,
strategyPrefs:
prefs[
id
],
tickerBookSnapshot
}
);

if(
!(
result?.ok ||
result?.running ||
result?.alreadyRunning
)
){
await releaseAlgoBotLock();
}

return result;

}

export async function stopAlgoBot(
strategyId =
"st1"
){

const api =
desktopAlgoApi();

if(
!api?.stopBot
){
return {
ok:
false,
message:
"desktop only"
};
}

const result =
await api.stopBot(
{
strategyId
}
);

if(
result?.ok !==
false &&
!result?.running
){
await releaseAlgoBotLock();
}

return result;

}

export async function fetchAlgoBotCloudLock(){

return fetchAlgoBotLock();

}

export async function clearAlgoBotCloudLock(){

return clearAlgoBotLock();

}

export async function ensureAlgoBotCloudLock(){

return ensureAlgoBotLockHeld();

}

export async function fetchAlgoBotStatus(){

const api =
desktopAlgoApi();

if(
!api?.getBotStatus
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.getBotStatus();

}

export async function disarmAlgoArmedSetup(
payload
){

const api =
desktopAlgoApi();

if(
!api?.disarmArmedSetup
){
return {
ok:
false,
message:
"desktop only"
};
}

return api.disarmArmedSetup(
payload ||
{}
);

}

/**
 * Подтянуть флаги из main только после Phase D (или явного apply).
 * Обычный status poll НЕ должен затирать localStorage.
 */
export function maybeApplyTickerFlagsFromBotStatus(
status
){

if(
!status
){
return false;
}

const shouldApply =
status.applyTickerFlags ===
true ||
status.watchlistRefresh?.ok ===
true;

if(
!shouldApply ||
!status.tickerFlagsRoot
){
return false;
}

return applyAlgoTickerFlagsRoot(
status.tickerFlagsRoot
);

}

export function subscribeAlgoBotStatus(
callback
){

const api =
desktopAlgoApi();

if(
!api?.onBotStatus ||
typeof callback !==
"function"
){
return ()=>{};
}

return api.onBotStatus(
payload=>{

maybeApplyTickerFlagsFromBotStatus(
payload
);

callback(
payload
);

}
);

}
