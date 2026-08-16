/**
 * Algo diary period prefs — isolated from Terminal diary keys.
 */
import {
  getDefaultDiaryPeriod,
  resolveDiaryPreset,
  startOfDayMs,
  endOfDayMs
} from "./time-utils.js?v=1";

const PERIOD_STORAGE_KEY = "algo_trade_diary_period_v1";

function safeParse(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadSavedAlgoDiaryPeriod() {
  const saved = safeParse(localStorage.getItem(PERIOD_STORAGE_KEY));
  if (!saved || typeof saved !== "object") {
    return null;
  }

  if (saved.presetId) {
    const resolved = resolveDiaryPreset(saved.presetId);
    if (resolved) {
      return resolved;
    }
  }

  const startMs = Number(saved.startMs);
  const endMs = Number(saved.endMs);
  if (
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    endMs >= startMs
  ) {
    return {
      presetId: null,
      startMs: startOfDayMs(startMs),
      endMs: endOfDayMs(endMs),
      label: saved.label || "Период"
    };
  }

  return null;
}

export function saveAlgoDiaryPeriod(period) {
  if (!period || typeof period !== "object") {
    return;
  }
  try {
    localStorage.setItem(
      PERIOD_STORAGE_KEY,
      JSON.stringify({
        presetId: period.presetId || null,
        startMs: period.startMs,
        endMs: period.endMs,
        label: period.label || ""
      })
    );
  } catch {
    /* ignore quota */
  }
}

export function resolveInitialAlgoDiaryPeriod() {
  return loadSavedAlgoDiaryPeriod() || getDefaultDiaryPeriod();
}
