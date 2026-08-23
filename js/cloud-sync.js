import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=9";

import {
SUPABASE_AUTH_STORAGE_KEY,
authNetworkTimeoutMs,
isExplicitAuthSignOut,
isSafariBrowser,
isFatalAuthRefreshError,
isLocalAuthRefreshBlockError,
isRateLimitedAuthRefreshError,
clearPersistedRefreshToken,
markExplicitAuthSignOut,
clearExplicitAuthSignOut,
restoreAuthSessionFromBackup,
restoreDesktopAuthSession,
readAuthSessionRaw,
persistAuthSessionRaw,
isAuthRefreshBlocked,
blockAuthRefreshUntil,
clearAuthRefreshBlock,
getAuthRefreshBlockedUntil
} from "./auth-storage.js?v=10";

import {
encodeAuthSessionTransfer,
decodeAuthSessionTransfer,
normalizeAuthSessionRaw
} from "./auth-session-transfer.js?v=1";

import {
loadFavoritesGroups,
saveFavoritesGroups,
favoritesToCloudList,
favoritesFromCloudList,
favoritesGroupsEqual,
favoritesSignature as favoritesGroupsSignature,
loadFavoritesCloudUpdatedAt,
saveFavoritesCloudUpdatedAt,
saveFavoritesCloudSyncedSignature,
hasUnsyncedFavoritesCloud
} from "./favorites.js?v=5";

import {
getActiveExchangeId
} from "./exchanges/context.js?v=1";

import {
collectAllLocalDrawings,
applyDrawingsMapToLocal,
loadLocalTombstones,
saveLocalTombstones,
mergeTombstoneMaps,
mergeDrawingsPayload,
packCloudDrawings,
unpackCloudDrawings
} from "./drawings-storage.js?v=7";

import {
withTimeout
} from "./async-timeout.js?v=2";

import {
readAlertTokenSync,
readPersistedAuthSession
} from "./alert-auth-cache.js?v=7";

import {
createNotifyDebouncer,
isAlertsPage
} from "./cloud-sync-throttle.js?v=3";

import {
isSupabaseRealtimeDisabled,
isFavoritesCloudDisabled,
isFavoritesAutoCloudDisabled,
isAlertsCloudDisabled,
isAutoDevicePullDisabled,
scaleSupabasePollMs
} from "./supabase-usage-prefs.js?v=5";

import {
isAlgoBotLiteShell
} from "./page-routes.js?v=5";

const DRAWINGS_LOCAL_TS_KEY =
"drawings_local_updated_at";

const DRAWINGS_SYNCED_SIG_KEY =
"drawings_synced_signature";

let configured = false;
let loggedIn = false;
let userEmail = "";
let lastAppliedSessionKey = "__init__";
const authListeners = new Set();

let lastSilentRefreshMs =
0;
let authRefreshBlockedUntil =
getAuthRefreshBlockedUntil();
let refreshSessionInflight =
null;
let lastAuthWarnKey =
"";
let lastAuthWarnMs =
0;

const SILENT_REFRESH_MIN_MS =
45000;

/** Algo Bot lite: watch JWT expiry (no Auth refresh — Multichart owns rotation). */
const ALGO_BOT_LITE_AUTH_WATCH_MS =
2 *
60 *
1000;
const ALGO_BOT_LITE_REFRESH_SKEW_MS =
20 *
60 *
1000;

const AUTH_PROBLEM_KEY =
"ct_cloud_auth_problem_v1";

let cloudAuthProblem =
null;

let authRateLimitStrikes =
0;

let algoBotLiteAuthWatchBound =
false;

let cloudAuthProblemBannerBound =
false;

function readStoredAuthProblem(){

try{

const raw =
sessionStorage.getItem(
AUTH_PROBLEM_KEY
);

if(
!raw
){
return null;
}

const data =
JSON.parse(
raw
);

if(
!data?.message
){
return null;
}

return {
code:
String(
data.code ||
"auth"
),
message:
String(
data.message
),
at:
Number(
data.at
) ||
Date.now()
};

}catch{
return null;
}

}

cloudAuthProblem =
readStoredAuthProblem();

function writeStoredAuthProblem(
problem
){

try{

if(
!problem?.message
){
sessionStorage.removeItem(
AUTH_PROBLEM_KEY
);
return;
}

sessionStorage.setItem(
AUTH_PROBLEM_KEY,
JSON.stringify(
{
code:
problem.code ||
"auth",
message:
problem.message,
at:
problem.at ||
Date.now()
}
)
);

}catch{
/* ignore */
}

}

function publishCloudAuthProblem(
code,
message
){

const next =
message
? {
code:
String(
code ||
"auth"
),
message:
String(
message
),
at:
Date.now()
}
: null;

cloudAuthProblem =
next;
writeStoredAuthProblem(
next
);

try{
window.dispatchEvent(
new CustomEvent(
"cloud-auth-problem",
{
detail:
next
}
)
);
}catch{
/* ignore */
}

notifyAuth();

}

export function getCloudAuthProblem(){

return cloudAuthProblem;

}

export function clearCloudAuthProblem(){

if(
!cloudAuthProblem
){
return;
}

publishCloudAuthProblem(
"",
""
);

}

function paintCloudAuthProblemBanner(){

const el =
document.getElementById(
"cloud-auth-problem-banner"
);

if(
!el
){
return;
}

const problem =
getCloudAuthProblem();

if(
!problem?.message
){
el.classList.add(
"hidden"
);
el.textContent =
"";
return;
}

el.classList.remove(
"hidden"
);
el.textContent =
problem.message;

}

export function mountCloudAuthProblemBanner(){

/* Red strip is Algo Bot only — Multichart users without remote bot must not see it. */
if(
!isAlgoBotLiteShell()
){
try{
document.getElementById(
"cloud-auth-problem-banner"
)?.remove();
}catch{
/* ignore */
}
return;
}

if(
typeof document ===
"undefined"
){
return;
}

let el =
document.getElementById(
"cloud-auth-problem-banner"
);

if(
!el
){

el =
document.createElement(
"div"
);
el.id =
"cloud-auth-problem-banner";
el.className =
"cloud-auth-problem-banner hidden";
el.setAttribute(
"role",
"alert"
);

const header =
document.querySelector(
"#header.app-page-header"
) ||
document.getElementById(
"header"
);

if(
header?.parentNode
){
header.parentNode.insertBefore(
el,
header.nextSibling
);
}else{
document.body.prepend(
el
);
}

}

paintCloudAuthProblemBanner();

if(
!cloudAuthProblemBannerBound
){
cloudAuthProblemBannerBound =
true;
window.addEventListener(
"cloud-auth-problem",
()=>{
paintCloudAuthProblemBanner();
}
);
onCloudSyncChange(
()=>{
paintCloudAuthProblemBanner();
}
);
}

}

/**
 * Algo Bot lite: JWT refresh is owned by Multichart only.
 * Both apps share one Supabase refresh_token («Отдать сессию»). Whoever
 * refreshes first rotates it; the other gets invalid_grant and looks
 * "logged out". Bot consumes access_token until Multichart pushes again.
 *
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
async function refreshAlgoBotLiteSessionIfNeeded(
opts =
{}
){

void opts;

if(
!isAlgoBotLiteShell()
){
return false;
}

/* Intentionally no refreshSessionDirect — see comment above. */
return false;

}

function bindAlgoBotLiteAuthWatch(){

if(
!isAlgoBotLiteShell() ||
algoBotLiteAuthWatchBound
){
return;
}

algoBotLiteAuthWatchBound =
true;

const tick =
()=>{

void (
async ()=>{

let snap =
readPersistedAuthSession();

if(
!snap?.user?.id
){
try{
await restoreDesktopAuthSession();
}catch{
/* ignore */
}

snap =
readPersistedAuthSession();
}

if(
!snap?.user?.id &&
typeof window !==
"undefined" &&
window.cryptoTerminalDesktop?.loadAuthSession
){
try{
const {
forceRestoreDesktopAuthSession
} =
await import(
"./auth-storage.js?v=10"
);
const forced =
await forceRestoreDesktopAuthSession();

if(
forced
){
await applyPersistedAuthSessionNow();
snap =
readPersistedAuthSession();
}
}catch{
/* ignore */
}
}

if(
!snap?.user?.id
){
publishCloudAuthProblem(
"missing",
"Нет облачной сессии — в шестерёнке вставьте сессию или «Отдать сессию» с Multichart."
);
return;
}

const after =
readPersistedAuthSession();

if(
!after?.user?.id
){
publishCloudAuthProblem(
"missing",
"Нет облачной сессии — в шестерёнке вставьте сессию или «Отдать сессию» с Multichart."
);
return;
}

if(
isAccessTokenExpired(
after
)
){
publishCloudAuthProblem(
"expired",
"Облачная сессия истекла — «Отдать сессию» с Multichart (бот сам JWT не обновляет, чтобы не выбить Multichart)."
);
return;
}

if(
isAccessTokenNearExpiry(
after,
ALGO_BOT_LITE_REFRESH_SKEW_MS
)
){
publishCloudAuthProblem(
"near_expiry",
"Облачная сессия скоро истечёт — нажмите «Отдать сессию» в Multichart (окно LAN)."
);
return;
}

if(
cloudAuthProblem?.code ===
"missing" ||
cloudAuthProblem?.code ===
"expired" ||
cloudAuthProblem?.code ===
"near_expiry"
){
clearCloudAuthProblem();
}

}
)();

};

tick();
window.setInterval(
tick,
ALGO_BOT_LITE_AUTH_WATCH_MS
);

}

