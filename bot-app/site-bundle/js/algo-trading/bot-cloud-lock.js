/**
 * Облачная блокировка АлгоБота (Supabase): один активный запуск на аккаунт.
 * Метка ставится при «Запустить», снимается при «Остановить» или «Снять блокировку».
 */
import {
getSupabase,
isSupabaseConfigured
} from "../supabase-client.js?v=7";

const INSTANCE_KEY =
"algo_bot_lock_instance_id";

const TABLE =
"algo_bot_lock";

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

async function getAuthedClient(){

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

const sb =
await getSupabase();

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

const {
data:{
session
},
error
} =
await sb.auth.getSession();

if(
error
){
return {
ok:
false,
code:
"auth_error",
message:
error.message ||
"Ошибка авторизации"
};
}

if(
!session?.user?.id
){
return {
ok:
false,
code:
"not_logged_in",
message:
"Войдите в аккаунт, чтобы запускать бота (облачная блокировка)"
};
}

return {
ok:
true,
sb,
userId:
session.user.id
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

const auth =
await getAuthedClient();

if(
!auth.ok
){
return auth;
}

const {
data,
error
} =
await auth.sb
.from(
TABLE
)
.select(
"locked, instance_id, app_name, locked_at"
)
.eq(
"user_id",
auth.userId
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

}

/**
 * Поставить метку перед стартом. Если чужая — отказ.
 * @returns {Promise<{ ok: boolean, code?: string, message?: string, appName?: string|null }>}
 */
export async function acquireAlgoBotLock(){

const auth =
await getAuthedClient();

if(
!auth.ok
){
return auth;
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

const {
error
} =
await auth.sb
.from(
TABLE
)
.upsert(
{
user_id:
auth.userId,
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
"user_id"
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

const auth =
await getAuthedClient();

if(
!auth.ok
){
if(
auth.code ===
"not_logged_in" ||
auth.code ===
"not_configured"
){
return {
ok:
true,
skipped:
true
};
}

return auth;
}

const ours =
getAlgoBotLockInstanceId();

const {
data,
error: readErr
} =
await auth.sb
.from(
TABLE
)
.select(
"locked, instance_id"
)
.eq(
"user_id",
auth.userId
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
await auth.sb
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
"user_id",
auth.userId
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

const auth =
await getAuthedClient();

if(
!auth.ok
){
return auth;
}

const {
error
} =
await auth.sb
.from(
TABLE
)
.upsert(
{
user_id:
auth.userId,
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
"user_id"
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
