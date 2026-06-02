/** Ключ в localStorage — должен совпадать с createClient({ auth: { storageKey } }). */
export const SUPABASE_AUTH_STORAGE_KEY =
"ct_supabase_auth";

/** Резервная копия сессии — Safari иногда очищает primary после failed refresh. */
export const SUPABASE_AUTH_BACKUP_KEY =
"ct_supabase_auth_backup_v1";

const EXPLICIT_SIGNOUT_KEY =
"ct_supabase_auth_explicit_signout";

function readRaw(
key
){

try{
return localStorage.getItem(
key
);
}catch{
return null;
}

}

function writeRaw(
key,
value
){

try{
localStorage.setItem(
key,
value
);
return true;
}catch{
return false;
}

}

function removeRaw(
key
){

try{
localStorage.removeItem(
key
);
}catch{
/* ignore */
}

}

export function mirrorAuthSessionBackup(
value
){

if(
!value
){
return;
}

writeRaw(
SUPABASE_AUTH_BACKUP_KEY,
value
);

try{
sessionStorage.removeItem(
EXPLICIT_SIGNOUT_KEY
);
}catch{
/* ignore */
}

}

export function restoreAuthSessionFromBackup(){

const backup =
readRaw(
SUPABASE_AUTH_BACKUP_KEY
);

if(
!backup
){
return false;
}

return writeRaw(
SUPABASE_AUTH_STORAGE_KEY,
backup
);

}

export function isExplicitAuthSignOut(){

try{
return sessionStorage.getItem(
EXPLICIT_SIGNOUT_KEY
) ===
"1";
}catch{
return false;
}

}

export function markExplicitAuthSignOut(){

try{
sessionStorage.setItem(
EXPLICIT_SIGNOUT_KEY,
"1"
);
}catch{
/* ignore */
}

removeRaw(
SUPABASE_AUTH_BACKUP_KEY
);

}

export function clearExplicitAuthSignOut(){

try{
sessionStorage.removeItem(
EXPLICIT_SIGNOUT_KEY
);
}catch{
/* ignore */
}

}

/** 400/401 от Supabase refresh — повторять бессмысленно, только спам в консоль. */
export function isFatalAuthRefreshError(
error
){

if(
!error
){
return false;
}

const status =
Number(
error?.status ||
error?.statusCode ||
error?.code ||
0
);

if(
status ===
400 ||
status ===
401 ||
status ===
403
){
return true;
}

const msg =
String(
error?.message ||
error?.name ||
error ||
""
).toLowerCase();

return (
/invalid refresh/.test(
msg
) ||
/refresh token/.test(
msg
) ||
/invalid_grant/.test(
msg
) ||
/token.*revoked/.test(
msg
) ||
/session.*not found/.test(
msg
)
);

}

function stripRefreshTokenFromAuthRaw(
raw
){

if(
!raw
){
return raw;
}

try{

const data =
JSON.parse(
raw
);

const session =
data?.access_token
? data
: data?.currentSession ||
data?.session ||
null;

if(
session &&
typeof session ===
"object"
){
session.refresh_token =
"";
}

if(
data?.refresh_token
){
data.refresh_token =
"";
}

return JSON.stringify(
data
);

}catch{
return raw;
}

}

/** Убрать refresh_token из primary/backup — прекращает цикл 400 в консоли. */
export function clearPersistedRefreshToken(){

for(
const key of
[
SUPABASE_AUTH_STORAGE_KEY,
SUPABASE_AUTH_BACKUP_KEY
]
){

const raw =
readRaw(
key
);

if(
!raw
){
continue;
}

writeRaw(
key,
stripRefreshTokenFromAuthRaw(
raw
)
);

}

}

/**
 * Safari / WebKit: Supabase иногда вызывает removeItem после failed refresh.
 * Primary можно сбросить, backup остаётся для восстановления.
 */
export function createAuthStorage(){

return {

getItem(
key
){

let value =
readRaw(
key
);

if(
!value &&
key ===
SUPABASE_AUTH_STORAGE_KEY
){
if(
restoreAuthSessionFromBackup()
){
value =
readRaw(
key
);
}
}

return value;

},

setItem(
key,
value
){

writeRaw(
key,
value
);

if(
key ===
SUPABASE_AUTH_STORAGE_KEY &&
value
){
mirrorAuthSessionBackup(
value
);
}

},

removeItem(
key
){

if(
key ===
SUPABASE_AUTH_STORAGE_KEY &&
!isExplicitAuthSignOut()
){
removeRaw(
key
);
return;
}

removeRaw(
key
);

if(
key ===
SUPABASE_AUTH_STORAGE_KEY
){
removeRaw(
SUPABASE_AUTH_BACKUP_KEY
);
}

}

};

}

/** Safari (не Chrome/Firefox/Яндекс на iOS). */
export function isSafariBrowser(){

if(
typeof navigator ===
"undefined"
){
return false;
}

const ua =
navigator.userAgent ||
"";

if(
/CriOS|FxiOS|EdgiOS|YaBrowser|Yandex/i.test(
ua
)
){
return false;
}

if(
/Chrome\/|Chromium\/|Edg\/|OPR\//.test(
ua
) &&
!/Safari\//.test(
ua
)
){
return false;
}

if(
/Safari\//.test(
ua
)
){
return true;
}

return (
/iPhone|iPad|iPod/i.test(
ua
) &&
/AppleWebKit/i.test(
ua
) &&
!/CriOS|FxiOS|EdgiOS/i.test(
ua
)
);

}

export function isSafariLikeAuthBrowser(){

return (
isSafariBrowser() ||
isMobileLikeBrowser()
);

}

export function isMobileLikeBrowser(){

if(
typeof navigator ===
"undefined"
){
return false;
}

const ua =
navigator.userAgent ||
"";

return /iPhone|iPad|iPod|Android|Mobile/i.test(
ua
);

}

export function authNetworkTimeoutMs(
label = ""
){

const ua =
typeof navigator !==
"undefined"
? (
navigator.userAgent ||
""
)
: "";

if(
/YaBrowser|Yandex/i.test(
ua
)
){
return 15000;
}

if(
isSafariBrowser()
){
return 15000;
}

if(
isMobileLikeBrowser()
){
return 12000;
}

return label ===
"getSession"
? 5000
: 8000;

}
