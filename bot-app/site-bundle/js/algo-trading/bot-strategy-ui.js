/**
 * Topbar: Боты / Запустить; настройки стратегий — в модалке бота.
 */
import {
loadBotStrategiesPrefs,
saveBotStrategiesPrefs,
normalizeBotSides,
primaryBotSide,
normalizeBotTf,
normalizeBotRefreshStatsMode,
normalizeManualRefreshStrategies,
normalizeLaunchStrategyId,
botStrategyListLabel,
botSidesDirectionLabel,
formatBotStrategySettingsRows
} from "./bot-strategy-prefs.js?v=28";
import {
ALGO_ANALYSIS_BOT_PATTERN_12,
getActiveAnalysisBotId,
setActiveAnalysisBotId
} from "./active-analysis-bot.js?v=1";
import {
clampMaxPt1Pt4Bars
} from "./pattern-entry-logic.js?v=13";
import {
syncBotStrategiesToMain,
syncAllTickerFlagsRootToMain,
startAlgoBot,
stopAlgoBot,
fetchAlgoBotStatus,
disarmAlgoArmedSetup,
subscribeAlgoBotStatus,
maybeApplyTickerFlagsFromBotStatus,
isAlgoBotDesktop,
fetchAlgoBotCloudLock,
clearAlgoBotCloudLock,
ensureAlgoBotCloudLock
} from "./bot-bridge.js?v=16";
import {
stageBotTickerBookFromPublished,
loadStagedBotTickerBook,
loadBotTickerBook,
persistBotTickerBookToMain
} from "./bot-ticker-book.js?v=4";
import {
isMultichartRemoteControlHost
} from "./bot-remote-client.js?v=10";
import {
mountRemoteSessionLogsEntry,
mountRemoteWatchlistsPushEntry,
mountLocalSessionLogsEntry
} from "./bot-session-logs-viewer.js?v=26";
import {
rebalanceTpShares
} from "./pattern-trade-stats-partial.js?v=21";

const STATUS_POLL_MS =
2500;


let activeBotStrategyUiDestroy =
null;

/**
 * 20000000 → "20.000.000"
 * @param {unknown} value
 * @returns {string}
 */
function formatDotThousands(
value
){

const n =
Math.round(
Number(
value
)
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return "0";
}

return String(
n
).replace(
/\B(?=(\d{3})+(?!\d))/g,
"."
);

}

/**
 * "20.000.000" / "20 000 000" / "20000000" → number
 * @param {unknown} raw
 * @param {number} [fallback]
 * @returns {number}
 */
function parseDotThousands(
raw,
fallback =
20_000_000
){

const digits =
String(
raw ??
""
).replace(
/[^\d]/g,
""
);

if(
!digits
){
return fallback;
}

const n =
Number(
digits
);

return Number.isFinite(
n
)
? n
: fallback;

}

/**
 * @returns {{ destroy: () => void }}
 */
