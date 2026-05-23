let envPromise = null;
let client = null;
let createClientPromise = null;

async function loadCreateClient(){

if(!createClientPromise){

createClientPromise = import(
"https://esm.sh/@supabase/supabase-js@2.49.1"
).then(m=>m.createClient);

}

return createClientPromise;

}

async function loadEnv(){

if(envPromise){
return envPromise;
}

envPromise = import("./supabase-env.js")
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

if(!client){

const createClient =
await loadCreateClient();

client = createClient(
env.SUPABASE_URL,
env.SUPABASE_ANON_KEY,
{
auth:{
persistSession:true,
autoRefreshToken:true,
detectSessionInUrl:true,
storage: window.localStorage,
storageKey:"ct_supabase_auth"
}
}
);

}

return client;

}