function warnAuthOnce(
key,
msg
){

const now =
Date.now();

if(
lastAuthWarnKey ===
key &&
now -
lastAuthWarnMs <
120000
){
return;
}

lastAuthWarnKey =
key;
lastAuthWarnMs =
now;

console.warn(
msg
);

}

function blockAuthRefreshRetries(
reason,
options =
{}
){

const fatal =
options.fatal ===
true;
const rateLimited =
options.rateLimited ===
true;

if(
rateLimited
){
authRateLimitStrikes +=
1;
}else if(
fatal
){
authRateLimitStrikes =
0;
}

const softMs =
rateLimited
? Math.min(
2 *
60 *
60 *
1000,
30 *
60 *
1000 *
Math.max(
1,
Math.pow(
2,
authRateLimitStrikes -
1
)
)
)
: (
Number(
options.ms
) ||
2 *
60 *
1000
);

authRefreshBlockedUntil =
blockAuthRefreshUntil(
fatal
? undefined
: softMs,
{
clearRefreshToken:
fatal
}
);

const persisted =
readPersistedAuthSession();

const accessStillOk =
!!(
persisted?.access_token &&
!isAccessTokenExpired(
persisted
)
);

let message =
"";

if(
fatal
){
message =
isAlgoBotLiteShell()
? `Auth refresh сломан (${reason}) — войдите снова / «Отдать сессию». Повторы остановлены.`
: `Auth refresh сломан (${reason}) — войдите снова. Повторы остановлены.`;
}else if(
rateLimited
){
message =
isAlgoBotLiteShell()
? `Supabase Auth rate limit (429) — повторы остановлены ~${Math.round(softMs / 60000)} мин. Потом «Отдать сессию» или перезапуск бота.`
: `Supabase Auth rate limit (429) — повторы остановлены ~${Math.round(softMs / 60000)} мин. Сессия сохранена.`;
}else if(
!accessStillOk
){
message =
`Auth refresh не удался (${reason}) — повторы временно остановлены.`;
}

if(
message
){
publishCloudAuthProblem(
fatal
? "fatal"
: rateLimited
? "rate_limit"
: "soft",
message
);
warnAuthOnce(
"auth-degraded",
`[auth] ${message}`
);
}

if(
!isCloudAuthTokenUsable()
){
syncCloudLoginFromStorage();
}

}

function classifyAndBlockAuthRefreshFailure(
reason,
error,
options =
{}
){

if(
isRateLimitedAuthRefreshError(
error
)
){
blockAuthRefreshRetries(
reason,
{
rateLimited:
true
}
);
return "rate_limit";
}

if(
isLocalAuthRefreshBlockError(
error
)
){
/* Soft block already active — do not escalate to fatal wipe. */
blockAuthRefreshRetries(
reason,
{
fatal:
false,
ms:
Math.max(
60 *
1000,
authRefreshBlockedUntil -
Date.now()
)
}
);
return "blocked";
}

if(
isFatalAuthRefreshError(
error
)
){

/*
  Refresh-token rotation race (incl. remote Algo Bot sharing the same
  refresh_token): another device already rotated. Wiping Multichart would
  log the user out while access_token may still be fine.
*/
const persisted =
readPersistedAuthSession();
const reasonKey =
String(
reason ||
""
).toLowerCase();
const neverWipe =
options.allowFatalClear ===
false ||
reasonKey.includes(
"silent"
) ||
reasonKey.includes(
"lite"
);

if(
neverWipe ||
(
hasPersistedRefreshToken(
persisted
) &&
persisted?.access_token &&
!isAccessTokenExpired(
persisted
)
)
){
blockAuthRefreshRetries(
reason,
{
fatal:
false,
ms:
5 *
60 *
1000
}
);
return "soft";
}

blockAuthRefreshRetries(
reason,
{
fatal:
true
}
);
return "fatal";
}

blockAuthRefreshRetries(
reason,
{
fatal:
false
}
);
return "soft";

}

function isAuthRefreshBlockedNow(){

return (
Date.now() <
authRefreshBlockedUntil ||
isAuthRefreshBlocked()
);

}

/** Сразу из localStorage — без getSession() (в Safari он часто зависает 12+ с). */
function bootstrapAuthFromLocalStorage(){

const snap =
readPersistedAuthSession() ||
readAlertTokenSync();

const user =
snap?.user;

if(
!user?.id
){
return;
}

if(
!isCloudAuthTokenUsable()
){
return;
}

loggedIn = true;
userEmail =
user.email ||
"";

}

async function tryRecoverSignedOutSession(
sb
){

if(
isExplicitAuthSignOut()
){
return null;
}

if(
isAuthRefreshBlockedNow()
){
syncCloudLoginFromStorage();
return null;
}

const persistedEarly =
readPersistedAuthSession();

if(
persistedEarly?.expires_at &&
isAccessTokenExpired(
persistedEarly
) &&
!String(
persistedEarly.refresh_token ||
""
).trim()
){
syncCloudLoginFromStorage();
return null;
}

restoreAuthSessionFromBackup();

let restored =
await restoreSessionFromPersisted(
sb
);

if(
restored
){
return restored;
}

const persisted =
readPersistedAuthSession();

if(
!persisted?.access_token ||
!persisted?.user
){
return null;
}

if(
sb
){
restored =
await restoreSessionFromPersisted(
sb
);
}

return restored ||
(
isAccessTokenExpired(
persisted
)
? null
: persisted
);

}

function isAuthKeepaliveTarget(){

if(
isSafariBrowser()
){
return true;
}

return !!(
typeof window !==
"undefined" &&
window.cryptoTerminalDesktop?.isDesktop
);

}

function bindAuthSessionKeepalive(){

/* Standalone Algo Bot lite only — Multichart (incl. Algo page) keeps session alive. */
if(
isAlgoBotLiteShell()
){
return;
}

if(
!isAuthKeepaliveTarget()
){
return;
}

window.addEventListener(
"cloud-auth-refresh-http",
()=>{
authRefreshBlockedUntil =
Math.max(
authRefreshBlockedUntil,
getAuthRefreshBlockedUntil()
);
}
);

const KEEPALIVE_MS =
45 *
60 *
1000;

window.setInterval(
()=>{

if(
document.visibilityState !==
"visible"
){
return;
}

if(
!isCloudLoggedInEffective()
){
void tryCloudAuthRecovery();
return;
}

void refreshAuthSessionSilent();

},
KEEPALIVE_MS
);

window.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState !==
"visible"
){
return;
}

if(
!isCloudLoggedInEffective()
){
void tryCloudAuthRecovery();
return;
}

void refreshAuthSessionSilent();

}
);

}

function isAccessTokenExpired(
session
){

const exp =
Number(
session?.expires_at
) ||
0;

return (
exp >
0 &&
exp *
1000 <
Date.now() -
5000
);

}

/** Refresh before hard expiry so keepalive (45m) keeps Multichart logged in. */
function isAccessTokenNearExpiry(
session,
skewMs =
12 *
60 *
1000
){

const exp =
Number(
session?.expires_at
) ||
0;

if(
!(
exp >
0
)
){
return true;
}

return exp *
1000 <
Date.now() +
skewMs;

}

function hasPersistedRefreshToken(
session
){

return !!String(
session?.refresh_token ||
""
).trim();

}

async function refreshSessionSingleFlight(
sb,
reason
){

if(
refreshSessionInflight
){
return refreshSessionInflight;
}

refreshSessionInflight =
withTimeout(
sb.auth.refreshSession(),
authNetworkTimeoutMs(
reason
),
reason
).finally(
()=>{
refreshSessionInflight =
null;
}
);

return refreshSessionInflight;

}

/** user + refresh или ещё живой access — сессию можно восстановить без «гостя». */
function isRecoverableAuthSession(
session = readPersistedAuthSession()
){

if(
!session?.user?.id ||
isExplicitAuthSignOut()
){
return false;
}

if(
hasPersistedRefreshToken(
session
)
){
return true;
}

return !!(
session.access_token &&
!isAccessTokenExpired(
session
)
);

}

