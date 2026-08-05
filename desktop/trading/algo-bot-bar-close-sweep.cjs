/**
 * Guaranteed TF bar-close scan for algo bot.
 * WS klines are best-effort; this REST (+ in-memory) sweep runs every closed bar
 * so the engine always "прогоняет" the watchlist on the strategy timeframe.
 */
const log = require("electron-log");

const CATCHUP_BARS = 200;
const GRACE_MS = 3_000;

/**
 * @param {object} deps
 * @param {() => object|null} deps.getEngineConfig
 * @param {() => Map<string, object>} deps.getSymbolStates
 * @param {(symbol: string) => object} deps.getState
 * @param {(tf: unknown) => number} deps.tfStepSeconds
 * @param {(tf: unknown) => string} deps.normalizeTf
 * @param {(timeoutBars: unknown) => number} deps.getMaxHistory
 * @param {(candles: object[], maxLen: number) => object[]} deps.trimCandles
 * @param {(symbol: string, source?: string) => Promise<void>} deps.armAllPendingSetups
 * @param {(symbol: string, prev: object|null, cur: object, barIndex: number) => Promise<void>} deps.processArmedOnBar
 * @param {(symbol: string, tf: unknown, limit: number) => Promise<{ ok?: boolean, candles?: object[], message?: string }>} deps.fetchKlineHistory
 * @param {(text: string) => void} deps.appendNote
 * @param {number} [deps.concurrency]
 */
function createBarCloseSweep(deps) {
  let timer = null;
  let running = false;
  let lastCloseSec = 0;
  const concurrency = Math.max(1, Number(deps.concurrency) || 6);

  function clear() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function expectedLastClosedOpenSec(tf) {
    const step = deps.tfStepSeconds(tf);
    if (!Number.isFinite(step) || step <= 0) {
      return 0;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.floor(nowSec / step) * step - step;
  }

  function schedule() {
    clear();
    const engineConfig = deps.getEngineConfig();
    if (!engineConfig) {
      return;
    }
    const stepMs = deps.tfStepSeconds(engineConfig.tf) * 1000;
    if (!Number.isFinite(stepMs) || stepMs <= 0) {
      return;
    }
    const delay = stepMs - (Date.now() % stepMs) + GRACE_MS;
    timer = setTimeout(() => {
      void run()
        .catch((err) => {
          log.warn("algo bot bar close sweep:", err?.message || err);
        })
        .finally(() => {
          if (deps.getEngineConfig()) {
            schedule();
          }
        });
    }, delay);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
  }

  async function catchUpSymbol(symbol, expectCloseSec) {
    const engineConfig = deps.getEngineConfig();
    const state = deps.getState(symbol);
    if (!engineConfig || !state?.seeded) {
      return { fetched: false };
    }

    const last = state.candles[state.candles.length - 1];
    const fresh = !!(last && Number(last.time) >= expectCloseSec);

    if (!fresh) {
      const result = await deps.fetchKlineHistory(
        symbol,
        engineConfig.tf,
        CATCHUP_BARS
      );
      if (!result?.ok || !Array.isArray(result.candles) || !result.candles.length) {
        log.warn(
          "algo bot bar close kline:",
          symbol,
          result?.message || "empty"
        );
        return { fetched: true, ok: false };
      }

      const byTime = new Map(state.candles.map((c) => [c.time, c]));
      for (const bar of result.candles) {
        byTime.set(bar.time, {
          time: bar.time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close
        });
      }

      state.candles = deps.trimCandles(
        [...byTime.values()].sort((a, b) => a.time - b.time),
        deps.getMaxHistory(engineConfig.timeoutBars)
      );
      state.forming = null;
      state.needsResync = false;
    }

    await deps.armAllPendingSetups(symbol, "live");

    const closedIndex = state.candles.length - 1;
    if (closedIndex >= 0) {
      const prev = closedIndex > 0 ? state.candles[closedIndex - 1] : null;
      const cur = state.candles[closedIndex];
      await deps.processArmedOnBar(symbol, prev, cur, closedIndex);
    }

    return { fetched: !fresh, ok: true };
  }

  async function run() {
    const engineConfig = deps.getEngineConfig();
    if (!engineConfig || running) {
      return;
    }

    const expectCloseSec = expectedLastClosedOpenSec(engineConfig.tf);
    if (!expectCloseSec || expectCloseSec === lastCloseSec) {
      return;
    }

    lastCloseSec = expectCloseSec;
    running = true;

    const symbols = [];
    let watchlistTotal = 0;
    for (const [sym, state] of deps.getSymbolStates()) {
      watchlistTotal += 1;
      if (state?.seeded) {
        symbols.push(sym);
      }
    }

    const tfLabel = deps.normalizeTf(engineConfig.tf);
    const pendingSeed = Math.max(0, watchlistTotal - symbols.length);
    deps.appendNote(
      pendingSeed > 0
        ? `прогон close tf=${tfLabel} · старт · ${symbols.length}/${watchlistTotal} (ещё seed ${pendingSeed})`
        : `прогон close tf=${tfLabel} · старт · ${symbols.length} тикеров`
    );

    let scanned = 0;
    let restFetched = 0;
    let i = 0;

    try {
      while (i < symbols.length) {
        if (!deps.getEngineConfig()) {
          break;
        }
        const batch = symbols.slice(i, i + concurrency);
        i += batch.length;
        const results = await Promise.all(
          batch.map((sym) =>
            catchUpSymbol(sym, expectCloseSec).catch((err) => {
              log.warn("algo bot bar close:", sym, err?.message || err);
              return null;
            })
          )
        );
        for (const row of results) {
          if (!row) {
            continue;
          }
          scanned += 1;
          if (row.fetched) {
            restFetched += 1;
          }
        }
      }

      deps.appendNote(
        `прогон close tf=${tfLabel} · готово · сканировано ${scanned}/${symbols.length} · REST догрузка ${restFetched}`
      );
      engineConfig.onActivity?.();
    } finally {
      running = false;
    }
  }

  return {
    schedule,
    clear,
    /** @internal tests */
    _runNow: run
  };
}

module.exports = {
  createBarCloseSweep,
  CATCHUP_BARS,
  GRACE_MS
};