export function mountAlgoBotStrategyUi(){

if(
typeof activeBotStrategyUiDestroy ===
"function"
){
try{
activeBotStrategyUiDestroy();
}catch{
/* ignore stale destroy */
}
activeBotStrategyUiDestroy =
null;
}

const prefs =
loadBotStrategiesPrefs();
/* running приходит из статуса бота; сохранённый флаг может залипнуть после краша. */
let st1 =
{
...prefs.st1,
running:
false
};
let st2 =
{
...prefs.st2,
running:
false
};
let st3 =
{
...prefs.st3,
running:
false
};

/** @type {"live"|"manual"} */
let tradingMode =
"live";

const strategiesWrap =
document.getElementById(
"algo-bot-strategies"
);
const botsBtn =
document.getElementById(
"algo-bots-btn"
);
const botsDrop =
document.getElementById(
"algo-bots-dropdown"
);
const botsItemPattern12 =
document.getElementById(
"algo-bots-item-pattern12"
);
const botSettingsModal =
document.getElementById(
"algo-bot-settings-modal"
);
const dropdown =
document.getElementById(
"algo-bot-st1-dropdown"
);
const runBtn =
document.getElementById(
"algo-bot-run"
);
const st1Enabled =
document.getElementById(
"algo-bot-st1-enabled"
);
const st2Enabled =
document.getElementById(
"algo-bot-st2-enabled"
);
const st3Enabled =
document.getElementById(
"algo-bot-st3-enabled"
);
let launchStrategyId =
normalizeLaunchStrategyId(
prefs.launchStrategyId
);
const timeoutInput =
document.getElementById(
"algo-bot-st1-timeout"
);
const maxPt1Pt4BarsInput =
document.getElementById(
"algo-bot-st1-max-pt1-pt4-bars"
);
/* TEMP_PULLBACK_BEFORE_ARM */
const pullbackInput =
document.getElementById(
"algo-bot-st1-pullback"
);
const pullbackPctInput =
document.getElementById(
"algo-bot-st1-pullback-pct"
);
const slPctInput =
document.getElementById(
"algo-bot-st1-sl-pct"
);
const slUsdInput =
document.getElementById(
"algo-bot-st1-sl-usd"
);
const tpRrInput =
document.getElementById(
"algo-bot-st1-tp-rr"
);
const minTurnoverInput =
document.getElementById(
"algo-bot-st1-min-turnover"
);
const alertLeadInput =
document.getElementById(
"algo-bot-st1-alert-lead"
);
const sideLong =
document.getElementById(
"algo-bot-st1-side-long"
);
const sideShort =
document.getElementById(
"algo-bot-st1-side-short"
);
const sideBoth =
document.getElementById(
"algo-bot-st1-side-both"
);
const sideHint =
document.getElementById(
"algo-bot-st1-side-hint"
);
const useFavoritesCheck =
document.getElementById(
"algo-bot-st1-use-favorites"
);
const refreshH =
document.getElementById(
"algo-bot-st1-refresh-h"
);
const refreshM =
document.getElementById(
"algo-bot-st1-refresh-m"
);
const winrateInput =
document.getElementById(
"algo-bot-st1-winrate"
);
const refreshRealCheck =
document.getElementById(
"algo-bot-st1-refresh-real"
);
const tfBar =
document.getElementById(
"algo-bot-st1-tf"
);
const tfBtns =
[
...(
tfBar?.querySelectorAll(
"[data-bot-tf]"
) ||
[]
)
];

const st2Drop =
document.getElementById(
"algo-bot-st2-dropdown"
);
const st3Drop =
document.getElementById(
"algo-bot-st3-dropdown"
);

const statusToggle =
document.getElementById(
"algo-bot-status-toggle"
);
const statusDrop =
document.getElementById(
"algo-bot-status-dropdown"
);
const statusWatchlist =
document.getElementById(
"algo-bot-status-watchlist"
);
const statusDirection =
document.getElementById(
"algo-bot-status-direction"
);
const statusSettings =
document.getElementById(
"algo-bot-status-settings"
);
const statusSettingsList =
document.getElementById(
"algo-bot-status-settings-list"
);
const statusOpen =
document.getElementById(
"algo-bot-status-open"
);
const statusArmed =
document.getElementById(
"algo-bot-status-armed"
);
const statusArmedList =
document.getElementById(
"algo-bot-status-armed-list"
);
const statusWouldEnter =
document.getElementById(
"algo-bot-status-would-enter"
);
const statusLastSignal =
document.getElementById(
"algo-bot-status-last-signal"
);
const statusSignalList =
document.getElementById(
"algo-bot-status-signal-list"
);
const statusMessage =
document.getElementById(
"algo-bot-status-message"
);
const statusLockValue =
document.getElementById(
"algo-bot-status-lock"
);
const statusLockClearBtn =
document.getElementById(
"algo-bot-lock-clear"
);
/** @type {HTMLElement[]} */
const allDrops =
[
botsDrop,
statusDrop
].filter(
Boolean
);

/** @type {HTMLElement[]} */
const lockWhenRunning =
[
st1Enabled,
st2Enabled,
st3Enabled,
timeoutInput,
pullbackInput,
pullbackPctInput,
slPctInput,
slUsdInput,
tpRrInput,
minTurnoverInput,
alertLeadInput,
sideLong,
sideShort,
sideBoth,
useFavoritesCheck,
refreshH,
refreshM,
winrateInput,
refreshRealCheck,
...tfBtns
].filter(
Boolean
);

let statusPollTimer =
null;
let runInflight =
false;
let lastArmedFingerprint =
"";
let armedListWasOpen =
false;
let lastSignalFingerprint =
"";
let signalListWasOpen =
false;

function escapeHtml(
value
){

return String(
value ??
""
).replace(
/&/g,
"&amp;"
).replace(
/</g,
"&lt;"
).replace(
/>/g,
"&gt;"
).replace(
/"/g,
"&quot;"
);

}

function formatSignalTime(
ts
){

const ms =
Number(
ts
);

if(
!Number.isFinite(
ms
) ||
ms <=
0
){
return "";
}

try{
return new Date(
ms
).toLocaleTimeString(
"ru-RU",
{
hour:
"2-digit",
minute:
"2-digit",
second:
"2-digit"
}
);
}catch{
return "";
}

}

function closeSettingsList(){

if(
statusSettingsList
){
statusSettingsList.classList.add(
"hidden"
);
statusSettingsList.classList.remove(
"is-flip-right"
);
}

statusSettings?.setAttribute(
"aria-expanded",
"false"
);

}

function closeArmedList(){

if(
statusArmedList
){
statusArmedList.classList.add(
"hidden"
);
statusArmedList.classList.remove(
"is-flip-right"
);
}

statusArmed?.setAttribute(
"aria-expanded",
"false"
);

}

function closeSignalList(){

if(
statusSignalList
){
statusSignalList.classList.add(
"hidden"
);
statusSignalList.classList.remove(
"is-flip-right"
);
}

statusLastSignal?.setAttribute(
"aria-expanded",
"false"
);

}

function closeAllDrops(
except =
null
){

for(
const el of allDrops
){

if(
el ===
except
){
continue;
}

el.classList.add(
"hidden"
);

}

if(
except !==
statusDrop
){
closeSettingsList();
closeArmedList();
closeSignalList();
}

botsBtn?.setAttribute(
"aria-expanded",
botsDrop &&
!botsDrop.classList.contains(
"hidden"
)
? "true"
: "false"
);
statusToggle?.setAttribute(
"aria-expanded",
statusDrop &&
!statusDrop.classList.contains(
"hidden"
)
? "true"
: "false"
);

}

function setDropOpen(
drop,
btn,
open
){

if(
!drop ||
!btn
){
return;
}

if(
open
){
closeAllDrops(
drop
);
drop.classList.remove(
"hidden"
);
}else{
drop.classList.add(
"hidden"
);

if(
drop ===
statusDrop
){
closeSettingsList();
closeArmedList();
closeSignalList();
}
}

btn.setAttribute(
"aria-expanded",
open
? "true"
: "false"
);

}

function syncConfigToMain(){

if(
!isAlgoBotDesktop()
){
return;
}

void syncBotStrategiesToMain();
void syncAllTickerFlagsRootToMain();

}

function persistSt1(
patch =
{}
){

st1 =
{
...st1,
...patch
};
saveBotStrategiesPrefs(
{
st1
}
);
syncConfigToMain();

}

function applyLaunchEnabledUi(){

const id =
normalizeLaunchStrategyId(
launchStrategyId
);

if(
st1Enabled
){
st1Enabled.checked =
id ===
"st1";
}

if(
st2Enabled
){
st2Enabled.checked =
id ===
"st2";
}

if(
st3Enabled
){
st3Enabled.checked =
id ===
"st3";
}

}

function setLaunchStrategyId(
nextId
){

launchStrategyId =
normalizeLaunchStrategyId(
nextId
);
applyLaunchEnabledUi();
saveBotStrategiesPrefs(
{
launchStrategyId
}
);

}

function applyRunBtn(){

if(
!runBtn
){
return;
}

const runningId =
runningStrategyId();
const running =
!!runningId;

runBtn.dataset.running =
running
? "1"
: "0";
runBtn.setAttribute(
"aria-pressed",
running
? "true"
: "false"
);
runBtn.textContent =
runInflight && !running
? "Запуск…"
: running
? "Остановить"
: "Запустить";
runBtn.title =
running
? "Остановить бота"
: "Запустить бота с отмеченной стратегией";
runBtn.classList.toggle(
"is-running",
running
);
runBtn.disabled =
runInflight;

if(
strategiesWrap
){
strategiesWrap.classList.toggle(
"is-bot-running",
running
);
}

}

function applyActiveAnalysisBotMenuUi(){

const activeId =
getActiveAnalysisBotId();

botsItemPattern12?.classList.toggle(
"is-active-analysis-bot",
activeId ===
ALGO_ANALYSIS_BOT_PATTERN_12
);
botsItemPattern12?.setAttribute(
"aria-current",
activeId ===
ALGO_ANALYSIS_BOT_PATTERN_12
? "true"
: "false"
);

}

function openBotSettingsModal(){

if(
!botSettingsModal
){
return;
}

closeAllDrops();
botSettingsModal.hidden =
false;
botSettingsModal.classList.remove(
"hidden"
);

}

function closeBotSettingsModal(){

if(
!botSettingsModal
){
return;
}

botSettingsModal.classList.add(
"hidden"
);
botSettingsModal.hidden =
true;

}

function persistPartial(
strategyId,
patch =
{}
){

if(
strategyId ===
"st2"
){
st2 =
{
...st2,
...patch
};
saveBotStrategiesPrefs(
{
st2
}
);
}else{
st3 =
{
...st3,
...patch
};
saveBotStrategiesPrefs(
{
st3
}
);
}
syncConfigToMain();

}

function initPartialStrategy(
strategyId
){

const isSt2 =
strategyId ===
"st2";
const getPrefs =
()=> isSt2
? st2
: st3;
const drop =
document.getElementById(
`algo-bot-${strategyId}-dropdown`
);
const el =
name=>document.getElementById(
`algo-bot-${strategyId}-${name}`
);
const inputs =
{
timeoutBars:
el(
"timeout"
),
maxPt1Pt4Bars:
el(
"max-pt1-pt4-bars"
),
pullbackBeforeArmPct:
el(
"pullback-pct"
),
slPct:
el(
"sl-pct"
),
riskUsd:
el(
"sl-usd"
),
minTurnover24hUsdt:
el(
"min-turnover"
),
tp1:
el(
"tp1"
),
tp2:
el(
"tp2"
),
tp3:
el(
"tp3"
),
trailSlX1:
el(
"trail-x1"
),
trailSlX2:
el(
"trail-x2"
),
share1:
el(
"share1"
),
share2:
el(
"share2"
),
share3:
el(
"share3"
),
refreshHours:
el(
"refresh-h"
),
refreshMinutes:
el(
"refresh-m"
),
minWinRate:
el(
"winrate"
)
};
const trail =
el(
"trail"
);
/* TEMP_PULLBACK_BEFORE_ARM */
const pullback =
el(
"pullback"
);
const favorites =
el(
"use-favorites"
);
const real =
el(
"refresh-real"
);
const sideHint =
el(
"side-hint"
);
const sideButtons =
[
"long",
"short",
"both"
].map(
side=>[
side,
el(
`side-${side}`
)
]
);
const tfButtons =
[
...(
el(
"tf"
)?.querySelectorAll(
"[data-bot-tf]"
) ||
[]
)
];

function apply(){

const p =
getPrefs();

for(
const [
key,
input
] of Object.entries(
inputs
)
){
if(
input &&
!isFieldBeingEdited(
input
)
){
input.value =
key ===
"minTurnover24hUsdt"
? formatDotThousands(
p[
key
]
)
: key ===
"maxPt1Pt4Bars"
? (
p.maxPt1Pt4Bars ==
null
? ""
: String(
p.maxPt1Pt4Bars
)
)
: String(
p[
key
]
);
}
}

if(
trail
){
trail.checked =
!!p.trailSl;
}
/* TEMP_PULLBACK_BEFORE_ARM */
if(
pullback
){
pullback.checked =
!!p.pullbackBeforeArm;
}
if(
favorites
){
favorites.checked =
!!p.useFavorites;
}
if(
real
){
real.checked =
p.refreshStatsMode ===
"real";
}
if(
sideHint
){
sideHint.textContent =
botStrategyListLabel(
strategyId,
!!p.useFavorites
);
}

for(
const [
side,
input
] of sideButtons
){
if(
input
){
input.checked =
!!(
p.sides ||
{}
)[
side
];
}
}

for(
const btn of tfButtons
){
btn.classList.toggle(
"active",
btn.dataset.botTf ===
p.tf
);
}

}

for(
const btn of tfButtons
){
btn.addEventListener(
"click",
()=>{
if(
runningStrategyId()
){
return;
}
persistPartial(
strategyId,
{
tf:
normalizeBotTf(
btn.dataset.botTf
)
}
);
apply();
}
);
}

for(
const [
side,
input
] of sideButtons
){
input?.addEventListener(
"change",
()=>{
if(
getPrefs().running
){
apply();
return;
}

const cur =
normalizeBotSides(
getPrefs().sides,
getPrefs().side
);
const next =
{
...cur,
[
side
]:
!!input.checked
};

if(
!next.long &&
!next.short &&
!next.both
){
next[
side
] =
true;
input.checked =
true;
}

persistPartial(
strategyId,
{
sides:
next,
side:
primaryBotSide(
next
)
}
);
apply();
}
);
}

for(
const [
key,
input
] of Object.entries(
inputs
)
){
input?.addEventListener(
"change",
()=>{
if(
getPrefs().running &&
key !==
"minTurnover24hUsdt"
){
return;
}

if(
key ===
"maxPt1Pt4Bars"
){
const next =
clampMaxPt1Pt4Bars(
input.value
);
input.value =
next ==
null
? ""
: String(
next
);
persistPartial(
strategyId,
{
maxPt1Pt4Bars:
next
}
);
apply();
return;
}

if(
key ===
"minTurnover24hUsdt"
){
const next =
parseDotThousands(
input.value,
20_000_000
);
input.value =
formatDotThousands(
next
);
persistPartial(
strategyId,
{
minTurnover24hUsdt:
next
}
);
apply();
return;
}

const shareIndex =
[
"share1",
"share2",
"share3"
].indexOf(
key
);

if(
shareIndex >=
0
){
const p =
getPrefs();
const next =
rebalanceTpShares(
shareIndex ===
0
? input.value
: p.share1,
shareIndex ===
1
? input.value
: p.share2,
shareIndex ===
2
? input.value
: p.share3,
shareIndex
);

persistPartial(
strategyId,
{
share1:
next[
0
],
share2:
next[
1
],
share3:
next[
2
]
}
);
apply();
return;
}

const n =
Number(
input.value
);
if(
!Number.isFinite(
n
)
){
apply();
return;
}
persistPartial(
strategyId,
{
[
key
]:
key ===
"timeoutBars" ||
key ===
"refreshHours" ||
key ===
"refreshMinutes" ||
key ===
"minWinRate"
? Math.round(
n
)
: key ===
"pullbackBeforeArmPct"
? Math.min(
100,
Math.max(
1,
Math.round(
n *
10
) /
10
)
)
: n
}
);
apply();
}
);

if(
key ===
"maxPt1Pt4Bars"
){
input?.addEventListener(
"blur",
()=>{
if(
getPrefs().running
){
return;
}

const next =
clampMaxPt1Pt4Bars(
input.value
);
input.value =
next ==
null
? ""
: String(
next
);
persistPartial(
strategyId,
{
maxPt1Pt4Bars:
next
}
);
apply();
}
);
}
}

trail?.addEventListener(
"change",
()=>persistPartial(
strategyId,
{
trailSl:
!!trail.checked
}
)
);
/* TEMP_PULLBACK_BEFORE_ARM */
pullback?.addEventListener(
"change",
()=>{
persistPartial(
strategyId,
{
pullbackBeforeArm:
!!pullback.checked
}
);
apply();
}
);
favorites?.addEventListener(
"change",
()=>{
persistPartial(
strategyId,
{
useFavorites:
!!favorites.checked
}
);
apply();
}
);
real?.addEventListener(
"change",
()=>{
persistPartial(
strategyId,
{
refreshStatsMode:
normalizeBotRefreshStatsMode(
real.checked
? "real"
: "direct"
)
}
);
}
);

apply();
return apply;

}

function runningStrategyId(){

if(
st1.running
){
return "st1";
}

if(
st2.running
){
return "st2";
}

if(
st3.running
){
return "st3";
}

return null;

}

/** Поллинг статуса не должен перетирать поле, которое правит пользователь. */
function isFieldBeingEdited(
input
){

return !!input &&
document.activeElement ===
input;

}

function isManualTradingMode(){

return tradingMode ===
"manual";

}

function applyAlertLeadVisibility(){

const show =
isManualTradingMode();
const row =
document.getElementById(
"algo-bot-st1-alert-lead-row"
);
const hint =
document.getElementById(
"algo-bot-st1-alert-lead-hint"
);

row?.toggleAttribute(
"hidden",
!show
);
hint?.toggleAttribute(
"hidden",
!show
);

}

function applyManualRefreshStrategiesVisibility(){

const show =
isManualTradingMode();

for(
const id of [
"st1",
"st2",
"st3"
]
){
document.getElementById(
`algo-bot-st1-refresh-${id}-wrap`
)?.toggleAttribute(
"hidden",
!show
);
}

}

function applyPartialStrategiesManualGate(){

const manual =
isManualTradingMode();
const title =
manual
? "В ручном режиме доступна только Стратегия 1"
: "";

for(
const id of [
"st2",
"st3"
]
){

const wrap =
document.querySelector(
`[data-algo-bot-strategy="${id}"]`
);
const enabled =
document.getElementById(
`algo-bot-${id}-enabled`
);

wrap?.classList.toggle(
"is-manual-unavailable",
manual
);

if(
enabled
){
enabled.disabled =
manual ||
!!runningStrategyId();
enabled.title =
manual
? title
: (
`Выбрать Стратегию ${id === "st2" ? "2" : "3"} для запуска`
);
}

}

if(
manual &&
(
launchStrategyId ===
"st2" ||
launchStrategyId ===
"st3"
)
){
setLaunchStrategyId(
"st1"
);
}

}

/** @type {HTMLElement[]} */
const lockRoots =
[
dropdown,
st2Drop,
st3Drop,
document.getElementById(
"algo-settings-dropdown"
)
].filter(
Boolean
);

function applyLockUi(
running
){

document.body.classList.toggle(
"is-algo-bot-running",
running
);

for(
const el of [
...lockWhenRunning,
...document.querySelectorAll(
"#algo-bot-st2-dropdown input, #algo-bot-st2-dropdown button, #algo-bot-st3-dropdown input, #algo-bot-st3-dropdown button"
)
]
){

if(
el instanceof HTMLInputElement ||
el instanceof HTMLButtonElement
){
el.disabled =
running;
}

}

for(
const root of lockRoots
){

root.classList.toggle(
"is-bot-settings-locked",
running
);
root.inert =
running;

}

if(
st1Enabled
){
st1Enabled.disabled =
running;
}

if(
st2Enabled
){
st2Enabled.disabled =
running ||
isManualTradingMode();
}

if(
st3Enabled
){
st3Enabled.disabled =
running ||
isManualTradingMode();
}

applyPartialStrategiesManualGate();

}

function applyStatusPanel(
status
){

if(
statusDirection
){
statusDirection.textContent =
botSidesDirectionLabel(
status?.sides ||
status?.side,
!!status?.useFavorites
);
}

if(
statusSettings
){
const strategyId =
status?.strategyId ===
"st2" ||
status?.strategyId ===
"st3"
? status.strategyId
: status?.running
? "st1"
: "";
const prefs =
status?.strategyPrefs &&
typeof status.strategyPrefs ===
"object"
? status.strategyPrefs
: {
timeoutBars:
status?.timeoutBars,
maxPt1Pt4Bars:
status?.maxPt1Pt4Bars,
pullbackBeforeArm:
status?.pullbackBeforeArm,
pullbackBeforeArmPct:
status?.pullbackBeforeArmPct,
tf:
status?.tf,
slPct:
status?.slPct,
riskUsd:
status?.riskUsd,
tpRr:
status?.tpRr,
tp1:
status?.tp1,
tp2:
status?.tp2,
tp3:
status?.tp3,
alertLeadPct:
status?.alertLeadPct,
minTurnover24hUsdt:
status?.minTurnover24hUsdt,
trailSl:
status?.trailSl,
trailSlX1:
status?.trailSlX1,
trailSlX2:
status?.trailSlX2,
share1:
status?.share1,
share2:
status?.share2,
share3:
status?.share3,
side:
status?.side,
sides:
status?.sides,
useFavorites:
status?.useFavorites,
refreshHours:
status?.refreshHours,
refreshMinutes:
status?.refreshMinutes,
minWinRate:
status?.minWinRate,
refreshStatsMode:
status?.refreshStatsMode,
manualRefreshStrategies:
status?.manualRefreshStrategies
};
const rows =
strategyId
? formatBotStrategySettingsRows(
prefs,
strategyId,
{
tradingMode:
status?.tradingMode,
tickerBookTf:
status?.tickerBook?.tf ||
status?.tf
}
)
: [];

statusSettings.textContent =
strategyId
? (
strategyId ===
"st2"
? "Стратегия 2"
: strategyId ===
"st3"
? "Стратегия 3"
: "Стратегия 1"
)
: "—";
statusSettings.disabled =
!rows.length;
statusSettings.classList.toggle(
"has-items",
rows.length >
0
);

if(
statusSettingsList
){
statusSettingsList.innerHTML =
rows.length
? rows.map(
row=>
`<div class="algo-bot-status-settings-item"><span class="algo-bot-status-settings-item-label">${escapeHtml(
row.label
)}</span><span class="algo-bot-status-settings-item-value">${escapeHtml(
row.value
)}</span></div>`
).join(
""
)
: `<div class="algo-bot-status-settings-empty">Бот не запущен</div>`;
}
}

if(
statusWatchlist
){
statusWatchlist.textContent =
String(
status?.watchlistCount ??
"—"
);
}

if(
statusOpen
){
statusOpen.textContent =
String(
status?.openCount ??
"—"
);
}

if(
statusArmed
){
const armedCount =
Number(
status?.armedCount ??
0
);
const armedSetups =
Array.isArray(
status?.armedSetups
)
? status.armedSetups
: [];
const count =
Number.isFinite(
armedCount
)
? armedCount
: armedSetups.length;

statusArmed.textContent =
String(
count
);
statusArmed.disabled =
count <
1;
statusArmed.classList.toggle(
"has-items",
count >
0
);

if(
statusArmedList
){
const fingerprint =
armedSetups.map(
item=>{
const symbol =
String(
item?.symbol ||
""
).trim().toUpperCase();
const side =
item?.side ===
"short"
? "short"
: "long";
return symbol
? `${symbol}:${side}`
: "";
}
).filter(
Boolean
).join(
"|"
);

const listOpen =
!statusArmedList.classList.contains(
"hidden"
);

if(
count <
1
){
if(
lastArmedFingerprint !==
""
){
statusArmedList.innerHTML =
`<div class="algo-bot-status-armed-empty">Нет armed сетапов</div>`;
lastArmedFingerprint =
"";
}
closeArmedList();
}else if(
fingerprint !==
lastArmedFingerprint
){
armedListWasOpen =
listOpen;
statusArmedList.innerHTML =
armedSetups.map(
item=>{
const symbol =
String(
item?.symbol ||
""
).trim().toUpperCase();
const side =
item?.side ===
"short"
? "short"
: "long";
const b4 =
Number(
item?.b4
);
const p4 =
Number(
item?.p4
);
const itemFp =
String(
item?.fingerprint ||
""
).trim();

if(
!symbol
){
return "";
}

return `<div class="algo-bot-status-armed-item" role="menuitem" data-symbol="${escapeHtml(
symbol
)}" data-side="${side}" data-b4="${Number.isFinite(
b4
)
? b4
: ""}" data-p4="${Number.isFinite(
p4
)
? p4
: ""}" data-fingerprint="${escapeHtml(
itemFp
)}"><button type="button" class="algo-bot-status-armed-open" title="Открыть ${escapeHtml(
symbol
)}"><span>${escapeHtml(
symbol
)}</span><span class="algo-bot-status-armed-item-side is-${side}">${side}</span></button><button type="button" class="algo-bot-status-armed-disarm" title="Снять вооружение" aria-label="Снять вооружение ${escapeHtml(
symbol
)}">×</button></div>`;
}
).join(
""
);
lastArmedFingerprint =
fingerprint;

if(
armedListWasOpen
){
statusArmedList.classList.remove(
"hidden"
);
statusArmed.setAttribute(
"aria-expanded",
"true"
);
}
}
}
}

if(
statusWouldEnter
){
statusWouldEnter.textContent =
String(
status?.entriesCount ??
status?.wouldEnterCount ??
0
);
}

if(
statusLastSignal
){
const signals =
Array.isArray(
status?.signals
)
? status.signals
: [];
const lastText =
String(
status?.lastSignal ||
signals[
signals.length -
1
]?.text ||
""
).trim();
const count =
signals.length;

statusLastSignal.textContent =
lastText ||
"—";
statusLastSignal.disabled =
count <
1;
statusLastSignal.classList.toggle(
"has-items",
count >
0
);

if(
statusSignalList
){
const fingerprint =
signals.map(
item=>{
const ts =
Number(
item?.ts
) ||
0;
const text =
String(
item?.text ||
""
).trim();
return `${ts}:${text}`;
}
).join(
"|"
);
const listOpen =
!statusSignalList.classList.contains(
"hidden"
);

if(
count <
1
){
if(
lastSignalFingerprint !==
""
){
statusSignalList.innerHTML =
`<div class="algo-bot-status-signal-empty">Нет сигналов</div>`;
lastSignalFingerprint =
"";
}
closeSignalList();
}else if(
fingerprint !==
lastSignalFingerprint
){
signalListWasOpen =
listOpen;
const newestFirst =
signals.slice().reverse();
statusSignalList.innerHTML =
newestFirst.map(
item=>{
const symbol =
String(
item?.symbol ||
""
).trim().toUpperCase();
const sideRaw =
String(
item?.side ||
""
).trim().toLowerCase();
const side =
sideRaw ===
"short"
? "short"
: sideRaw ===
"long"
? "long"
: "";
const text =
String(
item?.text ||
""
).trim();
const time =
formatSignalTime(
item?.ts
);
const metaSide =
side
? `<span class="algo-bot-status-signal-item-side is-${side}">${side}</span>`
: `<span></span>`;
const metaTime =
time
? `<span>${escapeHtml(
time
)}</span>`
: "";

if(
!text
){
return "";
}

return `<button type="button" class="algo-bot-status-signal-item" role="menuitem" data-symbol="${escapeHtml(
symbol
)}" data-side="${side}"><span class="algo-bot-status-signal-item-meta">${metaSide}${metaTime}</span><span class="algo-bot-status-signal-item-text">${escapeHtml(
text
)}</span></button>`;
}
).join(
""
);
lastSignalFingerprint =
fingerprint;

if(
signalListWasOpen
){
statusSignalList.classList.remove(
"hidden"
);
statusLastSignal.setAttribute(
"aria-expanded",
"true"
);
}
}
}
}

if(
statusMessage
){
const msg =
String(
status?.message ||
""
).trim();
const isError =
status?.ok ===
false &&
!status?.running;

if(
msg
){
statusMessage.textContent =
msg;
statusMessage.classList.remove(
"hidden"
);
statusMessage.classList.toggle(
"is-error",
isError
);
}else{
statusMessage.textContent =
"";
statusMessage.classList.add(
"hidden"
);
statusMessage.classList.remove(
"is-error"
);
}

}

}

async function refreshCloudLockUi(){

const lockRow =
statusLockValue?.closest(
".algo-bot-status-row--lock"
);

if(
!statusLockValue &&
!statusLockClearBtn
){
return;
}

/* Temporary: cloud lock UI hidden (metka-129+). */
if(
lockRow
){
lockRow.hidden =
true;
}

if(
statusLockClearBtn
){
statusLockClearBtn.hidden =
true;
statusLockClearBtn.disabled =
true;
}

const lock =
await fetchAlgoBotCloudLock();

if(
lock?.skipped
){
if(
statusLockValue
){
statusLockValue.textContent =
"—";
statusLockValue.classList.remove(
"is-locked",
"is-ours"
);
}

return;
}

if(
!lock?.ok
){
if(
statusLockValue
){
statusLockValue.textContent =
lock?.code ===
"not_configured"
? "нет облака"
: "—";
statusLockValue.classList.remove(
"is-locked",
"is-ours"
);
}

if(
statusLockClearBtn
){
statusLockClearBtn.disabled =
lock?.code ===
"not_configured";
}

return;
}

if(
statusLockValue
){
if(
!lock.locked
){
statusLockValue.textContent =
"свободно";
statusLockValue.classList.remove(
"is-locked",
"is-ours"
);
}else if(
lock.ownedByUs
){
statusLockValue.textContent =
"это приложение";
statusLockValue.classList.add(
"is-ours"
);
statusLockValue.classList.remove(
"is-locked"
);
}else{
statusLockValue.textContent =
lock.appName
? String(
lock.appName
)
: "другое приложение";
statusLockValue.classList.add(
"is-locked"
);
statusLockValue.classList.remove(
"is-ours"
);
}
}

if(
statusLockClearBtn
){
statusLockClearBtn.disabled =
false;
}

}

function applyBotStatus(
status
){

if(
!status
){
return;
}

maybeApplyTickerFlagsFromBotStatus(
status
);

if(
status.tradingMode ===
"manual" ||
status.tradingMode ===
"live"
){
tradingMode =
status.tradingMode;
applyPartialStrategiesManualGate();
applyAlertLeadVisibility();
applyManualRefreshStrategiesVisibility();
}

const statusWasOpen =
!!statusDrop &&
!statusDrop.classList.contains(
"hidden"
);
const prevRunning =
runningStrategyId();

if(
status.running !=
null
){
st1.running =
status.strategyId ===
"st1" &&
!!status.running;
st2.running =
status.strategyId ===
"st2" &&
!!status.running;
st3.running =
status.strategyId ===
"st3" &&
!!status.running;
}

applyRunBtn();
applySt2?.();
applySt3?.();
applyPartialStrategiesManualGate();

if(
prevRunning !==
runningStrategyId()
){
applyLockUi(
runningStrategyId()
);
}

if(
statusWasOpen
){
statusDrop?.classList.remove(
"hidden"
);
statusToggle?.setAttribute(
"aria-expanded",
"true"
);
}

applyStatusPanel(
status
);

if(
prevRunning !==
runningStrategyId()
){
saveBotStrategiesPrefs(
{
st1:{
running:
!!st1.running
},
st2:{
running:
!!st2.running
},
st3:{
running:
!!st3.running
}
}
);
}

if(
runningStrategyId() &&
!prevRunning
){
void ensureAlgoBotCloudLock().then(
()=>
refreshCloudLockUi()
);
}else if(
prevRunning !==
runningStrategyId()
){
void refreshCloudLockUi();
}

}

async function refreshBotStatus(){

const status =
await fetchAlgoBotStatus();

if(
status &&
(
status.running !=
null ||
status.ok !==
false
)
){
applyBotStatus(
status
);
}

return status;

}

function startStatusPoll(){

stopStatusPoll();
statusPollTimer =
window.setInterval(
()=>{
void refreshBotStatus();
},
STATUS_POLL_MS
);

}

function stopStatusPoll(){

if(
statusPollTimer
){
window.clearInterval(
statusPollTimer
);
statusPollTimer =
null;
}

}

function applyTfUi(){

for(
const btn of tfBtns
){
btn.classList.toggle(
"active",
btn.getAttribute(
"data-bot-tf"
) ===
st1.tf
);
}

}

function applySideUi(){

const sides =
normalizeBotSides(
st1.sides,
st1.side
);

st1.sides =
sides;
st1.side =
primaryBotSide(
sides
);

if(
sideLong
){
sideLong.checked =
!!sides.long;
}

if(
sideShort
){
sideShort.checked =
!!sides.short;
}

if(
sideBoth
){
sideBoth.checked =
!!sides.both;
}

if(
sideHint
){
sideHint.textContent =
botStrategyListLabel(
"st1",
!!st1.useFavorites
);
}

if(
useFavoritesCheck
){
useFavoritesCheck.checked =
!!st1.useFavorites;
}

}

function setSideFlag(
side,
enabled
){

const next =
{
...normalizeBotSides(
st1.sides,
st1.side
),
[
side
]:
!!enabled
};

if(
!next.long &&
!next.short &&
!next.both
){
next[
side
] =
true;
}

st1.sides =
next;
st1.side =
primaryBotSide(
next
);
applySideUi();
persistSt1(
{
sides:
st1.sides,
side:
st1.side
}
);

}

function applyFieldsFromPrefs(){

if(
timeoutInput
){
timeoutInput.value =
String(
st1.timeoutBars
);
}

if(
maxPt1Pt4BarsInput
){
maxPt1Pt4BarsInput.value =
st1.maxPt1Pt4Bars ==
null
? ""
: String(
st1.maxPt1Pt4Bars
);
}

/* TEMP_PULLBACK_BEFORE_ARM */
if(
pullbackPctInput
){
pullbackPctInput.value =
String(
st1.pullbackBeforeArmPct ??
38.2
);
}

if(
pullbackInput
){
pullbackInput.checked =
!!st1.pullbackBeforeArm;
}

if(
slPctInput
){
slPctInput.value =
String(
st1.slPct
);
}

if(
slUsdInput
){
slUsdInput.value =
String(
st1.riskUsd
);
}

if(
tpRrInput
){
tpRrInput.value =
String(
st1.tpRr
);
}

if(
minTurnoverInput
){
minTurnoverInput.value =
formatDotThousands(
st1.minTurnover24hUsdt
);
}

if(
alertLeadInput
){
alertLeadInput.value =
String(
st1.alertLeadPct ??
5
);
}

if(
refreshH
){
refreshH.value =
String(
st1.refreshHours
);
}

if(
refreshM
){
refreshM.value =
String(
st1.refreshMinutes
);
}

if(
winrateInput
){
winrateInput.value =
String(
st1.minWinRate
);
}

if(
refreshRealCheck
){
refreshRealCheck.checked =
st1.refreshStatsMode ===
"real";
}

const refreshStrats =
normalizeManualRefreshStrategies(
st1.manualRefreshStrategies
);

for(
const id of [
"st1",
"st2",
"st3"
]
){
const input =
document.getElementById(
`algo-bot-st1-refresh-${id}`
);

if(
input
){
input.checked =
!!refreshStrats[
id
];
}
}

applyTfUi();
applySideUi();
applyRunBtn();

}

function onFieldBlur(
key,
input,
normalize
){

if(
!input ||
st1.running
){
return;
}

const next =
normalize(
input.value
);
input.value =
next ==
null
? ""
: String(
next
);
persistSt1(
{
[
key
]:
next
}
);

}

applyFieldsFromPrefs();
const applySt2 =
initPartialStrategy(
"st2"
);
const applySt3 =
initPartialStrategy(
"st3"
);
applyPartialStrategiesManualGate();
applyAlertLeadVisibility();
applyManualRefreshStrategiesVisibility();

function onTradingModeChanged(
event
){

const next =
event?.detail?.tradingMode;

if(
next ===
"manual" ||
next ===
"live"
){
tradingMode =
next;
applyPartialStrategiesManualGate();
applyAlertLeadVisibility();
applyManualRefreshStrategiesVisibility();
applySt2?.();
applySt3?.();
}

}

window.addEventListener(
"algo-trading-mode-changed",
onTradingModeChanged
);

syncConfigToMain();
void refreshBotStatus().then(
()=>{
if(
runningStrategyId()
){
void ensureAlgoBotCloudLock().then(
()=>
refreshCloudLockUi()
);
}else{
void refreshCloudLockUi();
}
}
);
startStatusPoll();

const unsubBotStatus =
subscribeAlgoBotStatus(
status=>{
applyBotStatus(
status
);
}
);

async function onTickerFlagsChanged(){

if(
!isAlgoBotDesktop()
){
return;
}

// Push local lists to main; never pull flags back from status poll.
await syncAllTickerFlagsRootToMain();

}

window.addEventListener(
"algo-bot-ticker-flags-changed",
onTickerFlagsChanged
);

botsBtn?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
const open =
botsDrop?.classList.contains(
"hidden"
) !==
false;
setDropOpen(
botsDrop,
botsBtn,
open
);
}
);