let cloudApiPausedUntil =
0;
let cloudAuthRecoveryAt =
0;

export function isCloudAuthError(
...parts
){

const blob =
parts
.filter(
Boolean
)
.map(
String
)
.join(
" "
);

return (
/JWT expired|PGRST301|PGRST303|invalid jwt|Auth session missing|AuthSessionMissing/i.test(
blob
)
);

}

export function isCloudAuthTokenUsable(){

const persisted =
readPersistedAuthSession();
const snap =
readAlertTokenSync();

const hasUser =
!!(
snap?.user?.id ||
persisted?.user?.id
);
const hasToken =
!!(
snap?.token ||
persisted?.access_token
);

if(
!hasUser ||
!hasToken
){
return false;
}

if(
persisted?.expires_at &&
isAccessTokenExpired(
persisted
)
){
const snapRefresh =
String(
snap?.refresh_token ||
""
).trim();

if(
!hasPersistedRefreshToken(
persisted
) &&
!snapRefresh
){
return false;
}

}

return true;

}

export function isCloudApiUsable(){

return (
isCloudAuthTokenUsable() &&
Date.now() >=
cloudApiPausedUntil
);

}

function syncCloudLoginFromStorage(){

const persisted =
readPersistedAuthSession();
const usable =
isCloudAuthTokenUsable();

if(
usable &&
persisted?.user?.id
){

if(
!loggedIn
){
loggedIn = true;
userEmail =
persisted.user.email ||
userEmail ||
"";
notifyAuth();
}

return true;

}

if(
isRecoverableAuthSession(
persisted
)
){

if(
!loggedIn
){
loggedIn = true;
userEmail =
persisted?.user?.email ||
userEmail ||
"";
notifyAuth();
}

/* Bot lite: never Auth refresh. Blocked: don't keep hammering. */
if(
!isAlgoBotLiteShell() &&
!isAuthRefreshBlockedNow()
){
void refreshAuthSessionSilent();
}

return false;

}

if(
loggedIn
){
loggedIn = false;
userEmail =
persisted?.user?.email ||
userEmail ||
"";
stopCloudSyncHelpers();
notifyAuth();
}

return false;

}

export function pauseCloudApi(
ms =
10 *
60 *
1000
){

cloudApiPausedUntil =
Math.max(
cloudApiPausedUntil,
Date.now() +
ms
);

}

export function resumeCloudApi(){

cloudApiPausedUntil =
0;
cloudAuthRecoveryAt =
0;

}

export async function tryCloudAuthRecovery(){

const now =
Date.now();

if(
now <
cloudAuthRecoveryAt
){
return false;
}

cloudAuthRecoveryAt =
now +
90000;

const ok =
await refreshAuthSessionSilent();

if(
ok
){
resumeCloudApi();
authRefreshBlockedUntil =
getAuthRefreshBlockedUntil();
return true;
}

return false;

}

export function reportCloudAuthFailure(
source,
detail
){

const blob =
`${source} ${detail ?? ""}`;

if(
!isCloudAuthError(
blob
) &&
detail !==
401
){
return false;
}

pauseCloudApi(
15 *
60 *
1000
);

if(
!isCloudAuthTokenUsable()
){
blockAuthRefreshRetries(
String(
source
)
);
}else{
warnAuthOnce(
"cloud-auth-degraded",
`[cloud] ${source} — синхронизация приостановлена`
);
}

void tryCloudAuthRecovery();

return true;

}

/**
 * Восстановить сессию из localStorage (refresh после истечения access — типично на iPad).
 */
async function restoreSessionFromPersisted(
sb
){

if(
isAuthRefreshBlockedNow()
){
return null;
}

const persisted =
readPersistedAuthSession();

if(
!persisted?.access_token ||
!persisted?.user
){
return null;
}

const refresh =
String(
persisted.refresh_token ||
""
).trim();

if(
isAccessTokenExpired(
persisted
) &&
!refresh
){
return null;
}

if(
!sb
){
return persisted;
}

/* Algo Bot: never hit Auth setSession/refresh on boot — use local JWT. */
if(
isAlgoBotLiteShell()
){
return isAccessTokenExpired(
persisted
)
? null
: persisted;
}

if(
!isAccessTokenExpired(
persisted
)
){

try{
const { data, error } =
await withTimeout(
sb.auth.setSession({
access_token: persisted.access_token,
refresh_token: refresh
}),
authNetworkTimeoutMs(
"setSession restore"
),
"setSession restore"
);

if(
error
){
classifyAndBlockAuthRefreshFailure(
"restore setSession",
error
);
return null;
}else if(
data?.session
){
authRateLimitStrikes =
0;
clearCloudAuthProblem();
return data.session;
}
}catch(
err
){
classifyAndBlockAuthRefreshFailure(
"restore setSession",
err
);
return null;

}

return persisted;

}

if(
refresh
){
try{
const { data, error } =
await refreshSessionSingleFlight(
sb,
"refreshSession restore"
);

if(
error
){
classifyAndBlockAuthRefreshFailure(
"refreshSession",
error
);
return null;
}

authRateLimitStrikes =
0;
clearCloudAuthProblem();
return data?.session ?? null;
}catch(
err
){
classifyAndBlockAuthRefreshFailure(
"refreshSession",
err
);
return null;

}
}

return isAccessTokenExpired(
persisted
)
? null
: persisted;

}

async function refreshAuthSessionSilent(){

if(
isAlgoBotLiteShell()
){
return false;
}

if(
isAuthRefreshBlockedNow()
){
return false;
}

try{
const snap =
readPersistedAuthSession();

if(
snap?.user?.id &&
!String(
snap.refresh_token ||
""
).trim()
){
await restoreDesktopAuthSession();
}
}catch{
/* ignore heal errors */
}

const now =
Date.now();

if(
now <
authRefreshBlockedUntil
){
return false;
}

if(
now -
lastSilentRefreshMs <
SILENT_REFRESH_MIN_MS
){
return false;
}

if(
!isCloudLoggedInEffective()
){

const persistedLogin =
readPersistedAuthSession();

if(
!persistedLogin?.user?.id
){
return false;
}

if(
persistedLogin?.access_token &&
!isAccessTokenNearExpiry(
persistedLogin
)
){
return false;
}

if(
!String(
persistedLogin.refresh_token ||
""
).trim()
){
syncCloudLoginFromStorage();
return false;
}

}

const persisted =
readPersistedAuthSession();

if(
persisted?.access_token &&
!isAccessTokenNearExpiry(
persisted
)
){
return false;
}

lastSilentRefreshMs =
now;

const sb =
await getSupabase();

if(
!sb
){
return false;
}

try{
const { data, error } =
await refreshSessionSingleFlight(
sb,
"refreshSession silent"
);

if(
error
){
try{
restoreAuthSessionFromBackup();
await restoreDesktopAuthSession();
}catch{
/* heal best-effort */
}

classifyAndBlockAuthRefreshFailure(
"silent refresh",
error,
{
allowFatalClear:
false
}
);
return false;
}

if(
!data?.session
){
return false;
}

await applySession(
data.session
);
authRateLimitStrikes =
0;
clearCloudAuthProblem();
syncCloudLoginFromStorage();
void maybeAutoPushSessionToLanBot();
return true;
}catch(
err
){
try{
restoreAuthSessionFromBackup();
await restoreDesktopAuthSession();
}catch{
/* heal best-effort */
}

classifyAndBlockAuthRefreshFailure(
"silent refresh",
err,
{
allowFatalClear:
false
}
);
return false;

}

}

/**
 * After Multichart rotates JWT, push fresh session to LAN Algo Bot so the
 * bot does not need its own Auth refresh (shared refresh_token).
 *
 * Temporary: disabled — Algo Bot login / session share is off.
 */
/**
 * Bot cloud session auto-push — disabled (LAN auth session not used).
 */
async function maybeAutoPushSessionToLanBot(){

return;

}

const favoritesListeners = new Set();
const drawingsListeners = new Set();

let settingsChannel = null;
let realtimeUserId = null;
let syncPollTimer = null;
let realtimeReconnectTimer = null;
let drawingsPushTimer = null;
let pendingDrawingsCloudPush = false;

const SYNC_POLL_MS = 30000;
const DRAWINGS_PUSH_DEBOUNCE_MS = 250;

const flushAuthListeners =
createNotifyDebouncer(
400
);

function notifyAuth(){

flushAuthListeners(
()=>{

authListeners.forEach(
fn=>{

try{
fn();
}catch{
/* ignore */
}

}
);

}
);

}

function notifyFavorites(){

favoritesListeners.forEach(fn=>{

try{
fn();
}catch{
/* ignore */
}

});

}

