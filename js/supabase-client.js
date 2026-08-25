import {
createAuthStorage,
SUPABASE_AUTH_STORAGE_KEY,
isAuthRefreshBlocked,
noteAuthRefreshHttpStatus
} from "./auth-storage.js?v=11";

import {
isAlgoBotLiteShell
} from "./page-routes.js?v=5";

export {
SUPABASE_AUTH_STORAGE_KEY
};

let envPromise = null;
let client = null;
let clientPromise = null;
let createClientPromise = null;

const SUPABASE_UMD_SOURCES = [
"/vendor/supabase.umd.js",
"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.js"
];

function loadSupabaseUmd(src){

return new Promise((resolve, reject)=>{

if(
window.supabase?.createClient
){
resolve(window.supabase.createClient);
return;
}

const existing =
document.querySelector(
`script[data-supabase-umd="${src}"]`
);

if(existing){

existing.addEventListener(
"load",
()=>{
if(window.supabase?.createClient){
resolve(window.supabase.createClient);
}else{
reject(new Error("Supabase UMD loaded without createClient"));
}
},
{ once: true }
);
existing.addEventListener(
"error",
()=>reject(new Error(src)),
{ once: true }
);
return;

}

const el =
document.createElement("script");

el.src = src;
el.dataset.supabaseUmd = src;
el.async = true;
el.addEventListener(
"load",
()=>{
if(window.supabase?.createClient){
resolve(window.supabase.createClient);
}else{
reject(new Error("Supabase SDK loaded without createClient"));
}
},
{ once: true }
);
el.addEventListener(
"error",
()=>reject(new Error(src)),
{ once: true }
);
document.head.appendChild(el);

});

}

async function loadCreateClient(){

if(createClientPromise){
return createClientPromise;
}

createClientPromise = (async()=>{

let lastErr;

for(const src of SUPABASE_UMD_SOURCES){

try{

const loaded =
await Promise.race([
loadSupabaseUmd(src),
new Promise(
(
_,
reject
)=>{
setTimeout(
()=>{
reject(
new Error(
`Supabase SDK timeout (${src})`
)
);
},
12000
);
}
)
]);

return loaded;

}catch(err){
lastErr = err;
}

}

throw lastErr || new Error("Supabase SDK unavailable");

})();

return createClientPromise;

}

/** Load UMD only (no auth client). For Algo Bot lock client etc. */
export async function ensureSupabaseSdk(){

return loadCreateClient();

}

async function loadEnv(){

if(envPromise){
return envPromise;
}

envPromise = import("./supabase-env.js?v=5")
.then(m=>m)
.catch(()=>({
SUPABASE_URL:"",
SUPABASE_ANON_KEY:""
}));

return envPromise;

}

export async function isSupabaseConfigured(){

const env =
await loadEnv();

return !!(
env.SUPABASE_URL &&
env.SUPABASE_ANON_KEY
);

}

function isAuthTokenRefreshUrl(
input
){

const url =
String(
input?.url ||
input ||
""
);

return (
/\/auth\/v1\/token/i.test(
url
) &&
(/grant_type=refresh_token/i.test(
url
) ||
/type=refresh_token/i.test(
url
) ||
/refresh_token/i.test(
String(
typeof input ===
"object" &&
input?.body
? input.body
: ""
)
))
);

}

function authAwareFetch(
input,
init
){

const baseFetch =
typeof fetch ===
"function"
? fetch.bind(
globalThis
)
: null;

if(
!baseFetch
){
return Promise.reject(
new Error(
"fetch unavailable"
)
);
}

if(
isAuthTokenRefreshUrl(
input
) &&
isAuthRefreshBlocked()
){
return Promise.resolve(
new Response(
JSON.stringify({
error:
"refresh_blocked",
message:
"Auth refresh blocked locally"
}),
{
status:
401,
headers: {
"Content-Type":
"application/json"
}
}
)
);
}

return baseFetch(
input,
init
).then(
(res)=>{

if(
isAuthTokenRefreshUrl(
input
) &&
(
res.status ===
429 ||
res.status ===
400 ||
res.status ===
401 ||
res.status ===
403
)
){
noteAuthRefreshHttpStatus(
res.status
);

try{
window.dispatchEvent(
new CustomEvent(
"cloud-auth-refresh-http",
{
detail: {
status:
res.status
}
}
)
);
}catch{
/* ignore */
}

}

return res;

}
);

}

