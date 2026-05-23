import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=2";

import {
loadFavorites,
saveFavorites
} from "./storage.js?v=11";

const FAVORITES_LOCAL_TS_KEY =
"favorites_local_updated_at";

let configured = false;
let loggedIn = false;
let userEmail = "";
const authListeners = new Set();
const favoritesListeners = new Set();

function notifyAuth(){

authListeners.forEach(fn=>{

try{
fn();
}catch{
/* ignore */
}

});

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

export function isCloudSyncEnabled(){

return configured;

}

export function isCloudLoggedIn(){

return configured && loggedIn;

}

export function getCloudUserEmail(){

return userEmail;

}

function loadLocalFavoritesUpdatedAt(){

return localStorage.getItem(
FAVORITES_LOCAL_TS_KEY
) || "";

}

function saveLocalFavoritesUpdatedAt(iso){

if(!iso){
localStorage.removeItem(
FAVORITES_LOCAL_TS_KEY
);
return;
}

localStorage.setItem(
FAVORITES_LOCAL_TS_KEY,
iso
);

}

function normalizeFavoritesList(list){

if(!Array.isArray(list)){
return [];
}

return list.filter(s=>typeof s === "string");

}

async function fetchCloudSettings(sb, userId){

const { data, error } =
await sb
.from("user_settings")
.select("favorites, updated_at")
.eq("user_id", userId)
.maybeSingle();

if(error){
console.warn(
"cloud favorites load:",
error.message
);
return null;
}

if(!data){
return null;
}

return {
favorites: normalizeFavoritesList(
data.favorites
),
updatedAt: data.updated_at || ""
};

}

async function pushCloudFavorites(
sb,
userId,
favorites,
updatedAt
){

const ts =
updatedAt ||
new Date().toISOString();

const { error } =
await sb
.from("user_settings")
.upsert({
user_id: userId,
favorites,
updated_at: ts
});

if(error){
console.warn(
"cloud favorites save:",
error.message
);
return null;
}

return ts;

}

async function getAuthedClient(){

const sb =
await getSupabase();

if(
!sb ||
!loggedIn
){
return null;
}

const { data: { user } } =
await sb.auth.getUser();

if(!user){
return null;
}

return { sb, user };

}

function applyFavoritesLocally(
favorites,
updatedAt
){

saveFavorites(favorites);

if(updatedAt){
saveLocalFavoritesUpdatedAt(updatedAt);
}

notifyFavorites();

}

/** Слияние по updated_at — побеждает последнее изменение (в т.ч. пустой список). */
export async function mergeFavoritesWithCloud(){

const authed =
await getAuthedClient();

if(!authed){
return loadFavorites();
}

const { sb, user } =
authed;

const local =
loadFavorites();
const localTs =
loadLocalFavoritesUpdatedAt();
const cloud =
await fetchCloudSettings(
sb,
user.id
);

if(!cloud){

if(local.length > 0){

const ts =
await pushCloudFavorites(
sb,
user.id,
local
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
}

}

return local;

}

if(
!localTs ||
(
cloud.updatedAt &&
cloud.updatedAt > localTs
)
){

applyFavoritesLocally(
cloud.favorites,
cloud.updatedAt
);
return cloud.favorites;

}

if(
localTs &&
(
!cloud.updatedAt ||
localTs > cloud.updatedAt
)
){

const ts =
await pushCloudFavorites(
sb,
user.id,
local,
localTs
);

if(ts){
saveLocalFavoritesUpdatedAt(ts);
}

return local;

}

return local;

}

/** Подтянуть с другого устройства (вкладка / refresh). */
export async function pullFavoritesIfCloudNewer(){

const authed =
await getAuthedClient();

if(!authed){
return loadFavorites();
}

const { sb, user } =
authed;

const localTs =
loadLocalFavoritesUpdatedAt();
const cloud =
await fetchCloudSettings(
sb,
user.id
);

if(
!cloud?.updatedAt ||
(
localTs &&
localTs >= cloud.updatedAt
)
){
return loadFavorites();
}

applyFavoritesLocally(
cloud.favorites,
cloud.updatedAt
);

return cloud.favorites;

}

export async function persistFavoritesToCloud(favorites){

const ts =
new Date().toISOString();

saveFavorites(favorites);
saveLocalFavoritesUpdatedAt(ts);

const authed =
await getAuthedClient();

if(!authed){
return;
}

const { sb, user } =
authed;

await pushCloudFavorites(
sb,
user.id,
favorites,
ts
);

}

export async function signInWithEmailOtp(email){

const sb =
await getSupabase();

if(!sb){
throw new Error("Supabase не настроен");
}

const redirectTo =
`${window.location.origin}${window.location.pathname}`;

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

export async function signOutCloud(){

const sb =
await getSupabase();

if(sb){
await sb.auth.signOut();
}

loggedIn = false;
userEmail = "";
notifyAuth();

}

async function applySession(session){

loggedIn = !!session?.user;
userEmail = session?.user?.email || "";

if(loggedIn){
await mergeFavoritesWithCloud();
}else{
notifyAuth();
}

}

function bindRemotePullTriggers(){

const pull = ()=>{

if(!loggedIn){
return;
}

pullFavoritesIfCloudNewer();

};

document.addEventListener(
"visibilitychange",
()=>{

if(
document.visibilityState ===
"visible"
){
pull();
}

}
);

window.addEventListener(
"focus",
pull
);

}

export async function initCloudSync(){

configured =
await isSupabaseConfigured();

if(!configured){
notifyAuth();
return;
}

const sb =
await getSupabase();

if(!sb){
notifyAuth();
return;
}

const { data: { session } } =
await sb.auth.getSession();

await applySession(session);

bindRemotePullTriggers();

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
event === "SIGNED_OUT"
){
loggedIn = false;
userEmail = "";
notifyAuth();
}

}
);

}