export function notifyFavoritesListeners(){

notifyFavorites();

}

export function onCloudSyncChange(fn){

authListeners.add(fn);

return ()=>{
authListeners.delete(fn);
};

}

export function onFavoritesRemoteUpdate(fn){

favoritesListeners.add(fn);

return ()=>{
favoritesListeners.delete(fn);
};

}

export function onDrawingsRemoteUpdate(fn){

drawingsListeners.add(fn);

return ()=>{
drawingsListeners.delete(fn);
};

}

export function notifyDrawings(symbols){

drawingsListeners.forEach(fn=>{

try{
fn(symbols);
}catch{
/* ignore */
}

});

}

export function isCloudSyncEnabled(){

return configured;

}

export function isCloudLoggedIn(){

return configured && loggedIn;

}

export function getCloudUserEmail(){

return userEmail;

}

function loadLocalFavoritesUpdatedAt(
exchangeId = getActiveExchangeId()
){

return loadFavoritesCloudUpdatedAt(
exchangeId
);

}

function saveLocalFavoritesUpdatedAt(
iso,
exchangeId = getActiveExchangeId()
){

saveFavoritesCloudUpdatedAt(
iso,
exchangeId
);

}

function loadLocalDrawingsUpdatedAt(){

return localStorage.getItem(
DRAWINGS_LOCAL_TS_KEY
) || "";

}

function saveLocalDrawingsUpdatedAt(iso){

if(!iso){
localStorage.removeItem(
DRAWINGS_LOCAL_TS_KEY
);
return;
}

localStorage.setItem(
DRAWINGS_LOCAL_TS_KEY,
iso
);

}

/** Локальное изменение рисунков — чтобы sync не перезаписал облаком. */
export function bumpDrawingsLocalRevision(){

saveLocalDrawingsUpdatedAt(
new Date().toISOString()
);

}

function normalizeFavoritesList(list){

if(!Array.isArray(list)){
return [];
}

return list.filter(s=>typeof s === "string");

}

function tsMs(iso){

if(!iso){
return 0;
}

const n =
Date.parse(iso);

return Number.isFinite(n) ? n : 0;

}

function isTsNewer(a, b){

return tsMs(a) > tsMs(b);

}

function saveFavoritesSyncedSignature(
groups,
exchangeId = getActiveExchangeId()
){

saveFavoritesCloudSyncedSignature(
groups,
exchangeId
);

}

function hasUnsyncedFavorites(
exchangeId = getActiveExchangeId()
){

return hasUnsyncedFavoritesCloud(
exchangeId
);

}

function saveDrawingsSyncedSignature(
snap
){

localStorage.setItem(
DRAWINGS_SYNCED_SIG_KEY,
drawingsFullSignature(
snap
)
);

}

function drawingsSyncSnapshot(){

return {
shapes: collectAllLocalDrawings(),
tombstones: loadLocalTombstones()
};

}

function drawingsFullSignature(
snap
){

const s =
snap ||
drawingsSyncSnapshot();

return (
drawingsSignature(
s.shapes
) +
"\n@" +
JSON.stringify(
s.tombstones || {}
)
);

}

function hasUnsyncedDrawings(){

return drawingsFullSignature() !== (
localStorage.getItem(
DRAWINGS_SYNCED_SIG_KEY
) || ""
);

}

export function scheduleDrawingsCloudPush(){
}

export function flushDrawingsCloudPush(){
return Promise.resolve();
}

function normalizeDrawingsMap(raw){

if(
!raw ||
typeof raw !== "object" ||
Array.isArray(raw)
){
return {};
}

const out = {};

for(const [sym, list] of Object.entries(raw)){

if(
typeof sym !== "string" ||
!sym ||
!Array.isArray(list)
){
continue;
}

out[sym] = list;

}

return out;

}

function drawingsSignature(map){

return Object.keys(map)
.sort()
.map(sym=>`${sym}:${JSON.stringify(map[sym])}`)
.join("\n");

}

function drawingsMapsEqual(a, b){

return drawingsSignature(a) ===
drawingsSignature(b);

}

async function fetchUserSettings(sb, userId){

const { data, error } =
await sb
.from("user_settings")
.select(
"favorites, updated_at, drawings, drawings_updated_at"
)
.eq("user_id", userId)
.maybeSingle();

if(error){
console.warn(
"cloud settings load:",
error.message
);
return null;
}

if(!data){
return null;
}

const unpacked =
unpackCloudDrawings(
data.drawings
);

return {
favorites: normalizeFavoritesList(
data.favorites
),
updatedAt: data.updated_at || "",
drawings: unpacked.shapes,
drawingsTombstones: unpacked.tombstones,
drawingsUpdatedAt:
data.drawings_updated_at || ""
};

}

async function pushCloudFavorites(
sb,
userId,
favorites
){

const { data, error } =
await sb
.from("user_settings")
.upsert({
user_id: userId,
favorites,
updated_at: new Date().toISOString()
})
.select("updated_at")
.single();

if(error){
console.warn(
"cloud favorites save:",
error.message
);
return null;
}

return data?.updated_at || null;

}

async function pushCloudDrawings(
sb,
userId,
drawings
){

const { data, error } =
await sb
.from("user_settings")
.upsert({
user_id: userId,
drawings,
drawings_updated_at: new Date().toISOString()
})
.select("drawings_updated_at")
.single();

if(error){
console.warn(
"cloud drawings save:",
error.message
);
return null;
}

return data?.drawings_updated_at || null;

}

async function getAuthedClient(){

if(
isAlgoBotLiteShell()
){
return null;
}

const sb =
await getSupabase();

if(
!sb ||
!loggedIn
){
return null;
}

const { data: { session } } =
await sb.auth.getSession();

if(!session?.user){
return null;
}

return { sb, user: session.user };

}

function applyFavoritesLocally(
favoritesList,
updatedAt,
exchangeId = getActiveExchangeId()
){

saveFavoritesGroups(
favoritesFromCloudList(favoritesList),
exchangeId
);

if(updatedAt){
saveLocalFavoritesUpdatedAt(
updatedAt,
exchangeId
);
}

saveFavoritesSyncedSignature(
loadFavoritesGroups(
exchangeId
),
exchangeId
);

notifyFavorites();

}

async function applyAlertFlagsToDrawingsMap(map){

return map;

}

async function applyDrawingsLocally(
drawings,
tombstones,
updatedAt
){

const before =
collectAllLocalDrawings();

const shapes =
await applyAlertFlagsToDrawingsMap(
drawings
);

applyDrawingsMapToLocal(
shapes
);

saveLocalTombstones(
mergeTombstoneMaps(
loadLocalTombstones(),
tombstones ||
{}
)
);

const changed =
new Set([
...Object.keys(
before
),
...Object.keys(
shapes
)
]);

if(updatedAt){
saveLocalDrawingsUpdatedAt(updatedAt);
}

saveDrawingsSyncedSignature(
drawingsSyncSnapshot()
);

notifyDrawings(
Array.from(changed)
);

return shapes;

}

function stopSyncPoll(){

if(!syncPollTimer){
return;
}

clearInterval(syncPollTimer);
syncPollTimer = null;

}

function startSyncPoll(){

/* Algo Bot: не крутим Multichart settings/favorites poll. */
if(
isAlgoBotLiteShell()
){
stopSyncPoll();
return;
}

stopSyncPoll();

syncPollTimer = setInterval(()=>{

if(
!loggedIn
){
return;
}

pullRemoteSettingsIfNewer();

},
scaleSupabasePollMs(
SYNC_POLL_MS
)
);

}

function teardownSettingsRealtime(){

if(!settingsChannel){
return;
}

const ch =
settingsChannel;

settingsChannel = null;

ch.unsubscribe();

}

function stopCloudSyncHelpers(){

stopSyncPoll();

if(realtimeReconnectTimer){
clearTimeout(realtimeReconnectTimer);
realtimeReconnectTimer = null;
}

teardownSettingsRealtime();
realtimeUserId = null;

}

function scheduleRealtimeReconnect(){

if(
realtimeReconnectTimer ||
!isCloudAuthTokenUsable() ||
Date.now() <
cloudApiPausedUntil
){
return;
}

realtimeReconnectTimer = setTimeout(async()=>{

realtimeReconnectTimer = null;

if(
!loggedIn ||
!realtimeUserId
){
return;
}

await setupSettingsRealtime(
realtimeUserId
);

},
2000);

}

async function refreshCloudConnection(){

if(
!loggedIn
){
return;
}

if(
!isCloudAuthTokenUsable()
){
void tryCloudAuthRecovery();
return;
}

await pullRemoteSettingsIfNewer();

if(realtimeUserId){
await setupSettingsRealtime(
realtimeUserId
);
}

}

