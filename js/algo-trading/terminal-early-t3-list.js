/**
 * Терминал: список «1-2 Early T3» (флаги бота), без стратегии в terminal.js.
 * Подключается только если в шестерёнке включён пункт АлгоТрейдинг.
 */
import {
coinsState
} from "../terminal/terminal-state.js?v=12";
import {
setExtraCoinMarkets,
setCoinsTableHooks,
generateMarketData,
primeTickerSnapshots,
renderList,
highlightActiveSymbol
} from "../terminal/terminal-table.js?v=36";
import {
ALGO_FLAG_EARLY_T3,
ALGO_MARKET_EARLY_T3,
getAlgoTickerFlagList
} from "./ticker-flags.js?v=10";
import {
fetchAlgoBotStatus,
maybeApplyTickerFlagsFromBotStatus,
subscribeAlgoBotStatusFlags
} from "./bot-status-flags.js?v=1";

const FLAGS_CHANGED_EVENT =
"algo-bot-ticker-flags-changed";

let mounted =
false;
/** @type {(() => void)|null} */
let unsubBotStatus =
null;

function refreshEarlyT3ListIfActive(){

if(
coinsState().currentDataset !==
ALGO_MARKET_EARLY_T3
){
return;
}

generateMarketData();
void primeTickerSnapshots().then(
()=>{
renderList();
highlightActiveSymbol();
}
);

}

function onTickerFlagsChanged(){

refreshEarlyT3ListIfActive();

}

function onBotStatus(){

refreshEarlyT3ListIfActive();

}

export function mountTerminalAlgoEarlyT3List(){

if(
mounted
){
return;
}

mounted =
true;

setExtraCoinMarkets(
[
{
id:
ALGO_MARKET_EARLY_T3,
label:
"1-2 Early T3"
}
]
);

setCoinsTableHooks(
{
getCurrentSymbols(
dataset
){

if(
dataset !==
ALGO_MARKET_EARLY_T3
){
return null;
}

return getAlgoTickerFlagList(
ALGO_FLAG_EARLY_T3
);

}
}
);

window.addEventListener(
FLAGS_CHANGED_EVENT,
onTickerFlagsChanged
);

unsubBotStatus =
subscribeAlgoBotStatusFlags(
onBotStatus
);

void fetchAlgoBotStatus().then(
status=>{
maybeApplyTickerFlagsFromBotStatus(
status
);
refreshEarlyT3ListIfActive();
}
).catch(
()=>{}
);

}

export function unmountTerminalAlgoEarlyT3List(){

if(
!mounted
){
return;
}

mounted =
false;

if(
typeof unsubBotStatus ===
"function"
){
unsubBotStatus();
}

unsubBotStatus =
null;

window.removeEventListener(
FLAGS_CHANGED_EVENT,
onTickerFlagsChanged
);

setExtraCoinMarkets(
[]
);

setCoinsTableHooks(
{
getCurrentSymbols:
undefined
}
);

}