botsItemPattern12?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
closeAllDrops();
setActiveAnalysisBotId(
ALGO_ANALYSIS_BOT_PATTERN_12
);
applyActiveAnalysisBotMenuUi();
openBotSettingsModal();
}
);

botSettingsModal?.addEventListener(
"click",
event=>{
const t =
event.target;

if(
!(
t instanceof Element
)
){
return;
}

if(
t.closest(
'[data-close="algo-bot-settings-modal"]'
)
){
event.preventDefault();
closeBotSettingsModal();
}
}
);

for(
const [
id,
input
] of [
[
"st1",
st1Enabled
],
[
"st2",
st2Enabled
],
[
"st3",
st3Enabled
]
]
){
input?.addEventListener(
"change",
()=>{
if(
runningStrategyId()
){
applyLaunchEnabledUi();
return;
}

if(
isManualTradingMode() &&
id !==
"st1"
){
applyLaunchEnabledUi();
return;
}

if(
input.checked
){
setLaunchStrategyId(
id
);
}else if(
launchStrategyId ===
id
){
/* хотя бы одна стратегия должна быть выбрана */
setLaunchStrategyId(
"st1"
);
}else{
applyLaunchEnabledUi();
}
}
);
}

applyLaunchEnabledUi();
setActiveAnalysisBotId(
getActiveAnalysisBotId(),
{
silent:
true
}
);
applyActiveAnalysisBotMenuUi();