function handleRealtimeFavoritesRow(row){

if(
isFavoritesCloudDisabled() ||
isFavoritesAutoCloudDisabled()
){
return;
}

void import("./favorites-cloud-sync.js?v=7").then(
m=>{
m.applyFavoritesFromRealtimeRow(
row
);
}
).catch(
()=>{

if(
!row
){
return;
}

applyFavoritesLocally(
normalizeFavoritesList(
row.favorites
),
row.updated_at ||
""
);

}
);

}

function handleRealtimeSettingsRow(row){

handleRealtimeFavoritesRow(row);

}

async function setupSettingsRealtime(userId){

if(
isSupabaseRealtimeDisabled()
){
return;
}

const sb =
await getSupabase();

if(
!sb ||
!userId
){
return;
}

realtimeUserId = userId;

teardownSettingsRealtime();

const channel =
sb
.channel(
`user_settings:${userId}`,
{
config:{
broadcast:{
self: false
}
}
}
)
.on(
"postgres_changes",
{
event: "UPDATE",
schema: "public",
table: "user_settings",
filter: `user_id=eq.${userId}`
},
payload=>{
handleRealtimeSettingsRow(
payload.new
);
}
)
.on(
"postgres_changes",
{
event: "INSERT",
schema: "public",
table: "user_settings",
filter: `user_id=eq.${userId}`
},
payload=>{
handleRealtimeSettingsRow(
payload.new
);
}
)
.subscribe(status=>{

if(status === "SUBSCRIBED"){
return;
}

if(status === "CLOSED"){
return;
}

if(
status === "CHANNEL_ERROR" ||
status === "TIMED_OUT"
){

if(
!isCloudAuthTokenUsable()
){
reportCloudAuthFailure(
"realtime",
status
);
return;
}

warnAuthOnce(
"settings-realtime",
`settings realtime: ${status}`
);
scheduleRealtimeReconnect();
}

});

settingsChannel = channel;

}

/** Слияние по updated_at — побеждает последнее изменение (в т.ч. пустой список). */
export async function mergeFavoritesWithCloud(){

const m =
await import("./favorites-cloud-sync.js?v=7");

return m.reconcileLocalFavoritesWithCloud();

}

/** Подтянуть с другого устройства (вкладка / refresh). */
export async function pullFavoritesIfCloudNewer(){

const m =
await import("./favorites-cloud-sync.js?v=7");

await m.pullFavoritesFromCloudNow();
return favoritesToCloudList(
loadFavoritesGroups()
);

}

export async function mergeDrawingsWithCloud(){

return collectAllLocalDrawings();

}

export async function pullDrawingsIfCloudNewer(){

return collectAllLocalDrawings();

}

async function syncFavoritesWithCloud(){

const m =
await import("./favorites-cloud-sync.js?v=7");

await m.reconcileLocalFavoritesWithCloud();

}

export async function pullRemoteSettingsIfNewer(){

if(
!isFavoritesAutoCloudDisabled() &&
!isFavoritesCloudDisabled()
){
await syncFavoritesWithCloud();
}

}

export async function persistAllDrawingsToCloud(){

return flushDrawingsCloudPush();

}

export async function persistFavoritesToCloud(
favorites
){

if(
isFavoritesAutoCloudDisabled()
){
return;
}

const m =
await import("./favorites-cloud-sync.js?v=7");

m.pushFavoritesAfterLocalEdit(
favorites
);

}

export function buildAuthRedirectUrl(){

const origin =
window.location.origin;
let path =
window.location.pathname || "/";

if(
path.endsWith("/screener.html")
){
path =
path.slice(
0,
-"/screener.html".length
) || "/";
}

return `${origin}${path}`;

}

const DESKTOP_AUTH_CALLBACK =
"multichart://auth/callback";

const DESKTOP_AUTH_DEEP_LINK_MIN =
"1.0.6";

function parseAppSemver(
version
){

const parts =
String(
version ||
"0"
).split(
"."
).map(
n=>
parseInt(
n,
10
) ||
0
);

return {
major:
parts[
0
] ||
0,
minor:
parts[
1
] ||
0,
patch:
parts[
2
] ||
0
};

}

function isAtLeastAppVersion(
version,
minVersion
){

const a =
parseAppSemver(
version
);
const b =
parseAppSemver(
minVersion
);

if(
a.major !==
b.major
){
return a.major >
b.major;
}

if(
a.minor !==
b.minor
){
return a.minor >
b.minor;
}

return a.patch >=
b.patch;

}

export async function buildAuthRedirectUrlAsync(){

const desktop =
window.cryptoTerminalDesktop;

if(
desktop?.isDesktop
){

try{
const info =
await desktop.getVersion();

if(
isAtLeastAppVersion(
info?.app,
DESKTOP_AUTH_DEEP_LINK_MIN
)
){
return DESKTOP_AUTH_CALLBACK;
}

if(
info?.bundledUi
){
return DESKTOP_AUTH_CALLBACK;
}

const origin =
info?.apiOrigin
? new URL(
info.apiOrigin
).origin
: info?.url && !String(
info.url
).startsWith(
"multichart:"
)
? new URL(
info.url
).origin
: "https://crypto-terminal-v2.vercel.app";

return `${origin}/`;

}catch{
return DESKTOP_AUTH_CALLBACK;
}

}

return buildAuthRedirectUrl();

}

function hasAuthCallbackInParts(
search,
hash
){

return (
(hash ||
"").includes(
"access_token="
) ||
(hash ||
"").includes(
"error="
) ||
(search ||
"").includes(
"code="
) ||
(search ||
"").includes(
"token_hash="
) ||
(
(search ||
"").includes(
"token="
) &&
(search ||
"").includes(
"type="
)
)
);

}

function parseEmailVerifyParams(
rawUrl
){

try{

const parsed =
new URL(
String(
rawUrl ||
""
).trim()
);
const params =
parsed.searchParams;
const tokenHash =
String(
params.get(
"token_hash"
) ||
""
).trim();
const token =
String(
params.get(
"token"
) ||
""
).trim();
const type =
String(
params.get(
"type"
) ||
"magiclink"
).trim() ||
"magiclink";
const path =
parsed.pathname ||
"";
const isVerifyPath =
/\/auth\/v1\/verify\/?$/i.test(
path
) ||
path.includes(
"/auth/v1/verify"
);

if(
tokenHash
){
return {
token_hash:
tokenHash,
type
};
}

/*
  Classic magic-link from email: …/auth/v1/verify?token=…&type=magiclink
  GoTrue token here is the token_hash for verifyOtp.
*/
if(
(
isVerifyPath ||
parsed.hostname.includes(
"supabase"
)
) &&
token
){
return {
token_hash:
token,
type
};
}

}catch{
/* ignore */
}

return null;

}

/**
 * Exchange email magic-link verify URL (token= / token_hash=) for a session.
 * Needed when the user copies the link from mail without opening a browser.
 */
async function recoverSessionFromEmailVerifyLink(
sb,
rawUrl,
onProgress
){

const report =
msg=>{

if(
typeof onProgress ===
"function"
){

try{
onProgress(
msg
);
}catch{
/* ignore */
}

}

};

const parsed =
parseEmailVerifyParams(
rawUrl
);

if(
!sb ||
!parsed?.token_hash
){
return null;
}

report(
"Подтверждаем ссылку из письма…"
);

const typeCandidates =
[
parsed.type,
parsed.type ===
"magiclink"
? "email"
: "magiclink",
"email"
].filter(
(
value,
index,
arr
)=>
value &&
arr.indexOf(
value
) ===
index
);

let lastError =
"";

for(
const type of typeCandidates
){

try{

const {
data,
error
} =
await withTimeout(
sb.auth.verifyOtp({
token_hash:
parsed.token_hash,
type
}),
20000,
"verifyOtp email link"
);

if(
error
){
lastError =
error.message ||
String(
error
);
continue;
}

if(
data?.session
){
return data.session;
}

}catch(
err
){
lastError =
err?.message ||
String(
err
);
}

}

if(
lastError
){
console.warn(
"[auth] verifyOtp email link:",
lastError
);
}

return null;

}

export function hasAuthCallbackInUrl(
rawUrl
){

if(
rawUrl
){

try{
const parsed =
new URL(
String(
rawUrl
).trim()
);
return hasAuthCallbackInParts(
parsed.search,
parsed.hash
);
}catch{
return false;
}

}

return hasAuthCallbackInParts(
window.location.search,
window.location.hash
);

}

function clearAuthCallbackFromUrl(){

if(
!hasAuthCallbackInUrl()
){
return;
}

const clean =
`${window.location.pathname || "/"}${window.location.search || ""}`;

history.replaceState(
null,
"",
clean
);

}

