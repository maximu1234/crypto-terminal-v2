/**
 * Кэш JWT для алертов. Fallback: чтение сессии из localStorage Supabase
 * (без getSession(), который зависает при двух срабатываниях подряд).
 */

let cache = null;

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

  setAlertAuthCache(
    ctx,
    session.access_token
  );

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

  const key =
    `sb-${projectRef}-auth-token`;

  let raw;

  try{
    raw =
    localStorage.getItem(key);
  }catch{
    return null;
  }

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

/**
 * Кэш → localStorage Supabase → null (без waitForCloudAuth).
 */
export async function resolveAlertAuthFast() {

  const hit =
    getCachedAlertAuth();

  if(hit?.token){
    return hit;
  }

  try{
    const { getSupabase } =
    await import("./supabase-client.js?v=5");
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
    readSessionFromLocalStorage(projectRef);

    if(!session){
    return null;
    }

    const sb =
    await getSupabase();

    if(!sb){
    return null;
    }

    const ctx = {
    sb,
    user: session.user
    };

    setAlertAuthCache(
    ctx,
    session.access_token
    );

    return {
    ctx,
    token: session.access_token
    };

  }catch(err){
    console.warn(
    "[alerts] resolveAlertAuthFast:",
    err?.message || err
    );
    return null;
  }

}
