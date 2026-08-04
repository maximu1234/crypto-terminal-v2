/**
 * Облачная блокировка АлгоБота (Supabase): один активный запуск на аккаунт.
 *
 * lock_key = user:<supabaseUserId>
 * Никогда не используем биржевые / алго API-ключи — обычный Multichart
 * не должен знать про удалённый Algo Bot.
 *
 * Нет логина → skip (локальный бот работает без блокировки).
 * Один аккаунт на Multichart и на серверном Algo Bot → взаимное исключение.
 *
 * Важно: блокировка работает только с user JWT (authenticated), чтобы
 * anon не мог писать lock_key произвольного пользователя.
 */
import {
ensureSupabaseSdk,
isSupabaseConfigured
} from "../supabase-client.js?v=9";
import {
readPersistedAuthSession
} from "../alert-auth-cache.js?v=7";
import {
isAlgoBotLiteShell
} from "../page-routes.js?v=5";

const INSTANCE_KEY =
"algo_bot_lock_instance_id";

const TABLE =
"algo_bot_lock";

/*
 * Temporary (metka-129+): disable cloud "another bot running" lock for
 * Multichart and Algo Bot until auth/session model is redesigned.
 * Operator must not start two bots on the same account.
 */
const CLOUD_LOCK_TEMP_DISABLED =
true;

const lockSbByToken =
new Map();
const lockSbPromiseByToken =
new Map();

/**
 * Dedicated Supabase client for algo_bot_lock with user JWT.
 * @returns {Promise<object|null>}
 */
async function getLockSupabase(
accessToken
){

const token =
String(
accessToken ||
""
).trim();

if(
!token
){
return null;
}

if(
lockSbByToken.has(
token
)
){
return lockSbByToken.get(
token
);
}

if(
lockSbPromiseByToken.has(
token
)
){
return lockSbPromiseByToken.get(
token
);
}

const tokenPromise = (async()=>{

/*
  Load UMD only — never warm the storage-backed Auth client on Algo Bot
  (getSupabase() is null there; GoTrue getSession would refresh JWT).
*/
await ensureSupabaseSdk();

const createClient =
window.supabase?.createClient;

if(
typeof createClient !==
"function"
){
return null;
}

const env =
await import(
"../supabase-env.js?v=5"
);

if(
!env.SUPABASE_URL ||
!env.SUPABASE_ANON_KEY
){
return null;
}

const sb =
createClient(
env.SUPABASE_URL,
env.SUPABASE_ANON_KEY,
{
global: {
headers: {
Authorization:
`Bearer ${token}`
}
},
auth: {
persistSession:
false,
autoRefreshToken:
false,
detectSessionInUrl:
false
}
}
);

lockSbByToken.set(
token,
sb
);

return sb;

})();

lockSbPromiseByToken.set(
token,
tokenPromise
);

try{
return await tokenPromise;
}finally{
lockSbPromiseByToken.delete(
token
);
}

}

function resolveAppName(){

const desktop =
window.cryptoTerminalDesktop;

if(
desktop?.productName
){
return String(
desktop.productName
);
}

if(
/\bbotLite=1\b/i.test(
location.search ||
""
) ||
/algo-bot/i.test(
desktop?.appId ||
""
)
){
return "Multichart Algo Bot";
}

return "Multichart";

}

/**
 * @param {unknown} appName
 */
function isStandaloneAlgoBotLockApp(
appName
){

return /algo\s*bot/i.test(
String(
appName ||
""
)
);

}