function readAuthHashParams(
hashFromUrl
){

const raw =
(
hashFromUrl !==
undefined
? hashFromUrl
: window.location.hash ||
""
).replace(
/^#/,
""
);

if(!raw){
return null;
}

const params =
new URLSearchParams(raw);

const access_token =
params.get("access_token");

if(!access_token){
return {
error:
params.get("error_description") ||
params.get("error") ||
""
};
}

return {
access_token,
refresh_token:
params.get("refresh_token") || "",
error: ""
};

}

async function recoverSessionFromAuthUrl(
sb,
rawUrl,
onProgress
){

const report =
msg=>{

if(
typeof onProgress ===
"function"
){

try{
onProgress(
msg
);
}catch{
/* ignore */
}

}

};

let search =
"";
let hash =
"";

if(
rawUrl
){

try{
const parsed =
new URL(
String(
rawUrl
).trim()
);
search =
parsed.search ||
"";
hash =
parsed.hash ||
"";
}catch{
return null;
}

}else{
search =
window.location.search ||
"";
hash =
window.location.hash ||
"";
}

if(
!sb ||
!hasAuthCallbackInParts(
search,
hash
)
){
return null;
}

const fromExternal =
!!rawUrl;

const searchParams =
new URLSearchParams(
search
);
const code =
searchParams.get("code");

if(code){

report(
"Обрабатываем ссылку…"
);

const { data, error } =
await sb.auth.exchangeCodeForSession(code);

if(error){
console.warn(
"[auth] exchangeCodeForSession:",
error.message
);
return null;
}

if(
!fromExternal
){
clearAuthCallbackFromUrl();
}

return data.session || null;

}

const hashParams =
readAuthHashParams(
hash
);

if(
hashParams?.error
){
console.warn(
"[auth] magic link:",
hashParams.error
);
if(
!fromExternal
){
clearAuthCallbackFromUrl();
}
return null;
}

if(
!hashParams?.access_token
){
return null;
}

report(
"Обрабатываем ссылку…"
);

async function trySetSession(){

const { data, error } =
await sb.auth.setSession({
access_token: hashParams.access_token,
refresh_token: hashParams.refresh_token
});

if(error){
throw error;
}

return data.session || null;

}

try{

const session =
await trySetSession();

if(
session &&
!fromExternal
){
clearAuthCallbackFromUrl();
}

return session;

}catch(err){

console.warn(
"[auth] setSession from hash:",
err?.message || err
);

try{
localStorage.removeItem(
SUPABASE_AUTH_STORAGE_KEY
);
}catch{
/* ignore */
}

try{

const session =
await trySetSession();

if(
session &&
!fromExternal
){
clearAuthCallbackFromUrl();
}

return session;

}catch(retryErr){
console.warn(
"[auth] setSession retry:",
retryErr?.message || retryErr
);
return null;
}

}

}

export async function completeAuthFromCallbackUrl(
rawUrl,
options =
{}
){

const onProgress =
typeof options?.onProgress ===
"function"
? options.onProgress
: null;

const report =
msg=>{

if(
!onProgress
){
return;
}

try{
onProgress(
msg
);
}catch{
/* ignore */
}

};

if(
!rawUrl ||
typeof rawUrl !==
"string"
){
return {
ok:
false,
message:
"Пустая ссылка"
};
}

const trimmed =
rawUrl.trim();

report(
"Проверяем ссылку…"
);

if(
!(await isSupabaseConfigured())
){
return {
ok:
false,
message:
"Supabase не настроен"
};
}

const sb =
await getSupabase();

if(
!sb
){
return {
ok:
false,
message:
"Supabase недоступен"
};
}

let recovered =
null;

if(
parseEmailVerifyParams(
trimmed
)
){
recovered =
await recoverSessionFromEmailVerifyLink(
sb,
trimmed,
onProgress
);
}

if(
!recovered &&
hasAuthCallbackInUrl(
trimmed
)
){
recovered =
await recoverSessionFromAuthUrl(
sb,
trimmed,
onProgress
);
}

if(
!recovered &&
!hasAuthCallbackInUrl(
trimmed
) &&
!parseEmailVerifyParams(
trimmed
)
){
return {
ok:
false,
message:
"В ссылке нет данных для входа. Вставьте ссылку из письма целиком или URL с code= / access_token=."
};
}

if(
!recovered
){
return {
ok:
false,
message:
"Ссылка устарела или уже использована. Запросите новую."
};
}

report(
"Сверяемся с базой данных…"
);

await applySession(
recovered
);

report(
"Вход выполнен"
);

return {
ok:
true
};

}

export async function recoverAuthSessionFromUrl(){

if(
!(await isSupabaseConfigured())
){
return false;
}

const sb =
await getSupabase();

if(!sb){
return false;
}

const recovered =
await recoverSessionFromAuthUrl(sb);

if(
!recovered
){
return false;
}

await applySession(recovered);
return true;

}

export async function signInWithEmailOtp(email){

const sb =
await getSupabase();

if(!sb){
throw new Error("Supabase не настроен");
}

const redirectTo =
await buildAuthRedirectUrlAsync();

const { error } =
await sb.auth.signInWithOtp({
email,
options:{
emailRedirectTo: redirectTo,
shouldCreateUser: true
}
});

if(error){
throw error;
}

return redirectTo;

}

/**
 * Multichart: refresh JWT before LAN/paste transfer so Algo Bot lite
 * (no Auth refresh) receives a still-valid access_token.
 * If Auth refresh is circuit-broken, still allow transfer of a non-expired
 * access_token (do not block «Отдать сессию» on rate-limit alone).
 * @returns {Promise<void>}
 */
async function ensureFreshAuthSessionForTransfer(){

if(
isAlgoBotLiteShell()
){
return;
}

const persisted =
readPersistedAuthSession();

if(
!persisted?.access_token
){
return;
}

const transferSkewMs =
30 *
60 *
1000;
const expired =
isAccessTokenExpired(
persisted
);
const near =
isAccessTokenNearExpiry(
persisted,
transferSkewMs
);

if(
!expired &&
!near
){
return;
}

if(
isAuthRefreshBlockedNow()
){
if(
!expired
){
/* Live access_token still usable — push it; skip Auth refresh. */
return;
}

throw new Error(
"Auth на Multichart временно заблокирован (rate limit). Подождите несколько минут или войдите снова, затем «Отдать сессию»."
);
}

const refresh =
String(
persisted.refresh_token ||
""
).trim();

if(
!refresh
){
if(
expired
){
throw new Error(
"Сессия Multichart истекла и нет refresh — войдите в аккаунт снова, затем «Отдать сессию»."
);
}

return;
}

const sb =
await getSupabase();

if(
!sb
){
if(
expired
){
throw new Error(
"Не удалось обновить сессию (нет Supabase). Войдите снова."
);
}

return;
}

try{
const {
data,
error
} =
await refreshSessionSingleFlight(
sb,
"refreshSession transfer"
);

if(
error
){
classifyAndBlockAuthRefreshFailure(
"transfer refresh",
error
);
throw new Error(
error.message ||
"Не удалось обновить сессию перед отправкой на бот. Войдите снова."
);
}

if(
!data?.session?.access_token
){
throw new Error(
"Не удалось обновить сессию перед отправкой на бот. Войдите снова."
);
}

await applySession(
data.session
);
authRateLimitStrikes =
0;
clearCloudAuthProblem();
}catch(
err
){
if(
/Auth на Multichart|Сессия Multichart|Не удалось обновить/i.test(
String(
err?.message ||
""
)
)
){
throw err;
}

classifyAndBlockAuthRefreshFailure(
"transfer refresh",
err
);
throw new Error(
err?.message ||
"Не удалось обновить сессию перед отправкой на бот. Войдите снова."
);
}

}

/**
 * Multichart → clipboard / LAN string for Algo Bot.
 * Refreshes access_token first — bot lite cannot refresh Auth itself.
 * @returns {Promise<string>}
 */
export async function exportAuthSessionTransferString(){

await ensureFreshAuthSessionForTransfer();

let raw =
readAuthSessionRaw();

if(
!raw
){
const api =
window.cryptoTerminalDesktop;

try{
const result =
await api?.loadAuthSession?.();

if(
typeof result?.raw ===
"string" &&
result.raw.trim()
){
raw =
result.raw.trim();
}
}catch{
/* ignore */
}
}

if(
!raw
){
const session =
readPersistedAuthSession();

if(
session?.access_token
){
raw =
JSON.stringify(
session
);
}
}

if(
!raw
){
throw new Error(
"Нет активной сессии. Войдите в аккаунт Multichart."
);
}

const checkSession =
readPersistedAuthSession() ||
(()=>{
try{
const data =
JSON.parse(
raw
);

return data?.access_token
? data
: (
data?.currentSession ||
data?.session ||
null
);
}catch{
return null;
}
})();

if(
isAccessTokenExpired(
checkSession
)
){
throw new Error(
"Сессия Multichart истекла — войдите снова, затем «Отдать сессию»."
);
}

return encodeAuthSessionTransfer(
raw
);

}

