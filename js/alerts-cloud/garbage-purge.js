import {
readAlertTokenSync,
readPersistedAuthSession
} from "../alert-auth-cache.js?v=7";

import {
ensureCloudLoginResolved
} from "../cloud-sync.js?v=46";

import {
withTimeout
} from "../async-timeout.js?v=2";

import {
purgeAlertRowByCloudId
} from "./worker-client.js?v=6";

function alertKeepKey(
symbol,
shapeId
){

return `${String(symbol || "").trim().toUpperCase()}::${String(shapeId || "").trim()}`;

}

function buildKeepSet(
keepActive
){

const set =
new Set();

for (
const row of
keepActive ||
[]
) {
const key =
alertKeepKey(
row.symbol,
row.shape_id ||
row.shapeId
);

if (
key !==
"::"
) {
set.add(
key
);
}
}

return set;

}

async function resolveRestAuth(){

await ensureCloudLoginResolved(
10000
).catch(
()=>null
);

const snap =
readAlertTokenSync();
let token =
snap?.token ||
null;
let userId =
snap?.user?.id ||
null;

if (
!token ||
!userId
) {
const persisted =
readPersistedAuthSession();

if (
persisted?.access_token &&
persisted?.user?.id
) {
token =
persisted.access_token;
userId =
persisted.user.id;
}
}

if (
!token ||
!userId
) {
return null;
}

let env;

try{
env =
await import("../supabase-env.js?v=5");
}catch{
return null;
}

const base =
String(
env.SUPABASE_URL || ""
).replace(
/\/$/,
""
);
const anon =
env.SUPABASE_ANON_KEY;

if (
!base ||
!anon
) {
return null;
}

return {
base,
anon,
token,
userId
};

}

async function fetchWithTimeout(
url,
options,
ms = 15000
){

const controller =
new AbortController();
const timer =
setTimeout(
()=>{
controller.abort();
},
ms
);

try{
return await fetch(
url,
{
...options,
signal: controller.signal
}
);
}finally{
clearTimeout(
timer
);
}

}

async function restDeleteCount(
auth,
pathAndQuery
){

const res =
await fetchWithTimeout(
`${auth.base}/rest/v1/${pathAndQuery}`,
{
method: "DELETE",
headers: {
apikey: auth.anon,
Authorization: `Bearer ${auth.token}`,
Prefer: "return=minimal,count=exact"
}
}
);

if (
!res.ok
) {
const text =
await res.text();
throw new Error(
text.slice(
0,
200
) ||
`HTTP ${res.status}`
);
}

const range =
res.headers.get(
"content-range"
) ||
"";
const m =
range.match(
/\/(\d+)$/
);

return m
? parseInt(
m[
1
],
10
)
: 0;

}

async function restGet(
auth,
pathAndQuery
){

const res =
await fetchWithTimeout(
`${auth.base}/rest/v1/${pathAndQuery}`,
{
method: "GET",
headers: {
apikey: auth.anon,
Authorization: `Bearer ${auth.token}`,
Accept: "application/json"
}
}
);

if (
!res.ok
) {
const text =
await res.text();
throw new Error(
text.slice(
0,
200
) ||
`HTTP ${res.status}`
);
}

const text =
await res.text();

if (
!text
) {
return [];
}

const parsed =
JSON.parse(
text
);

return Array.isArray(
parsed
)
? parsed
: [];

}

/**
 * Очистка мусора алертов в Supabase (JWT пользователя, без Railway worker).
 * @param {Array<{symbol:string, shape_id?:string, shapeId?:string}>} keepActive
 */
export async function purgeAlertGarbageFromCloud(
keepActive = []
){

const auth =
await resolveRestAuth();

if (
!auth
) {
return {
ok: false,
error: "no_auth"
};
}

const uid =
encodeURIComponent(
auth.userId
);
const keepSet =
buildKeepSet(
keepActive
);

let deletedZombies =
0;
let deletedSoft =
0;
let deletedOrphans =
0;
let deletedEvents =
0;
let eventsPolicyMissing =
false;

deletedZombies =
await restDeleteCount(
auth,
`price_alerts?user_id=eq.${uid}&triggered_at=not.is.null`
);

try{
deletedSoft =
await restDeleteCount(
auth,
`price_alerts?user_id=eq.${uid}&deleted_at=not.is.null`
);
}catch(
err
){
if (
!String(
err?.message ||
""
).includes(
"deleted_at"
)
) {
throw err;
}
}

let activeRows;

try{
activeRows =
await restGet(
auth,
`price_alerts?user_id=eq.${uid}` +
`&triggered_at=is.null` +
`&deleted_at=is.null` +
`&select=id,symbol,shape_id`
);
}catch(
err
){
if (
String(
err?.message ||
""
).includes(
"deleted_at"
)
) {
activeRows =
await restGet(
auth,
`price_alerts?user_id=eq.${uid}` +
`&triggered_at=is.null` +
`&select=id,symbol,shape_id`
);
} else {
throw err;
}
}

for (
const row of
activeRows ||
[]
) {
const key =
alertKeepKey(
row.symbol,
row.shape_id
);

if (
key ===
"::" ||
keepSet.has(
key
)
) {
continue;
}

const pruned =
await purgeAlertRowByCloudId(
row.id
);

if (
pruned
) {
deletedOrphans +=
1;
}
}

try{
deletedEvents =
await restDeleteCount(
auth,
`price_alert_events?user_id=eq.${uid}`
);
}catch(
err
){
const msg =
String(
err?.message ||
""
);

if (
/42501|policy|permission|403/i.test(
msg
)
) {
eventsPolicyMissing =
true;
} else {
throw err;
}
}

return {
ok: true,
deletedZombies,
deletedSoft,
deletedOrphans,
deletedEvents,
keptActive:
keepSet.size,
eventsPolicyMissing
};

}