statusToggle?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopImmediatePropagation();
event.stopPropagation();
const open =
statusDrop?.classList.contains(
"hidden"
) !==
false;
setDropOpen(
statusDrop,
statusToggle,
open
);
if(
open
){
void refreshCloudLockUi();
}
},
true
);



statusLockClearBtn?.addEventListener(
"click",
async event=>{
event.preventDefault();
event.stopPropagation();

if(
statusLockClearBtn.disabled
){
return;
}

statusLockClearBtn.disabled =
true;

const result =
await clearAlgoBotCloudLock();

applyStatusPanel(
{
ok:
!!result?.ok,
message:
result?.ok
? (
result.message ||
"Блокировка снята"
)
: (
result?.message ||
"Не удалось снять блокировку"
),
running:
!!runningStrategyId()
}
);

await refreshCloudLockUi();

statusLockClearBtn.disabled =
false;
}
);

statusDrop?.addEventListener(
"click",
event=>{
event.stopPropagation();
}
);

statusSettings?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

if(
statusSettings.disabled
){
return;
}

const open =
statusSettingsList?.classList.contains(
"hidden"
) !==
false;

if(
open
){
closeArmedList();
closeSignalList();
statusSettingsList?.classList.remove(
"hidden",
"is-flip-right"
);
statusSettings.setAttribute(
"aria-expanded",
"true"
);

requestAnimationFrame(
()=>{
if(
!statusSettingsList ||
statusSettingsList.classList.contains(
"hidden"
)
){
return;
}

const rect =
statusSettingsList.getBoundingClientRect();

if(
rect.left <
8
){
statusSettingsList.classList.add(
"is-flip-right"
);
}
}
);
}else{
closeSettingsList();
}

}
);

