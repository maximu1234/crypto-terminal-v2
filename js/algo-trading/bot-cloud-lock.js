/**
 * Облачная блокировка АлгоБота (Supabase): один активный запуск на хеш алго API-ключа.
 * Метка ставится при «Запустить», снимается при «Остановить» или «Снять блокировку».
 * Без логина Multichart — capability = знание SHA-256(exchange:net:apiKey).
 *
 * Важно: отдельный anon-клиент без auth storage. Общий getSupabase() после
 * вставки сессии Multichart может кидать AuthSessionMissingError на REST,
 * хотя RLS для lock_key разрешает anon.
 */
import {
getSupabase,
isSupabaseConfigured
} from "../supabase-client.js?v=7";

const INSTANCE_KEY =
"algo_bot_lock_instance_id";

const TABLE =
"algo_bot_lock";

const noopAuthStorage = {
getItem(){
return null;
},
setItem(){},
removeItem(){}
};

let lockSb =
null;
let lockSbPromise =
null;

/**
 * Anon-only Supabase client for algo_bot_lock (no JWT / no Multichart session).
 * @returns {Promise<object|null>}
 */
async function getLockSupabase(){

if(
lockSb
){
return lockSb;
}

if(
lockSbPromise
){
return lockSbPromise;
}

lockSbPromise = (async()=>{

/*
  Warm UMD createClient via shared helper (may also init auth client — fine).
*/
await getSupabase();

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

lockSb =
createClient(
env.SUPABASE_URL,
env.SUPABASE_ANON_KEY,
{
auth: {
persistSession:
false,
autoRefreshToken:
false,
detectSessionInUrl:
false,
storage:
noopAuthStorage
}
}
);

return lockSb;

})();

return lockSbPromise;

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
 *   code?: string,
 *   message?: string
 * }>}
 */
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

const api =
window.cryptoTerminalDesktop?.algoTrading;

if(
typeof api?.getBotLockKey !==
"function"
){
return {
ok:
false,
code:
"desktop_only",
message:
"Облачная блокировка доступна только в desktop"
};
}

const keyRes =
await api.getBotLockKey(
{}
);

if(
!keyRes?.ok ||
!keyRes.lockKey
){
return {
ok:
false,
code:
keyRes?.code ||
"no_keys",
message:
keyRes?.message ||
"Алго API-ключи не настроены"
};
}

const sb =
await getLockSupabase();

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
String(
keyRes.lockKey
)
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

const client =
await getLockClient();

if(
!client.ok
){
return client;
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

const client =
await getLockClient();

if(
!client.ok
){
return client;
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

const client =
await getLockClient();

if(
!client.ok
){
if(
client.code ===
"no_keys" ||
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

const client =
await getLockClient();

if(
!client.ok
){
return client;
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
