/**
 * Кэш сессии для алертов — не вызывать getSession() при каждом trigger/push.
 * Обновляется при входе и TOKEN_REFRESHED (cloud-sync.js).
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