statusArmed?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

if(
statusArmed.disabled
){
return;
}

const open =
statusArmedList?.classList.contains(
"hidden"
) !==
false;

if(
open
){
closeSettingsList();
closeSignalList();
statusArmedList?.classList.remove(
"hidden",
"is-flip-right"
);
statusArmed.setAttribute(
"aria-expanded",
"true"
);

requestAnimationFrame(
()=>{
if(
!statusArmedList ||
statusArmedList.classList.contains(
"hidden"
)
){
return;
}

const rect =
statusArmedList.getBoundingClientRect();

/* Default opens left (away from #list); flip right only if clipped. */
if(
rect.left <
8
){
statusArmedList.classList.add(
"is-flip-right"
);
}
}
);
}else{
closeArmedList();
}

}
);

statusArmedList?.addEventListener(
"click",
async event=>{
event.preventDefault();
event.stopPropagation();

const disarmBtn =
event.target?.closest?.(
".algo-bot-status-armed-disarm"
);

if(
disarmBtn instanceof HTMLElement
){
const row =
disarmBtn.closest(
".algo-bot-status-armed-item"
);

if(
!(
row instanceof HTMLElement
)
){
return;
}

const symbol =
String(
row.dataset.symbol ||
""
).trim().toUpperCase();
const side =
row.dataset.side ===
"short"
? "short"
: "long";
const fingerprint =
String(
row.dataset.fingerprint ||
""
).trim();
const b4 =
Number(
row.dataset.b4
);
const p4 =
Number(
row.dataset.p4
);

if(
!symbol
){
return;
}

disarmBtn.disabled =
true;

try{
const result =
await disarmAlgoArmedSetup(
{
symbol,
side,
fingerprint,
b4:
Number.isFinite(
b4
)
? b4
: undefined,
p4:
Number.isFinite(
p4
)
? p4
: undefined
}
);
applyBotStatus(
result
);
}finally{
disarmBtn.disabled =
false;
}

return;
}

const openBtn =
event.target?.closest?.(
".algo-bot-status-armed-open"
) ||
event.target?.closest?.(
".algo-bot-status-armed-item"
);

if(
!(
openBtn instanceof HTMLElement
)
){
return;
}

const row =
openBtn.closest?.(
".algo-bot-status-armed-item"
) ||
openBtn;
const symbol =
String(
row.dataset?.symbol ||
""
).trim().toUpperCase();

if(
!symbol
){
return;
}

window.dispatchEvent(
new CustomEvent(
"algo-book-open-symbol",
{
detail:{
symbol
}
}
)
);
}
);

