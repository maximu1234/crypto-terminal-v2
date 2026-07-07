import {
  restGetSystemSetting,
  restUpsertSystemSetting
} from "./supabase-rest.js";

const MIN_RELOAD_MS = 3 * 1000;
const MAX_RELOAD_MS = 60 * 60 * 1000;
const SETTING_KEY = "alerts_worker_reload_ms";

let reloadMs = Math.max(
  MIN_RELOAD_MS,
  Math.min(
    MAX_RELOAD_MS,
    Number(process.env.ALERTS_RELOAD_MS) || 30 * 60 * 1000
  )
);

let hydrated = false;
let hydratePromise = null;

export function getReloadIntervalMs() {

  return reloadMs;

}

export function getReloadIntervalLimitsMs() {

  return {
    min: MIN_RELOAD_MS,
    max: MAX_RELOAD_MS
  };

}

export function setReloadIntervalMs(nextMs) {

  const num =
    Number(nextMs);

  if (!Number.isFinite(num)) {
    throw new Error("bad_reload_ms");
  }

  const clamped =
    Math.max(
      MIN_RELOAD_MS,
      Math.min(
        MAX_RELOAD_MS,
        Math.round(num)
      )
    );

  reloadMs =
    clamped;

  return reloadMs;

}

export async function ensureReloadIntervalHydrated() {

  if (hydrated) {
    return reloadMs;
  }

  if (hydratePromise) {
    await hydratePromise;
    return reloadMs;
  }

  hydratePromise = (async () => {
    try{
      const row =
        await restGetSystemSetting(SETTING_KEY);
      const sec =
        Number(row?.value?.seconds);

      if (Number.isFinite(sec)) {
        setReloadIntervalMs(sec * 1000);
      }
    }catch(err){
      console.warn(
        "worker reload hydrate:",
        err?.message || err
      );
    }finally{
      hydrated = true;
      hydratePromise = null;
    }
  })();

  await hydratePromise;
  return reloadMs;

}

export async function saveReloadIntervalSeconds(seconds) {

  const appliedMs =
    setReloadIntervalMs(Number(seconds) * 1000);
  const appliedSec =
    Math.round(appliedMs / 1000);

  await restUpsertSystemSetting(
    SETTING_KEY,
    {
      seconds: appliedSec
    }
  );

  return appliedMs;

}
