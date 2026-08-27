/**
 * Renderer bridge → main algo bot (start/stop/status + config mirror).
 */
import {
loadBotStrategiesPrefs
} from "./bot-strategy-prefs.js?v=33";
import {
readAlgoPattern12Settings
} from "./pattern-12-settings.js?v=5";
import {
readAlgoPattern12EarlyT3Settings
} from "./pattern-12-early-t3-settings.js?v=1";
import {
loadEarlyT3BotPrefs
} from "./early-t3-bot-prefs.js?v=5";
import {
loadAlgoTickerFlags,
ALGO_TICKER_FLAGS_KEY
} from "./ticker-flags.js?v=10";
import {
acquireAlgoBotLock,
releaseAlgoBotLock,
clearAlgoBotLock,
fetchAlgoBotLock,
ensureAlgoBotLockHeld
} from "./bot-cloud-lock.js?v=11";
import {
freezeBotTickerBookSnapshot,
hydrateBotTickerBookFromMain,
loadBotTickerBook,
loadStagedBotTickerBook,
writePublishedBotTickerBook
} from "./bot-ticker-book.js?v=7";
import {
replaceRsiTouchFlipBook
} from "./rsi-touch-flip-book.js?v=4";
import {
saveRsiTouchFlipBalancePct,
loadRsiTouchFlipBalancePct
} from "./rsi-touch-flip-prefs.js?v=5";

import {
isAlgoBotWorking
} from "../desktop-feature-nav-shutdown.js?v=1";
import {
desktopAlgoApi,
fetchAlgoBotStatus,
maybeApplyTickerFlagsFromBotStatus
} from "./bot-status-flags.js?v=1";

export {
fetchAlgoBotStatus,
maybeApplyTickerFlagsFromBotStatus
};

export function isAlgoBotDesktop(){

return !!desktopAlgoApi()?.getBotStatus;

}

function pickAlertLeadPct(
primary,
secondary
){

const a =
Number(
primary
);
const b =
Number(
secondary
);
const aOk =
Number.isFinite(
a
) &&
a >=
0;
const bOk =
Number.isFinite(
b
) &&
b >=
0;

if(
aOk &&
a ===
5 &&
bOk &&
b !==
5
){
return Math.min(
25,
b
);
}

if(
aOk
){
return Math.min(
25,
a
);
}

if(
bOk
){
return Math.min(
25,
b
);
}

return 5;

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
"st1",
extra =
{}
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

const idNorm =
String(
strategyId ||
""
).trim().toLowerCase();

if(
idNorm ===
"rsi-touch-flip"
){
const book =
Array.isArray(
extra?.book
)
? extra.book
: [];
const result =
await api.startBot(
{
strategyId:
"rsi-touch-flip",
book:
book ||
[],
balancePct:
extra?.balancePct !=
null &&
extra.balancePct !==
""
? extra.balancePct
: loadRsiTouchFlipBalancePct()
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

if(
idNorm ===
"early-t3"
){
const earlyT3Prefs =
{
...loadEarlyT3BotPrefs()
};
const st1Lead =
loadBotStrategiesPrefs()?.st1?.alertLeadPct;
earlyT3Prefs.alertLeadPct =
pickAlertLeadPct(
earlyT3Prefs.alertLeadPct,
st1Lead
);
const result =
await api.startBot(
{
strategyId:
"early-t3",
earlyT3Prefs,
patternSettings:
readAlgoPattern12EarlyT3Settings()
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

const prefs =
loadBotStrategiesPrefs();
const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const strategyPrefs =
{
...prefs[
id
],
alertLeadPct:
pickAlertLeadPct(
prefs[
id
]?.alertLeadPct,
loadEarlyT3BotPrefs().alertLeadPct
)
};

let tickerBookSnapshot =
freezeBotTickerBookSnapshot(
id
) ||
loadStagedBotTickerBook(
id
);

if(
!(
tickerBookSnapshot?.tickers &&
typeof tickerBookSnapshot.tickers ===
"object" &&
Object.keys(
tickerBookSnapshot.tickers
).length
)
){
await hydrateBotTickerBookFromMain(
id
);
tickerBookSnapshot =
freezeBotTickerBookSnapshot(
id
) ||
loadStagedBotTickerBook(
id
) ||
loadBotTickerBook(
id
);
}

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
"Нет загруженной книги параметров. Сначала «Подобрать для всех» → «Применить к боту», затем «Отдать списки и книгу» или «Загрузить книгу параметров»."
};
}

const result =
await api.startBot(
{
strategyId,
strategyPrefs:
strategyPrefs,
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

export async function stopAlgoBotIfRunning(){

const status =
await fetchAlgoBotStatus();

if(
!isAlgoBotWorking(
status
)
){
return {
ok:
true,
stopped:
false
};
}

const result =
await stopAlgoBot(
status.strategyId ||
"st1"
);

return {
...result,
stopped:
result?.ok !==
false
};

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

export function maybeApplyTickerBookFromBotStatus(
status
){

if(
status?.applyTickerBook !==
true ||
!status.publishedTickerBook
){
return false;
}

const written =
writePublishedBotTickerBook(
status.publishedTickerBook
);

if(
written.ok
){
try{
window.dispatchEvent(
new CustomEvent(
"algo-bot-ticker-book-changed"
)
);
}catch{
/* ignore */
}
}

return written.ok;

}

export function maybeApplyRsiTouchFlipBookFromBotStatus(
status
){

if(
status?.applyRsiTouchFlipBook !==
true ||
!Array.isArray(
status.publishedRsiTouchFlipBook
)
){
return false;
}

replaceRsiTouchFlipBook(
status.publishedRsiTouchFlipBook
);

if(
status.publishedRsiTouchFlipBalancePct !=
null &&
status.publishedRsiTouchFlipBalancePct !==
""
){
saveRsiTouchFlipBalancePct(
status.publishedRsiTouchFlipBalancePct
);
}

return true;

}

export async function syncRsiTouchFlipBookToLive(
book
){

const api =
desktopAlgoApi();

if(
!api?.syncRsiTouchFlipBook
){
return {
ok:
true,
skipped:
true
};
}

return api.syncRsiTouchFlipBook(
{
book:
Array.isArray(
book
)
? book
: [],
balancePct:
loadRsiTouchFlipBalancePct()
}
);

}

export async function fetchRsiTouchFlipBookFromMain(){

const api =
desktopAlgoApi();

if(
!api?.getRsiTouchFlipBook
){
return {
ok:
false,
rows:
[]
};
}

return api.getRsiTouchFlipBook();

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
maybeApplyTickerBookFromBotStatus(
payload
);
maybeApplyRsiTouchFlipBookFromBotStatus(
payload
);

callback(
payload
);

}
);

}