statusLastSignal?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

if(
statusLastSignal.disabled
){
return;
}

const open =
statusSignalList?.classList.contains(
"hidden"
) !==
false;

if(
open
){
closeSettingsList();
closeArmedList();
statusSignalList?.classList.remove(
"hidden",
"is-flip-right"
);
statusLastSignal.setAttribute(
"aria-expanded",
"true"
);

requestAnimationFrame(
()=>{
if(
!statusSignalList ||
statusSignalList.classList.contains(
"hidden"
)
){
return;
}

const rect =
statusSignalList.getBoundingClientRect();

if(
rect.left <
8
){
statusSignalList.classList.add(
"is-flip-right"
);
}
}
);
}else{
closeSignalList();
}

}
);

statusSignalList?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();

const btn =
event.target?.closest?.(
".algo-bot-status-signal-item"
);

if(
!(
btn instanceof HTMLElement
)
){
return;
}

const symbol =
String(
btn.dataset.symbol ||
""
).trim().toUpperCase();

if(
!symbol
){
return;
}

window.dispatchEvent(
new CustomEvent(
"algo-book-open-symbol",
{
detail:{
symbol
}
}
)
);
}
);

runBtn?.addEventListener(
"click",
async event=>{
event.preventDefault();
event.stopPropagation();

if(
runInflight
){
return;
}

runInflight =
true;
applyRunBtn();

const activeId =
runningStrategyId();

try{
if(
activeId
){
if(
activeId ===
"st1"
){
st1.running =
false;
}else if(
activeId ===
"st2"
){
st2.running =
false;
}else{
st3.running =
false;
}
applyRunBtn();
applyLockUi(
false
);
const result =
await stopAlgoBot(
activeId
);
applyBotStatus(
result
);
void refreshCloudLockUi();
}else{
const startId =
normalizeLaunchStrategyId(
launchStrategyId
);

if(
isManualTradingMode() &&
startId !==
"st1"
){
applyStatusPanel(
{
ok:
false,
message:
"В ручном режиме доступна только Стратегия 1",
running:
false
}
);
return;
}

/* Commit open maxPt1Pt4 before Start for partial strategies. */
if(
startId ===
"st2" ||
startId ===
"st3"
){
const maxPt1Input =
document.getElementById(
`algo-bot-${startId}-max-pt1-pt4-bars`
);

if(
maxPt1Input &&
!maxPt1Input.disabled
){
const next =
clampMaxPt1Pt4Bars(
maxPt1Input.value
);
maxPt1Input.value =
next ==
null
? ""
: String(
next
);
persistPartial(
startId,
{
maxPt1Pt4Bars:
next
}
);
}
}

const result =
await startAlgoBot(
startId
);

if(
result?.ok ||
result?.running
){
applyBotStatus(
result
);
}else{
applyBotStatus(
{
...result,
running:
false
}
);
applyStatusPanel(
result
);
}

void refreshCloudLockUi();
}
}finally{
runInflight =
false;
applyRunBtn();
}

}
);