export function getAlgoBotLockInstanceId(){

try{
const existing =
String(
localStorage.getItem(
INSTANCE_KEY
) ||
""
).trim();

if(
existing
){
return existing;
}

const id =
(
typeof crypto !==
"undefined" &&
typeof crypto.randomUUID ===
"function"
)
? crypto.randomUUID()
: `algo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

localStorage.setItem(
INSTANCE_KEY,
id
);

return id;
}catch(_err){
return `algo-${Date.now()}`;
}

}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   sb?: object,
 *   lockKey?: string,
 *   skipLock?: boolean,
 *   code?: string,
 *   message?: string
 * }>}
 */
async function resolveCloudAuthContext(){

try{
const persisted =
readPersistedAuthSession();
const fromPersisted =
String(
persisted?.user?.id ||
""
).trim();

if(
fromPersisted &&
persisted?.access_token
){
return {
userId:
fromPersisted,
accessToken:
String(
persisted.access_token
).trim()
};
}
}catch{
/* ignore */
}

/* No Auth getSession fallback — local JWT only (Supabase egress). */
return {
userId:
"",
accessToken:
""
};

}

async function getLockClient(){

if(
!(
await isSupabaseConfigured()
)
){
return {
ok:
false,
code:
"not_configured",
message:
"Supabase не настроен"
};
}

const authCtx =
await resolveCloudAuthContext();
const userId =
String(
authCtx?.userId ||
""
).trim();

if(
!userId
){
/*
  Нет логина — не мешаем локальному Multichart.
  Удалённый бот без того же аккаунта всё равно не скоординировать.
*/
return {
ok:
true,
skipLock:
true
};
}

const sb =
await getLockSupabase(
authCtx.accessToken
);

if(
!sb
){
return {
ok:
false,
code:
"not_configured",
message:
"Supabase не настроен"
};
}

return {
ok:
true,
sb,
lockKey:
`user:${userId}`
};

}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   locked?: boolean,
 *   ownedByUs?: boolean,
 *   instanceId?: string|null,
 *   appName?: string|null,
 *   lockedAt?: string|null,
 *   code?: string,
 *   message?: string
 * }>}
 */
export async function fetchAlgoBotLock(){

if(
CLOUD_LOCK_TEMP_DISABLED
){
return {
ok:
true,
locked:
false,
ownedByUs:
false,
skipped:
true,
instanceId:
null,
appName:
null,
lockedAt:
null
};
}

const client =
await getLockClient();

if(
!client.ok
){
return client;
}

if(
client.skipLock
){
return {
ok:
true,
locked:
false,
ownedByUs:
false,
skipped:
true,
instanceId:
null,
appName:
null,
lockedAt:
null
};
}

try{

const {
data,
error
} =
await client.sb
.from(
TABLE
)
.select(
"locked, instance_id, app_name, locked_at"
)
.eq(
"lock_key",
client.lockKey
)
.maybeSingle();

if(
error
){
return {
ok:
false,
code:
"query_error",
message:
error.message ||
"Не удалось прочитать блокировку"
};
}

const locked =
!!data?.locked;
const instanceId =
data?.instance_id
? String(
data.instance_id
)
: null;
const ours =
getAlgoBotLockInstanceId();

return {
ok:
true,
locked,
ownedByUs:
locked &&
instanceId ===
ours,
instanceId,
appName:
data?.app_name
? String(
data.app_name
)
: null,
lockedAt:
data?.locked_at ||
null
};

}catch(
err
){
return {
ok:
false,
code:
"query_error",
message:
err?.message ||
String(
err
) ||
"Не удалось прочитать блокировку"
};
}

}

/**
 * Поставить метку перед стартом. Если чужая — отказ.
 * @returns {Promise<{ ok: boolean, code?: string, message?: string, appName?: string|null }>}
 */
export async function acquireAlgoBotLock(){

if(
CLOUD_LOCK_TEMP_DISABLED
){
return {
ok:
true,
skipped:
true
};
}

const client =
await getLockClient();

if(
!client.ok
){
return client;
}

if(
client.skipLock
){
return {
ok:
true,
skipped:
true
};
}

const current =
await fetchAlgoBotLock();

if(
!current.ok
){
return current;
}

const ours =
getAlgoBotLockInstanceId();

if(
current.locked &&
!current.ownedByUs
){
/*
  On Algo Bot lite: reclaim stale lock from a previous Bot instance
  (new install / different instance_id). Still refuse Multichart's lock.
  Multichart page must not steal a live remote Bot lock.
*/
const reclaimOwnBot =
isAlgoBotLiteShell() &&
isStandaloneAlgoBotLockApp(
current.appName
);

if(
!reclaimOwnBot
){
const where =
current.appName
? ` (${current.appName})`
: "";

return {
ok:
false,
code:
"locked_elsewhere",
appName:
current.appName,
message:
`Бот уже работает в другом приложении${where}`
};
}
}

const appName =
resolveAppName();
const now =
new Date().toISOString();

try{

const {
error
} =
await client.sb
.from(
TABLE
)
.upsert(
{
lock_key:
client.lockKey,
locked:
true,
instance_id:
ours,
app_name:
appName,
locked_at:
now
},
{
onConflict:
"lock_key"
}
);

if(
error
){
return {
ok:
false,
code:
"upsert_error",
message:
error.message ||
"Не удалось поставить блокировку"
};
}

}catch(
err
){
return {
ok:
false,
code:
"upsert_error",
message:
err?.message ||
String(
err
) ||
"Не удалось поставить блокировку"
};
}

return {
ok:
true,
appName
};

}

/**
 * Снять свою метку после «Остановить».
 */
export async function releaseAlgoBotLock(){

if(
CLOUD_LOCK_TEMP_DISABLED
){
return {
ok:
true,
skipped:
true
};
}

const client =
await getLockClient();

if(
!client.ok
){
if(
client.code ===
"not_configured" ||
client.code ===
"desktop_only"
){
return {
ok:
true,
skipped:
true
};
}

return client;
}

if(
client.skipLock
){
return {
ok:
true,
skipped:
true
};
}

const ours =
getAlgoBotLockInstanceId();

const {
data,
error: readErr
} =
await client.sb
.from(
TABLE
)
.select(
"locked, instance_id"
)
.eq(
"lock_key",
client.lockKey
)
.maybeSingle();

if(
readErr
){
return {
ok:
false,
code:
"query_error",
message:
readErr.message ||
"Не удалось прочитать блокировку"
};
}

if(
!data?.locked
){
return {
ok:
true,
skipped:
true
};
}

if(
String(
data.instance_id ||
""
) !==
ours
){
return {
ok:
true,
skipped:
true,
message:
"Чужая блокировка — не снимаем"
};
}

const {
error
} =
await client.sb
.from(
TABLE
)
.update(
{
locked:
false,
instance_id:
null,
app_name:
null,
locked_at:
null
}
)
.eq(
"lock_key",
client.lockKey
)
.eq(
"instance_id",
ours
);

if(
error
){
return {
ok:
false,
code:
"update_error",
message:
error.message ||
"Не удалось снять блокировку"
};
}

return {
ok:
true
};

}

/**
 * Принудительно снять метку («Снять блокировку»).
 */
export async function clearAlgoBotLock(){

if(
CLOUD_LOCK_TEMP_DISABLED
){
return {
ok:
true,
skipped:
true,
message:
"Облачная блокировка временно отключена"
};
}

const client =
await getLockClient();

if(
!client.ok
){
return client;
}

if(
client.skipLock
){
return {
ok:
true,
skipped:
true,
message:
"Облачная блокировка не используется"
};
}

const {
error
} =
await client.sb
.from(
TABLE
)
.upsert(
{
lock_key:
client.lockKey,
locked:
false,
instance_id:
null,
app_name:
null,
locked_at:
null
},
{
onConflict:
"lock_key"
}
);

if(
error
){
return {
ok:
false,
code:
"update_error",
message:
error.message ||
"Не удалось снять блокировку"
};
}

return {
ok:
true,
message:
"Блокировка снята"
};

}

/**
 * Если бот уже running локально (agent/resume) — убедиться, что метка наша.
 */
export async function ensureAlgoBotLockHeld(){

return acquireAlgoBotLock();

}
