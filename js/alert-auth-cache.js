/**
 * Кэш JWT для алертов. Fallback: localStorage `ct_supabase_auth`
 * (без getSession(), который зависает при повторных срабатываниях).
 */

import {
SUPABASE_AUTH_STORAGE_KEY
} from "./supabase-client.js?v=5";

let cache = null;

/** Живёт между readAlertTokenSync, пока не signOut. */
let durableAuth = null;

export function getCachedAlertAuth() {

  if(
    !cache?.ctx?.user ||
    !cache?.token
  ){
    return null;
  }

  return cache;

}

export function setAlertAuthCache(
ctx,
token
) {

  if(
    !ctx?.user ||
    !token
  ){
    cache = null;
    return;
  }

  cache = {
    ctx,
    token: String(token)
  };

}

export function clearAlertAuthCache() {

  cache = null;
  durableAuth = null;

}

export function warmAlertAuthCache(
ctx,
session
) {

  if(
    !ctx ||
    !session?.user ||
    !session.access_token
  ){
    clearAlertAuthCache();
    return;
  }

  durableAuth = {
    token: String(session.access_token),
    user: session.user
  };

  setAlertAuthCache(
    ctx,
    session.access_token
  );

}

function rememberDurableAuth(
session
){

  if(
    !session?.access_token ||
    !session?.user
  ){
    return null;
  }

  durableAuth = {
    token: String(session.access_token),
    user: session.user
  };

  return durableAuth;

}

function readSessionFromAppStorage(){

  if(
    typeof localStorage === "undefined"
  ){
    return null;
  }

  let raw;

  try{
    raw =
    localStorage.getItem(
      SUPABASE_AUTH_STORAGE_KEY
    );
  }catch{
    return null;
  }

  return parseSupabaseAuthRaw(raw);

}

function parseSupabaseAuthRaw(
raw
){

  if(!raw){
    return null;
  }

  try{
    const data =
    JSON.parse(raw);

    const session =
    data?.access_token
    ? data
    : data?.currentSession ||
    data?.session ||
    null;

    if(
      !session?.access_token ||
      !session?.user
    ){
      return null;
    }

    const exp =
    Number(session.expires_at) ||
    0;

    if(
      exp > 0 &&
      exp * 1000 < Date.now() - 5000
    ){
      return null;
    }

    return session;

  }catch{
    return null;
  }

}

function readSessionFromLocalStorage(
projectRef
) {

  if(
    !projectRef ||
    typeof localStorage === "undefined"
  ){
    return null;
  }

  let raw;

  try{
    raw =
    localStorage.getItem(
      `sb-${projectRef}-auth-token`
    );
  }catch{
    return null;
  }

  return parseSupabaseAuthRaw(raw);

}

/**
 * Синхронно: кэш или любой sb-*-auth-token (без getSession/getSupabase).
 */
export function readAlertTokenSync(){

  const hit =
  getCachedAlertAuth();

  if(hit?.token){
    return {
      token: hit.token,
      user: hit.ctx.user,
      ctx: hit.ctx
    };
  }

  if(
    durableAuth?.token &&
    durableAuth?.user
  ){
    return {
      token: durableAuth.token,
      user: durableAuth.user,
      ctx: cache?.ctx || null
    };
  }

  const appSession =
  readSessionFromAppStorage();

  if(appSession?.access_token){
    rememberDurableAuth(appSession);
    return {
      token: appSession.access_token,
      user: appSession.user,
      ctx: cache?.ctx || null
    };
  }

  if(
    typeof localStorage === "undefined"
  ){
    return null;
  }

  for(
    let i = 0;
    i < localStorage.length;
    i++
  ){

    const key =
    localStorage.key(i);

    if(
      !key?.startsWith("sb-") ||
      !key.endsWith("-auth-token")
    ){
      continue;
    }

    const session =
    parseSupabaseAuthRaw(
      localStorage.getItem(key)
    );

    if(session?.access_token){
      rememberDurableAuth(session);
      return {
        token: session.access_token,
        user: session.user,
        ctx: cache?.ctx || null
      };
    }

  }

  return null;

}

/**
 * Кэш → localStorage Supabase → null (без waitForCloudAuth).
 */
async function attachSupabaseToAuth(
syncHit
){

  if(
    !syncHit?.token ||
    !syncHit?.user
  ){
    return null;
  }

  if(
    syncHit.ctx?.sb &&
    syncHit.ctx?.user
  ){
    return {
      ctx: syncHit.ctx,
      token: syncHit.token
    };
  }

  try{
    const { getSupabase } =
    await import("./supabase-client.js?v=5");

    const sb =
    await Promise.race([
      getSupabase(),
      new Promise((_, reject)=>{
        setTimeout(
          ()=>reject(
            new Error("getSupabase timeout")
          ),
          3000
        );
      })
    ]);

    if(!sb){
      return {
        ctx: {
          sb: null,
          user: syncHit.user
        },
        token: syncHit.token
      };
    }

    const ctx = {
      sb,
      user: syncHit.user
    };

    setAlertAuthCache(
      ctx,
      syncHit.token
    );

    return {
      ctx,
      token: syncHit.token
    };

  }catch(err){
    console.warn(
      "[alerts] resolveAlertAuthFast (sb):",
      err?.message || err
    );

    return {
      ctx: {
        sb: null,
        user: syncHit.user
      },
      token: syncHit.token
    };

  }

}

export async function resolveAlertAuthFast() {

  const hit =
    getCachedAlertAuth();

  if(hit?.token){
    return hit;
  }

  const sync =
    readAlertTokenSync();

  if(sync?.token){
    return attachSupabaseToAuth(sync);
  }

  try{
    const env =
    await import("./supabase-env.js?v=4");

    const url =
    String(env.SUPABASE_URL || "").trim();

    if(!url){
      return null;
    }

    const projectRef =
    new URL(url).hostname.split(".")[0] ||
    "";

    const session =
    readSessionFromAppStorage() ||
    readSessionFromLocalStorage(projectRef);

    if(!session){
      return null;
    }

    return attachSupabaseToAuth({
      token: session.access_token,
      user: session.user,
      ctx: null
    });

  }catch(err){
    console.warn(
      "[alerts] resolveAlertAuthFast:",
      err?.message || err
    );
    return null;
  }

}