for(
const btn of tfBtns
){
btn.addEventListener(
"click",
()=>{
if(
st1.running
){
return;
}

st1.tf =
normalizeBotTf(
btn.getAttribute(
"data-bot-tf"
)
);
applyTfUi();
persistSt1(
{
tf:
st1.tf
}
);
}
);
}

function onSt1SideChange(
side,
input
){

if(
st1.running
){
applySideUi();
return;
}

setSideFlag(
side,
!!input?.checked
);

}

sideLong?.addEventListener(
"change",
()=>{
onSt1SideChange(
"long",
sideLong
);
}
);
sideShort?.addEventListener(
"change",
()=>{
onSt1SideChange(
"short",
sideShort
);
}
);
sideBoth?.addEventListener(
"change",
()=>{
onSt1SideChange(
"both",
sideBoth
);
}
);

useFavoritesCheck?.addEventListener(
"change",
()=>{
if(
st1.running
){
useFavoritesCheck.checked =
!!st1.useFavorites;
return;
}

st1.useFavorites =
!!useFavoritesCheck.checked;
applySideUi();
persistSt1(
{
useFavorites:
st1.useFavorites
}
);
}
);

timeoutInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"timeoutBars",
timeoutInput,
v=>
Math.min(
10000,
Math.max(
1,
Math.round(
Number(
v
) ||
200
)
)
)
);
}
);
maxPt1Pt4BarsInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"maxPt1Pt4Bars",
maxPt1Pt4BarsInput,
v=>
clampMaxPt1Pt4Bars(
v
)
);
}
);
maxPt1Pt4BarsInput?.addEventListener(
"blur",
()=>{
onFieldBlur(
"maxPt1Pt4Bars",
maxPt1Pt4BarsInput,
v=>
clampMaxPt1Pt4Bars(
v
)
);
}
);
/* TEMP_PULLBACK_BEFORE_ARM */
pullbackPctInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"pullbackBeforeArmPct",
pullbackPctInput,
v=>{
const n =
Number(
v
);
if(
!Number.isFinite(
n
)
){
return 38.2;
}
return Math.min(
100,
Math.max(
1,
Math.round(
n *
10
) /
10
)
);
}
);
}
);
pullbackInput?.addEventListener(
"change",
()=>{
if(
st1.running
){
pullbackInput.checked =
!!st1.pullbackBeforeArm;
return;
}

st1.pullbackBeforeArm =
!!pullbackInput.checked;
persistSt1(
{
pullbackBeforeArm:
st1.pullbackBeforeArm
}
);
}
);
slPctInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"slPct",
slPctInput,
v=>{
const n =
Number(
v
);
return Number.isFinite(
n
) &&
n >=
0.01
? n
: 50;
}
);
}
);
slUsdInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"riskUsd",
slUsdInput,
v=>{
const n =
Number(
v
);
return Number.isFinite(
n
) &&
n >=
0.01
? n
: 1;
}
);
}
);
tpRrInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"tpRr",
tpRrInput,
v=>{
const n =
Number(
v
);
return Number.isFinite(
n
) &&
n >=
0.01
? n
: 2;
}
);
}
);
minTurnoverInput?.addEventListener(
"change",
()=>{
if(
!minTurnoverInput
){
return;
}

const next =
parseDotThousands(
minTurnoverInput.value,
20_000_000
);
minTurnoverInput.value =
formatDotThousands(
next
);
persistSt1(
{
minTurnover24hUsdt:
next
}
);
}
);
minTurnoverInput?.addEventListener(
"blur",
()=>{
if(
!minTurnoverInput
){
return;
}

minTurnoverInput.value =
formatDotThousands(
parseDotThousands(
minTurnoverInput.value,
st1.minTurnover24hUsdt ??
20_000_000
)
);
}
);
alertLeadInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"alertLeadPct",
alertLeadInput,
v=>{
const n =
Number(
v
);

if(
!Number.isFinite(
n
) ||
n <
0
){
return 5;
}

return Math.min(
10,
n
);
}
);
}
);
refreshH?.addEventListener(
"change",
()=>{
onFieldBlur(
"refreshHours",
refreshH,
v=>
Math.min(
168,
Math.max(
0,
Math.round(
Number(
v
) ||
0
)
)
)
);
}
);
refreshM?.addEventListener(
"change",
()=>{
onFieldBlur(
"refreshMinutes",
refreshM,
v=>
Math.min(
59,
Math.max(
0,
Math.round(
Number(
v
) ||
0
)
)
)
);
}
);
winrateInput?.addEventListener(
"change",
()=>{
onFieldBlur(
"minWinRate",
winrateInput,
v=>
Math.min(
100,
Math.max(
10,
Math.round(
Number(
v
) ||
70
)
)
)
);
}
);
refreshRealCheck?.addEventListener(
"change",
()=>{
persistSt1(
{
refreshStatsMode:
normalizeBotRefreshStatsMode(
refreshRealCheck.checked
? "real"
: "direct"
)
}
);
}
);

