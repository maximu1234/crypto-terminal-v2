/**
 * While RSI Touch Flip is running, refit book tickers on the stored period.
 * Same grid as the «Подобрать» button: only a green-Test set is written back.
 * Lives in the main process so tray/agent mode still runs it.
 */
const path = require("path");
const { pathToFileURL } = require("node:url");
const { register } = require("node:module");
const log = require("electron-log");
const sessionLog = require("./algo-bot-session-log.cjs");
const algoRest = require("./algo-bybit-rest.cjs");

const CHECK_MS = 60 * 1000;
const HISTORY_REQUESTS = 10;
const TRAIN_PCT = 70;
const MAX_FIT_ATTEMPTS = 3;
const PERIOD_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000
};

let api = null;
let timer = null;
let modsPromise = null;
let passPromise = null;
let stopRequested = false;
let activeSignal = null;

function loadMods() {
  if (!modsPromise) {
    modsPromise = (async () => {
      const parentURL = pathToFileURL(__filename).href;
      register(
        pathToFileURL(path.join(__dirname, "algo-asset-query-loader.mjs")).href,
        parentURL
      );
      const root = path.join(__dirname, "../../js/algo-trading");
      const optimize = await import(
        pathToFileURL(path.join(root, "rsi-touch-flip-optimize.js")).href
      );
      const mtf = await import(
        pathToFileURL(path.join(root, "rsi-touch-flip-mtf.js")).href
      );
      const prefs = await import(
        pathToFileURL(path.join(root, "rsi-touch-flip-prefs.js")).href
      );
      const history = await import(
        pathToFileURL(path.join(root, "rsi-touch-flip-history.js")).href
      );
      return { optimize, mtf, prefs, history };
    })().catch((err) => {
      modsPromise = null;
      throw err;
    });
  }
  return modsPromise;
}

async function loadHistory(symbol, tf, requests, mods) {
  const history = await mods.history.loadRsiTouchFlipFitCandles({
    symbol,
    tf,
    pages: requests || HISTORY_REQUESTS,
    fetchPage: (query) => algoRest.fetchKlinePage(query)
  });
  if (!history.ok) {
    throw new Error(history.message || `нет свечей ${symbol} ${tf}`);
  }
  return history;
}

function prefsPatch(prefs) {
  return {
    rsiLen: prefs.rsiLen,
    osLevel: prefs.osLevel,
    obLevel: prefs.obLevel,
    maxStack: prefs.maxStack
  };
}

function samePatch(row, patch) {
  return (
    Number(row?.prefs?.rsiLen) === Number(patch.rsiLen) &&
    Number(row?.prefs?.osLevel) === Number(patch.osLevel) &&
    Number(row?.prefs?.obLevel) === Number(patch.obLevel) &&
    Number(row?.prefs?.maxStack) === Number(patch.maxStack)
  );
}

function note(text) {
  try {
    sessionLog.appendNote?.(text);
  } catch {
    /* session file may be idle */
  }
  log.info(text);
}

async function fitRow(row, mods, signal) {
  async function loadSourceHistory(symbol, tf, requests) {
    const history = await loadHistory(symbol, tf, requests, mods);
    return history.candles;
  }

  const history = await loadHistory(row.symbol, row.tf, HISTORY_REQUESTS, mods);
  if (signal.cancelled) {
    return null;
  }
  if (!history.ok) {
    return {
      ok: false,
      symbol: row.symbol,
      tf: row.tf,
      error: history.message || "история неполная"
    };
  }
  const candles = history.candles;
  const rsiByLen = new Map();
  const lengths = mods.optimize.RSI_TOUCH_FLIP_LEN_GRID;
  for (const rsiLen of lengths) {
    if (signal.cancelled) {
      return null;
    }
    const rsi = await mods.mtf.resolveRsiTouchFlipChartRsi(
      candles,
      { ...row.prefs, rsiLen },
      {
        chartTf: row.tf,
        symbol: row.symbol,
        loadHistory: loadSourceHistory
      }
    );
    if (!Array.isArray(rsi) || rsi.length !== candles.length) {
      return {
        ok: false,
        symbol: row.symbol,
        tf: row.tf,
        error: `RSI ${rsiLen} посчитан не на всех ${candles.length} свечах`
      };
    }
    rsiByLen.set(rsiLen, rsi);
  }
  if (signal.cancelled) {
    return null;
  }
  const result = await mods.optimize.optimizeRsiTouchFlipParams({
    candles,
    rsiByLen,
    basePrefs: row.prefs,
    chartTf: row.tf,
    trainPct: TRAIN_PCT,
    yieldEvery: 8,
    signal
  });
  if (result?.cancelled) {
    return null;
  }
  if (result?.incomplete) {
    return {
      ok: false,
      symbol: row.symbol,
      tf: row.tf,
      error: result.error || "сетка посчитана не целиком"
    };
  }
  const pick = result?.bestTradable;
  if (!pick?.prefs) {
    note(
      `Автоподбор ${row.symbol}: нет набора с зелёным Test, параметры не менял`
    );
    return { ok: true, symbol: row.symbol, tf: row.tf, patch: null, completed: true };
  }
  const patch = prefsPatch(pick.prefs);
  if (samePatch(row, patch)) {
    note(
      `Автоподбор ${row.symbol}: уже RSI ${patch.rsiLen} OS ${patch.osLevel} OB ${patch.obLevel} стек ${patch.maxStack}`
    );
    return { ok: true, symbol: row.symbol, tf: row.tf, patch: null, completed: true };
  }
  const young = history.young ? ` ${history.message}` : "";
  note(
    `Автоподбор ${row.symbol}: RSI ${patch.rsiLen} OS ${patch.osLevel} OB ${patch.obLevel} стек ${patch.maxStack}.${young}`
  );
  return { ok: true, symbol: row.symbol, tf: row.tf, patch, completed: true };
}