/**
 * Local login from a pasted Multichart JWT — no Auth network required.
 * setSession may hang/fail on servers; alerts only need tokens in storage + cache.
 */
async function applyImportedAuthSessionLocally(
session,
sb = null
){

if(
!session?.access_token ||
!session?.user
){
return false;
}

configured =
true;
loggedIn =
true;
userEmail =
session.user?.email ||
userEmail ||
"";
lastAppliedSessionKey =
session.user?.id
? `${session.user.id}:${session.access_token}`
: lastAppliedSessionKey;

try{

const {
warmAlertAuthCache
} =
await import(
"./alert-auth-cache.js?v=7"
);

warmAlertAuthCache(
{
sb,
user:
session.user
},
session
);

}catch(
err
){
console.warn(
"[auth] warmAlertAuthCache import:",
err?.message ||
err
);
}

notifyAuth();
return true;

}

/**
 * Algo Bot: after LAN file heal — apply localStorage session into UI state.
 * @returns {Promise<boolean>}
 */
export async function applyPersistedAuthSessionNow(){

const session =
readPersistedAuthSession();

if(
!session?.user?.id ||
!session?.access_token
){
return false;
}

await applyImportedAuthSessionLocally(
session,
null
);

if(
isAccessTokenExpired(
session
)
){
publishCloudAuthProblem(
"expired",
"Облачная сессия истекла — «Отдать сессию» с Multichart."
);
return false;
}

clearCloudAuthProblem();
return true;

}

/**
 * Algo Bot: paste Multichart session string → localStorage + desktop file + supabase client.
 * On slow/blocked networks (servers) setSession may hang — tokens are applied locally first.
 * @param {string} input
 * @returns {Promise<{ ok: boolean, email?: string, message: string }>}
 */
export async function importAuthSessionTransferString(
input
){

let decoded;

try{
decoded =
decodeAuthSessionTransfer(
input
);
}catch(
err
){
return {
ok:
false,
message:
err?.message ||
"Некорректная строка сессии."
};
}

clearAuthRefreshBlock();
authRefreshBlockedUntil =
0;
authRateLimitStrikes =
0;
clearCloudAuthProblem();
clearExplicitAuthSignOut();
resumeCloudApi();

if(
!persistAuthSessionRaw(
decoded.raw
)
){
return {
ok:
false,
message:
"Не удалось сохранить сессию локально."
};
}

const sb =
await (async()=>{
try{
return await withTimeout(
getSupabase(),
isAlgoBotLiteShell()
? 4000
: 12000,
"getSupabase import"
);
}catch(
err
){
console.warn(
"[auth] getSupabase import:",
err?.message ||
err
);
return null;
}
})();

if(
!sb &&
!isAlgoBotLiteShell()
){
return {
ok:
false,
message:
"Облако недоступно: нет ключей Supabase."
};
}

/*
  Valid pasted JWT is enough for login/alerts. Network setSession is best-effort only —
  never clear local login when Auth API times out or is blocked on the server.
  Algo Bot on VPS: skip Auth setSession — it can hang for minutes behind a stalled lock.
*/
await applyImportedAuthSessionLocally(
decoded.session,
sb
);

let networkNote =
"";

if(
!isAlgoBotLiteShell()
){

try{

const {
data,
error
} =
await withTimeout(
sb.auth.setSession({
access_token:
decoded.session.access_token,
refresh_token:
decoded.session.refresh_token ||
""
}),
8000,
"setSession import"
);

if(
error
){
networkNote =
error.message ||
"сеть";
console.warn(
"[auth] setSession import:",
networkNote
);
}else if(
data?.session?.access_token
){
persistAuthSessionRaw(
normalizeAuthSessionRaw(
data.session
)
);
await applyImportedAuthSessionLocally(
{
...decoded.session,
...data.session,
user:
data.session.user ||
decoded.session.user
},
sb
);
}

}catch(
err
){
networkNote =
err?.message ||
"таймаут сети";
console.warn(
"[auth] setSession import:",
networkNote
);
}

}

/*
  setSession can race and wipe storage after a timeout — re-apply paste payload.
*/
persistAuthSessionRaw(
decoded.raw
);
await applyImportedAuthSessionLocally(
decoded.session,
sb
);

if(
!decoded.session?.user ||
!decoded.session?.access_token
){
return {
ok:
false,
message:
"Сессия сохранена, но вход не подтверждён. Проверьте строку."
};
}

if(
isAccessTokenExpired(
decoded.session
)
){
publishCloudAuthProblem(
"expired",
"Облачная сессия истекла — «Отдать сессию» с Multichart."
);
return {
ok:
false,
message:
"Сессия уже истекла (access_token). В Multichart войдите снова / обновите сессию, затем снова «Отдать сессию»."
};
}

clearCloudAuthProblem();

const email =
userEmail ||
decoded.session.user?.email ||
"";

let message =
`Вошли: ${email || "аккаунт"}`;

if(
networkNote &&
/timeout|failed to fetch|network|сеть|таймаут/i.test(
networkNote
)
){
message +=
" (сессия сохранена локально; облако ответило медленно или недоступно)";
}

return {
ok:
true,
email,
message
};

}

export async function signOutCloud(){

markExplicitAuthSignOut();

loggedIn = false;
userEmail = "";

try{

const keys = [];

for(
let i = 0;
i < localStorage.length;
i++
){

const key =
localStorage.key(i);

if(
key?.startsWith("sb-") &&
key.endsWith("-auth-token")
){
keys.push(key);
}

}

keys.forEach(k=>{
localStorage.removeItem(k);
});

localStorage.removeItem(
SUPABASE_AUTH_STORAGE_KEY
);

const localKeys = [];

for(
let i = 0;
i < localStorage.length;
i++
){

const key =
localStorage.key(i);

if(
key?.startsWith("drawings_") ||
key === "price_alerts_v1" ||
key === "price_alerts_history_v1"
){
localKeys.push(key);
}

}

localKeys.forEach(k=>{
localStorage.removeItem(k);
});

}catch{
/* ignore */
}

const { clearAlertAuthCache } =
await import("./alert-auth-cache.js?v=7");

clearAlertAuthCache();

stopCloudSyncHelpers();
notifyAuth();

try{

const sb =
await withTimeout(
getSupabase(),
4000,
"getSupabase signOut"
);

if(
sb
){
await withTimeout(
sb.auth.signOut(),
4000,
"signOut"
);
}

}catch(err){
console.warn(
"signOut:",
err?.message || err
);
}

}

export function isCloudLoggedInEffective(){

return (
isCloudAuthTokenUsable() &&
(
isCloudLoggedIn() ||
!!readAlertTokenSync()?.user?.id
)
);

}

export function getEffectiveCloudUserEmail(){

return (
userEmail ||
readAlertTokenSync()?.user?.email ||
""
);

}

export async function ensureCloudLoginResolved(
maxWaitMs = 12000
){

if(
isCloudLoggedIn()
){
return true;
}

await waitForCloudAuth(
maxWaitMs
);

if(
isCloudLoggedIn()
){
return true;
}

const cached =
readPersistedAuthSession() ||
readAlertTokenSync();

if(
!cached?.access_token ||
!cached?.user
){
return false;
}

const sb =
await getSupabase();

let session =
cached;

if(
sb
){
session =
await restoreSessionFromPersisted(
sb
) ||
session;
}

await applySession(
session
);

return loggedIn;

}

async function applySession(session){

if(
session?.refresh_token
){
clearAuthRefreshBlock();
authRefreshBlockedUntil =
0;
resumeCloudApi();
}

if(
session?.access_token &&
session?.user &&
!session.refresh_token
){
const persisted =
readPersistedAuthSession();

if(
persisted?.refresh_token &&
persisted?.user?.id ===
session.user?.id &&
!isAuthRefreshBlockedNow()
){
session = {
...session,
refresh_token: persisted.refresh_token,
expires_at: persisted.expires_at
};
}
}

const sessionKey =
session?.user?.id &&
session?.access_token
? `${session.user.id}:${session.access_token}`
: "__signed_out__";

if(
sessionKey ===
lastAppliedSessionKey
){
return;
}

lastAppliedSessionKey =
sessionKey;

loggedIn = !!session?.user;
userEmail = session?.user?.email || "";

if(
!loggedIn
){
syncCloudLoginFromStorage();
notifyAuth();
stopCloudSyncHelpers();
return;
}

const lite =
isAlgoBotLiteShell();

const sb =
lite
? null
: await getSupabase();

if(
!lite &&
sb &&
session?.access_token
){

try{
await withTimeout(
sb.auth.setSession({
access_token: session.access_token,
refresh_token: session.refresh_token || ""
}),
5000,
"setSession apply"
);
}catch{
/* ignore */
}

}

if(
session?.access_token
){

const { warmAlertAuthCache } =
await import("./alert-auth-cache.js?v=7");

warmAlertAuthCache(
{
sb,
user: session.user
},
session
);
}

syncCloudLoginFromStorage();

/*
  Failed/timed-out setSession can clear storage briefly; keep the session we just applied.
*/
if(
!loggedIn &&
session?.user &&
session?.access_token
){
loggedIn =
true;
userEmail =
session.user?.email ||
userEmail ||
"";
}

notifyAuth();

if(
!loggedIn
){
stopCloudSyncHelpers();
return;
}

void applySessionCloudWork(
session
);

}

