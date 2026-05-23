import {
getSupabase,
isSupabaseConfigured
} from "./supabase-client.js?v=1";

import {
loadFavorites,
saveFavorites
} from "./storage.js?v=11";

let configured = false;
let loggedIn = false;
let userEmail = "";
const listeners = new Set();

function notify(){

listeners.forEach(fn=>{

try{
fn();
}catch{
/* ignore */
}

});

}

export function onCloudSyncChange(fn){

listeners.add(fn);

return ()=>{
listeners.delete(fn);
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

async function fetchCloudFavorites(sb, userId){

const { data, error } =
await sb
.from("user_settings")
.select("favorites")
.eq("user_id", userId)
.maybeSingle();

if(error){
console.warn("cloud favorites load:", error.message);
return null;
}

if(!data?.favorites){
return [];
}

return Array.isArray(data.favorites)
? data.favorites.filter(s=>typeof s === "string")
: [];

}

async function pushCloudFavorites(sb, userId, favorites){

const { error } =
await sb
.from("user_settings")
.upsert({
user_id: userId,
favorites,
updated_at: new Date().toISOString()
});

if(error){
console.warn("cloud favorites save:", error.message);
return false;
}

return true;

}

export async function mergeFavoritesWithCloud(){

const sb =
await getSupabase();

if(
!sb ||
!loggedIn
){
return loadFavorites();
}

const { data: { user } } =
await sb.auth.getUser();

if(!user){
return loadFavorites();
}

const local =
loadFavorites();
const cloud =
await fetchCloudFavorites(
sb,
user.id
);

if(
cloud &&
cloud.length > 0
){

saveFavorites(cloud);
notify();
return cloud;

}

if(local.length > 0){

await pushCloudFavorites(
sb,
user.id,
local
);

}

notify();
return local;

}

export async function persistFavoritesToCloud(favorites){

saveFavorites(favorites);

const sb =
await getSupabase();

if(
!sb ||
!loggedIn
){
return;
}

const { data: { user } } =
await sb.auth.getUser();

if(!user){
return;
}

await pushCloudFavorites(
sb,
user.id,
favorites
);

}

export async function signInWithEmailOtp(email){

const sb =
await getSupabase();

if(!sb){
throw new Error("Supabase не настроен");
}

const redirectTo =
window.location.origin +
window.location.pathname;

const { error } =
await sb.auth.signInWithOtp({
email,
options:{
emailRedirectTo: redirectTo
}
});

if(error){
throw error;
}

}

export async function signOutCloud(){

const sb =
await getSupabase();

if(sb){
await sb.auth.signOut();
}

loggedIn = false;
userEmail = "";
notify();

}

async function applySession(session){

loggedIn = !!session?.user;
userEmail = session?.user?.email || "";

if(loggedIn){
await mergeFavoritesWithCloud();
}else{
notify();
}

}

export async function initCloudSync(){

configured =
await isSupabaseConfigured();

if(!configured){
notify();
return;
}

const sb =
await getSupabase();

if(!sb){
notify();
return;
}

const { data: { session } } =
await sb.auth.getSession();

await applySession(session);

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
notify();
}

}
);

}