async function runPass() {
  if (!api || passPromise) {
    return passPromise;
  }
  const book = api.readBook();
  const period = String(book?.autoFitPeriod || "");
  const periodMs = PERIOD_MS[period] || 0;
  const lastAt = Number(book?.autoFitLastAt) || 0;
  const rows = Array.isArray(book?.rows) ? book.rows : [];
  if (
    !(periodMs > 0) ||
    !api.isRunning() ||
    !rows.length ||
    (lastAt > 0 && Date.now() - lastAt < periodMs)
  ) {
    return null;
  }

  stopRequested = false;
  const signal = { cancelled: false };
  activeSignal = signal;
  passPromise = (async () => {
    const mods = await loadMods();
    const fitted = [];
    let completed = 0;
    const attempts = book?.autoFitRetry === true ? MAX_FIT_ATTEMPTS : 1;
    note(
      `Автоподбор RSI Flip: ${rows.length} тик., период ${period}`
    );
    for (const row of rows) {
      if (stopRequested || !api.isRunning()) {
        signal.cancelled = true;
        break;
      }
      let fit = null;
      let error = "";
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        if (stopRequested || !api.isRunning()) {
          signal.cancelled = true;
          break;
        }
        try {
          fit = await fitRow(row, mods, signal);
        } catch (err) {
          fit = {
            ok: false,
            error: err?.message || String(err)
          };
        }
        if (!fit) {
          signal.cancelled = true;
          break;
        }
        if (fit.ok) {
          break;
        }
        error = fit.error || "сбой подбора";
        note(
          `Автоподбор ${row.symbol}: попытка ${attempt} из ${attempts} — ${error}`
        );
        fit = null;
      }
      if (signal.cancelled) {
        break;
      }
      if (!fit?.ok) {
        note(
          `Автоподбор ${row.symbol}: после ${attempts} попыток оставлены прежние параметры`
        );
        completed += 1;
        continue;
      }
      completed += 1;
      if (fit.patch) {
        fitted.push(fit);
      }
    }
    if (signal.cancelled || !api.isRunning() || completed === 0) {
      if (completed === 0 && !signal.cancelled) {
        note("Автоподбор RSI Flip: ни один тикер не посчитан, повторю позже");
      }
      return;
    }
    const latest = api.readBook();
    const bySymbol = new Map(fitted.map((row) => [row.symbol, row]));
    const merged = (latest.rows || []).map((row) => {
      const fit = bySymbol.get(row.symbol);
      if (!fit || fit.tf !== row.tf) {
        return row;
      }
      return {
        ...row,
        prefs: {
          ...row.prefs,
          ...fit.patch
        }
      };
    });
    await api.applyBook({
      book: merged,
      rows: merged,
      balancePct: latest.balancePct,
      marginMode: latest.marginMode,
      leverage: latest.leverage,
      autoFitPeriod: latest.autoFitPeriod,
      autoFitLastAt: Date.now()
    });
  })().catch((err) => {
    log.warn("rsi touch flip auto fit:", err?.message || err);
  }).finally(() => {
    if (activeSignal === signal) {
      activeSignal = null;
    }
    passPromise = null;
  });
  return passPromise;
}

function poke() {
  if (!api) {
    return;
  }
  void runPass();
}

function attach(next) {
  api = next;
  if (timer) {
    return;
  }
  timer = setInterval(poke, CHECK_MS);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
}

function requestStop() {
  stopRequested = true;
  if (activeSignal) {
    activeSignal.cancelled = true;
  }
}

module.exports = {
  attach,
  poke,
  requestStop
};