/**
 * Direct GoTrue refresh without creating a storage-backed Auth client.
 * Used by Algo Bot lite (getSupabase() is null there on purpose).
 * Goes through authAwareFetch so 429/400 trip the same circuit-breaker/cloak.
 *
 * @param {string} refreshToken
 * @returns {Promise<{ data: { session: object|null }, error: Error|null }>}
 */
export async function refreshSessionDirect(
refreshToken
){

const env =
await loadEnv();

if(
!env.SUPABASE_URL ||
!env.SUPABASE_ANON_KEY
){
return {
data: {
session:
null
},
error:
new Error(
"Supabase env missing"
)
};
}

const rt =
String(
refreshToken ||
""
).trim();

if(
!rt
){
return {
data: {
session:
null
},
error:
new Error(
"no refresh_token"
)
};
}

if(
isAuthRefreshBlocked()
){
return {
data: {
session:
null
},
error:
new Error(
"refresh_blocked"
)
};
}

const base =
String(
env.SUPABASE_URL
).replace(
/\/$/,
""
);
const url =
`${base}/auth/v1/token?grant_type=refresh_token`;

try{
const res =
await authAwareFetch(
url,
{
method:
"POST",
headers: {
apikey:
env.SUPABASE_ANON_KEY,
Authorization:
`Bearer ${env.SUPABASE_ANON_KEY}`,
"Content-Type":
"application/json",
Accept:
"application/json"
},
body:
JSON.stringify(
{
refresh_token:
rt
}
)
}
);

const json =
await res.json().catch(
()=>
({})
);

if(
!res.ok
){
const err =
new Error(
json?.msg ||
json?.error_description ||
json?.error ||
`http_${res.status}`
);

err.status =
res.status;
err.code =
json?.error ||
`http_${res.status}`;

return {
data: {
session:
null
},
error:
err
};
}

const expiresIn =
Number(
json?.expires_in
) ||
0;
const expiresAt =
Number(
json?.expires_at
) ||
(
expiresIn >
0
? Math.floor(
Date.now() /
1000
) +
expiresIn
: 0
);

const session =
json?.access_token
? {
access_token:
json.access_token,
refresh_token:
json.refresh_token ||
rt,
expires_in:
expiresIn ||
undefined,
expires_at:
expiresAt ||
undefined,
token_type:
json.token_type ||
"bearer",
user:
json.user ||
null
}
: (
json?.session ||
null
);

if(
!session?.access_token
){
return {
data: {
session:
null
},
error:
new Error(
"empty session"
)
};
}

return {
data: {
session
},
error:
null
};
}catch(
err
){
return {
data: {
session:
null
},
error:
err instanceof Error
? err
: new Error(
String(
err
)
)
};
}

}

export async function getSupabase(){

/*
  Algo Bot lite: never create a storage-backed Auth client.
  GoTrue getSession() refreshes near-expiry JWTs even with
  autoRefreshToken:false — that was the 429 storm on the VPS.
*/
if(
isAlgoBotLiteShell()
){
return null;
}

const env =
await loadEnv();

if(
!env.SUPABASE_URL ||
!env.SUPABASE_ANON_KEY
){
return null;
}

if(client){
return client;
}

if(!clientPromise){

clientPromise = (async()=>{

const createClient =
await loadCreateClient();

const sb =
createClient(
env.SUPABASE_URL,
env.SUPABASE_ANON_KEY,
{
global: {
fetch:
authAwareFetch
},
auth:{
persistSession:true,
autoRefreshToken:false,
detectSessionInUrl:true,
storage: createAuthStorage(),
storageKey: SUPABASE_AUTH_STORAGE_KEY
}
}
);

client = sb;
return sb;

})();

}

try{
return await clientPromise;
}catch(err){
clientPromise = null;
throw err;
}

}
