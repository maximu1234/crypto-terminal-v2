/**
 * Algo trading runtime (main process) — background lifecycle.
 * Isolated from Terminal trading-stream / trading-router.
 * Order execution will plug in later; this owns start/stop + status.
 */
const fs =
require(
"fs"
);
const path =
require(
"path"
);
const {
app
} =
require(
"electron"
);
const log =
require(
"electron-log"
);
const {
normalizeExchangeId,
getAlgoCredentials,
getAlgoCredentialsStatus
} =
require(
"./algo-exchange-credentials.cjs"
);
const {
isAlgoLiveTradingEnabled,
getAlgoDesktopEdition
} =
require(
"./algo-trading-edition.cjs"
);

const PREFS_FILE =
"algo-trading-runtime-prefs.json";

const DEFAULTS =
{
enabled:
false,
exchangeId:
"bybit",
tradingMode:
isAlgoLiveTradingEnabled()
? "live"
: "manual"
};

/** @type {"stopped"|"starting"|"running"|"error"} */
let runtimeState =
"stopped";
let runtimeMessage =
"";
let startedAt =
0;

function prefsPath(){

return path.join(
app.getPath(
"userData"
),
PREFS_FILE
);

}

/**
 * @param {unknown} raw
 * @returns {"live"|"manual"}
 */
function normalizeTradingMode(
raw
){

if(
!isAlgoLiveTradingEnabled()
){
return "manual";
}

/*
  Temporary: remote Algo Bot — live only. Manual trading UI is inactive;
  ignore stored/requested "manual" until we re-enable it.
*/
void raw;

return "live";

}

function readPrefs(){

try{
const raw =
fs.readFileSync(
prefsPath(),
"utf8"
);
const parsed =
JSON.parse(
raw
);

return {
enabled:
!!parsed?.enabled,
exchangeId:
normalizeExchangeId(
parsed?.exchangeId
),
tradingMode:
normalizeTradingMode(
parsed?.tradingMode
)
};
}catch{
return {
...DEFAULTS
};
}

}

function writePrefs(
next
){

const cur =
readPrefs();
const merged =
{
enabled:
next?.enabled !=
null
? !!next.enabled
: cur.enabled,
exchangeId:
normalizeExchangeId(
next?.exchangeId ??
cur.exchangeId
),
tradingMode:
normalizeTradingMode(
next?.tradingMode ??
cur.tradingMode
)
};

try{
fs.mkdirSync(
path.dirname(
prefsPath()
),
{
recursive:
true
}
);
fs.writeFileSync(
prefsPath(),
`${JSON.stringify(
merged,
null,
2
)}\n`,
{
mode:
0o600
}
);
}catch(
err
){
log.warn(
"algo-runtime prefs write:",
err?.message ||
err
);
}

return merged;

}

function getAlgoTradingMode(){

return readPrefs().tradingMode;

}

function setAlgoTradingMode(
mode
){

if(
mode ===
"live" &&
!isAlgoLiveTradingEnabled()
){
const prefs =
writePrefs(
{
...readPrefs(),
tradingMode:
"manual"
}
);

return {
ok:
false,
...prefs,
message:
"Сборка m: только ручная торговля"
};
}

const prefs =
writePrefs(
{
...readPrefs(),
tradingMode:
normalizeTradingMode(
mode
)
}
);

return {
ok:
true,
...prefs
};

}

function getAlgoRuntimeStatus(){

const prefs =
readPrefs();
const creds =
getAlgoCredentialsStatus(
prefs.exchangeId
);

return {
ok:
true,
enabled:
prefs.enabled,
exchangeId:
prefs.exchangeId,
tradingMode:
prefs.tradingMode,
edition:
getAlgoDesktopEdition(),
liveTradingEnabled:
isAlgoLiveTradingEnabled(),
state:
runtimeState,
message:
runtimeMessage ||
"",
startedAt:
startedAt ||
null,
configured:
!!creds?.configured,
testnet:
!!creds?.testnet,
apiKeyHint:
creds?.apiKeyHint ||
"",
profile:
"algo"
};

}

function stopAlgoTradingRuntime(
reason =
""
){

runtimeState =
"stopped";
runtimeMessage =
reason
? String(
reason
)
: "";
startedAt =
0;

log.info(
"algo-runtime stopped",
runtimeMessage ||
""
);

return getAlgoRuntimeStatus();

}

function startAlgoTradingRuntime(
options =
{}
){

const prefs =
writePrefs(
{
enabled:
true,
exchangeId:
options.exchangeId ||
readPrefs().exchangeId,
tradingMode:
options.tradingMode ||
readPrefs().tradingMode
}
);

runtimeState =
"starting";
runtimeMessage =
"";

const creds =
getAlgoCredentials(
prefs.exchangeId
);

if(
prefs.tradingMode ===
"live" &&
!creds
){
runtimeState =
"error";
runtimeMessage =
"Нет API-ключей алго-профиля";
log.warn(
"algo-runtime:",
runtimeMessage
);
return getAlgoRuntimeStatus();
}

/*
 * Placeholder: private WS / order loop will attach here later.
 * Keeping process "running" so background flag is real and UI can rely on it.
 * Manual mode: no exchange keys — bot uses public klines + price alerts.
 */
runtimeState =
"running";
startedAt =
Date.now();
runtimeMessage =
prefs.tradingMode ===
"manual"
? "Ручной режим (алерты), ключи не нужны"
: "Фон активен (исполнение стратегий — следующий этап)";

log.info(
"algo-runtime running",
prefs.exchangeId,
prefs.tradingMode
);

return getAlgoRuntimeStatus();

}

function setAlgoTradingRuntimeEnabled(
enabled,
options =
{}
){

if(
!enabled
){
writePrefs(
{
enabled:
false,
exchangeId:
options.exchangeId ||
readPrefs().exchangeId
}
);
return stopAlgoTradingRuntime(
"выключено"
);
}

return startAlgoTradingRuntime(
options
);

}

function bootAlgoTradingRuntimeIfEnabled(){

const prefs =
readPrefs();

if(
!prefs.enabled
){
runtimeState =
"stopped";
return getAlgoRuntimeStatus();
}

return startAlgoTradingRuntime(
{
exchangeId:
prefs.exchangeId,
tradingMode:
prefs.tradingMode
}
);

}

module.exports =
{
readPrefs,
writePrefs,
normalizeTradingMode,
getAlgoTradingMode,
setAlgoTradingMode,
getAlgoRuntimeStatus,
startAlgoTradingRuntime,
stopAlgoTradingRuntime,
setAlgoTradingRuntimeEnabled,
bootAlgoTradingRuntimeIfEnabled
};
