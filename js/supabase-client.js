/** Ключ в localStorage — должен совпадать с createClient({ auth: { storageKey } }). */
export const SUPABASE_AUTH_STORAGE_KEY =
"ct_supabase_auth";

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
reject(new Error("Supabase UMD loaded without createClient"));
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
return await loadSupabaseUmd(src);
}catch(err){
lastErr = err;
}

}

throw lastErr || new Error("Supabase SDK unavailable");

})();

return createClientPromise;

}

async function loadEnv(){

if(envPromise){
return envPromise;
}

envPromise = import("./supabase-env.js?v=2")
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

export async function getSupabase(){

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
auth:{
persistSession:true,
autoRefreshToken:true,
detectSessionInUrl:true,
storage: window.localStorage,
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