function persistManualRefreshStrategiesFromUi(
event
){

const target =
event?.target;
const clickedId =
[
"st1",
"st2",
"st3"
].find(
id=>
document.getElementById(
`algo-bot-st1-refresh-${id}`
) ===
target
);
const next =
{
st1:
false,
st2:
false,
st3:
false
};

if(
clickedId &&
target?.checked
){
next[
clickedId
] =
true;
}else{
const current =
normalizeManualRefreshStrategies(
st1.manualRefreshStrategies
);
const keep =
clickedId &&
current[
clickedId
]
? clickedId
: (
[
"st1",
"st2",
"st3"
].find(
id=>
current[
id
]
) ||
"st1"
);

next[
keep
] =
true;
}

const flags =
normalizeManualRefreshStrategies(
next
);

for(
const id of [
"st1",
"st2",
"st3"
]
){
const input =
document.getElementById(
`algo-bot-st1-refresh-${id}`
);

if(
input
){
input.checked =
!!flags[
id
];
}
}

persistSt1(
{
manualRefreshStrategies:
flags
}
);
}

for(
const id of [
"st1",
"st2",
"st3"
]
){
document.getElementById(
`algo-bot-st1-refresh-${id}`
)?.addEventListener(
"change",
persistManualRefreshStrategiesFromUi
);
}

function onDocClick(
event
){

const target =
event.target;

if(
!(
target instanceof Node
)
){
return;
}

const statusWrap =
document.getElementById(
"algo-bot-status-wrap"
);

if(
strategiesWrap?.contains(
target
) ||
statusWrap?.contains(
target
) ||
botSettingsModal?.contains(
target
)
){
return;
}

closeAllDrops();

}

function onKeydown(
event
){

if(
event.key ===
"Escape"
){
closeAllDrops();
closeBotSettingsModal();
}

}

document.addEventListener(
"click",
onDocClick
);
document.addEventListener(
"keydown",
onKeydown
);

function formatBookStatus(
book
){

if(
!book?.tickers ||
!Object.keys(
book.tickers
).length
){
return "Книга не загружена";
}

const n =
Number(
book.tickerCount
) ||
Object.keys(
book.tickers
).length;
const tf =
String(
book.tf ||
""
);
const tfPart =
tf
? `, ТФ ${tf}`
: "";

return `Книга загружена (${n} тикеров${tfPart})`;

}

function refreshBookStatusUi(
strategyId
){

const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const el =
document.getElementById(
`algo-bot-${id}-book-status`
);

if(
!el
){
return;
}

const staged =
loadStagedBotTickerBook(
id
);
const published =
loadBotTickerBook(
id
);

if(
staged
){
el.textContent =
formatBookStatus(
staged
);
}else if(
published?.tickerCount
){
el.textContent =
`Книга готова к загрузке (${published.tickerCount} тикеров) — нажмите кнопку`;
}else{
el.textContent =
"Книга не загружена";
}

}

function wireLoadBookButton(
strategyId
){

const id =
strategyId ===
"st2" ||
strategyId ===
"st3"
? strategyId
: "st1";
const btn =
document.getElementById(
`algo-bot-${id}-load-book`
);
const statusEl =
document.getElementById(
`algo-bot-${id}-book-status`
);

if(
!btn
){
return;
}

btn.addEventListener(
"click",
()=>{
const result =
stageBotTickerBookFromPublished(
id
);

if(
!result.ok
){
if(
statusEl
){
statusEl.textContent =
result.message ||
"Книга не загружена";
}
return;
}

if(
statusEl
){
statusEl.textContent =
formatBookStatus(
result.book
);
}

void persistBotTickerBookToMain(
id,
result.book
);

}
);

refreshBookStatusUi(
id
);

}

wireLoadBookButton(
"st1"
);
wireLoadBookButton(
"st2"
);
wireLoadBookButton(
"st3"
);

const api = {
destroy(){
stopStatusPoll();
unsubBotStatus();
window.removeEventListener(
"algo-bot-ticker-flags-changed",
onTickerFlagsChanged
);
window.removeEventListener(
"algo-trading-mode-changed",
onTradingModeChanged
);
document.removeEventListener(
"click",
onDocClick
);
document.removeEventListener(
"keydown",
onKeydown
);
document.body.classList.remove(
"is-algo-bot-running"
);
for(
const root of lockRoots
){
root.classList.remove(
"is-bot-settings-locked"
);
root.inert =
false;
}
strategiesWrap?.classList.remove(
"is-bot-running"
);
closeAllDrops();
closeBotSettingsModal();
}
};

mountLocalSessionLogsEntry(
{
closeStatusDropdown:()=>{
setDropOpen(
statusDrop,
statusToggle,
false
);
}
}
);

mountRemoteSessionLogsEntry(
{
closeStatusDropdown:()=>{
setDropOpen(
statusDrop,
statusToggle,
false
);
}
}
);

mountRemoteWatchlistsPushEntry(
{
closeStatusDropdown:()=>{
setDropOpen(
statusDrop,
statusToggle,
false
);
}
}
);

activeBotStrategyUiDestroy =
api.destroy;

return {
destroy(){
api.destroy();
if(
activeBotStrategyUiDestroy ===
api.destroy
){
activeBotStrategyUiDestroy =
null;
}
}
};

}