async function applySessionCloudWork(
session
){

if(
!session?.user?.id
){
return;
}

/* Standalone бот: JWT нужен для lock/remote/push алертов — без hydrate/realtime pull. */
if(
isAlgoBotLiteShell()
){
return;
}

try{

const favoritesCloud =
await import("./favorites-cloud-sync.js?v=7");

if(
!isFavoritesAutoCloudDisabled() &&
!isFavoritesCloudDisabled()
){
await favoritesCloud.reconcileLocalFavoritesWithCloud();
}

if(
!isAlertsPage() &&
!isAlertsCloudDisabled()
){
const alertsCloud =
await import("./alerts-cloud-sync.js?v=113");

await alertsCloud.hydrateAlertsAfterAuth({
force: true
});
/* Алерты: Realtime оставляем (автоматическая синхронизация). */
await alertsCloud.setupAlertsRealtimeForUser(
session.user.id
);
}

}catch(
err
){
console.warn(
"cloud session sync:",
err?.message || err
);

}

}

let pullDeviceInflight =
null;

let lastPullDeviceMs =
0;

const PULL_DEVICE_MIN_MS =
2500;

/**
 * Загрузить рисунки и алерты из Supabase на это устройство (iPad после входа с Mac).
 */
export async function pullDeviceStateFromCloud(){

if(
isAutoDevicePullDisabled()
){
return {
ok: true,
skipped: true,
reason: "auto_pull_disabled"
};
}

if(
!isCloudLoggedInEffective()
){
console.warn(
"[Multichart] нет входа на этом устройстве — шестерёнка → email → ссылка из письма"
);
return {
ok: false,
reason: "no_auth"
};
}

const now =
Date.now();

if(
pullDeviceInflight
){
return pullDeviceInflight;
}

if(
now -
lastPullDeviceMs <
PULL_DEVICE_MIN_MS
){
return {
ok: true,
skipped: true
};
}

pullDeviceInflight =
pullDeviceStateFromCloudImpl().finally(
()=>{

pullDeviceInflight =
null;
lastPullDeviceMs =
Date.now();

}
);

return pullDeviceInflight;

}

async function pullDeviceStateFromCloudImpl(){

try{
await ensureCloudLoginResolved(
10000
);

const alertsCloud =
await import("./alerts-cloud-sync.js?v=113");
const { stripAlertFlagsNotInRegistry } =
await import("./alerts.js?v=109");

const stripOpts =
isAlertsPage()
? {
registryOnlySymbols: true,
emitDrawingsEvents: false
}
: {};

let alertRows =
0;

const jobs =
[];

if(
!isAlertsCloudDisabled()
){

jobs.push(
alertsCloud.hydrateAlertsAfterAuth({
force: true
})
);

}

if(
!jobs.length
){

return {
ok: true,
skipped: true
};

}

const results =
await withTimeout(
Promise.all(
jobs
),
25000,
"pull device from cloud"
);

let idx =
0;

if(
!isAlertsCloudDisabled()
){

alertRows =
results[
idx++
] ??
0;
}

stripAlertFlagsNotInRegistry(
stripOpts
);

window.dispatchEvent(
new CustomEvent(
"alerts-registry-pulled"
)
);
window.dispatchEvent(
new CustomEvent(
"alerts-changed"
)
);
window.dispatchEvent(
new CustomEvent(
"draw-tools-access-changed"
)
);

return {
ok: true,
alertRows
};

}catch(
err
){
console.warn(
"[Multichart] загрузка из облака:",
err?.message || err
);
return {
ok: false,
reason: "error"
};

}

}

export async function waitForCloudAuth(maxWaitMs = 12000){

if(!(await isSupabaseConfigured())){
return null;
}

/* Algo Bot: never poll Auth getSession — local JWT only. */
if(
isAlgoBotLiteShell()
){
const cached =
readPersistedAuthSession();

if(
cached?.access_token &&
cached?.user &&
!isAccessTokenExpired(
cached
)
){
return {
sb:
null,
user:
cached.user
};
}

return null;
}

const sb =
await getSupabase();

if(!sb){
return null;
}

const deadline =
Date.now() + maxWaitMs;

while(Date.now() < deadline){

if(
hasAuthCallbackInUrl()
){
const recovered =
await recoverSessionFromAuthUrl(sb);

if(
recovered?.user
){
return {
sb,
user: recovered.user
};
}

}

const { data: { session }, error } =
await sb.auth.getSession();

if(
!error &&
session?.user
){
return {
sb,
user: session.user
};
}

await new Promise(r=>{
setTimeout(r, 250);
});

}

return null;

}

let cloudSyncInitPromise = null;

export async function initCloudSync(){

if(cloudSyncInitPromise){
return cloudSyncInitPromise;
}

cloudSyncInitPromise = initCloudSyncImpl();
return cloudSyncInitPromise;

}

async function initCloudSyncImpl(){

const hasEnv =
await isSupabaseConfigured();

if(!hasEnv){
configured = false;
notifyAuth();
return;
}

configured = true;
await restoreDesktopAuthSession();
bootstrapAuthFromLocalStorage();
notifyAuth();

/*
  Algo Bot lite: no storage Auth client / getSession (that caused 429 storms).
  Login = Multichart paste / LAN session. Bot does NOT refresh JWT — Multichart
  owns refresh_token rotation (shared token); silent Multichart refresh auto-pushes LAN.
*/
if(
isAlgoBotLiteShell()
){
const cached =
readPersistedAuthSession();
const session =
cached?.access_token &&
cached?.user &&
!isAccessTokenExpired(
cached
)
? cached
: null;

await applySession(
session
);
mountCloudAuthProblemBanner();
bindAlgoBotLiteAuthWatch();
return;
}

let sb;

try{
sb =
await getSupabase();
}catch(err){
console.warn("supabase client:", err);
notifyAuth();
return;
}

if(!sb){
notifyAuth();
return;
}

let session =
(await recoverSessionFromAuthUrl(
sb
)) ||
null;

if(
!session &&
!isAuthRefreshBlockedNow()
){
restoreAuthSessionFromBackup();
session =
await restoreSessionFromPersisted(
sb
);
}

if(
!session &&
!isAuthRefreshBlockedNow()
){

try{

const { data } =
await withTimeout(
sb.auth.getSession(),
authNetworkTimeoutMs(
"getSession"
),
"getSession"
);

session = data?.session ?? null;

}catch(
err
){

warnAuthOnce(
"auth-degraded",
`[auth] getSession: ${err?.message || err}`
);
session = null;

}

}

if(
!session
){
const cached =
readPersistedAuthSession();

if(
cached?.access_token &&
cached?.user &&
!isAccessTokenExpired(
cached
)
){
session =
cached;
}
}

if(
!session &&
hasAuthCallbackInUrl()
){

await new Promise(r=>{
setTimeout(r, 150);
});

session =
(await recoverSessionFromAuthUrl(sb)) ||
(await sb.auth.getSession()).data.session;

}

await applySession(session);

if(
hasAuthCallbackInUrl() &&
!loggedIn
){
window.setTimeout(()=>{
void recoverAuthSessionFromUrl().then(ok=>{
if(ok){
/* session restored from magic link */
}
});
}, 400);
}

sb.auth.onAuthStateChange(
async(event, session)=>{

if(
event === "SIGNED_IN" ||
event === "TOKEN_REFRESHED" ||
event === "INITIAL_SESSION"
){
await applySession(session);
return;
}

if(
event ===
"SIGNED_OUT"
){

const restored =
await tryRecoverSignedOutSession(
sb
);

if(
restored
){
await applySession(
restored
);
return;
}

loggedIn = false;
userEmail = "";
stopCloudSyncHelpers();

const { clearAlertAuthCache } =
await import("./alert-auth-cache.js?v=7");

clearAlertAuthCache();

notifyAuth();
}

}
);

bindAuthSessionKeepalive();

}
