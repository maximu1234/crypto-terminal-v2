/**
 * RSI Touch Flip live bot — one independent contour per book row.
 * Isolated from Pattern 1-2 / Early T3 engines.
 */
const log = require("electron-log");
const algoRest = require("./algo-bybit-rest.cjs");
const {
  createAlgoBybitKlineHub,
  normalizeSymbol,
  normalizeTf
} = require("./algo-bybit-kline-ws.cjs");
const sessionLog = require("./algo-bot-session-log.cjs");
const {
  computeWilderRsiValues,
  notionalAt,
  projectClosedSourceRsiOntoChart,
  decideRsiTouchFlipBar,
  normalizeLivePrefs
} = require("./algo-bot-rsi-touch-flip-math.cjs");

const MAX_CANDLES = 4000;
const MAX_LOG = 40;
const SEED_KLINE_TIMEOUT_MS = 8000;
const SEED_CONCURRENCY = 3;
const WAIT_FLAT_MS = 5000;

/** @type {ReturnType<createAlgoBybitKlineHub>|null} */
let klineHub = null;
/** @type {(() => void)|null} */
let unsubKline = null;
/** @type {(( ) => void)|null} */
let onActivity = null;
/** @type {Map<string, object>} */
const tickers = new Map();
/** @type {object[]} */
const signalLog = [];
let lastSignalText = "";
let waitFlatTimer = null;

function emptyStatus() {
  return {
    symbol: "",
    tf: "",
    rsiTf: "",
    stack: 0,
    position: "flat",
    lastSignal: "",
    signals: [],
    prefs: null,
    entriesCount: 0,
    watchlistCount: 0,
    tickers: []
  };
}

function sameTf(a, b) {
  return normalizeTf(a) === normalizeTf(b);
}

function rsiSourceTf(state) {
  const raw = String(state?.prefs?.rsiTf || "").trim();
  if (!raw) {
    return state.tf;
  }
  return normalizeTf(raw);
}

function usesSeparateRsiTf(state) {
  return !sameTf(state.tf, rsiSourceTf(state));
}

function trimCandles(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length <= MAX_CANDLES) {
    return list;
  }
  return list.slice(list.length - MAX_CANDLES);
}

function appendClosed(list, bar) {
  const time = Number(bar?.time);
  if (!Number.isFinite(time)) {
    return list;
  }
  const last = list[list.length - 1];
  if (last && Number(last.time) === time) {
    list[list.length - 1] = bar;
    return trimCandles(list);
  }
  if (last && Number(last.time) > time) {
    return list;
  }
  list.push(bar);
  return trimCandles(list);
}

function mergeKline(candles, forming, candle) {
  const bar = {
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close
  };
  let promoted = false;
  let nextForming = forming;
  let nextCandles = candles;

  if (forming && Number(forming.time) < Number(bar.time)) {
    nextCandles = appendClosed(candles, forming);
    nextForming = null;
    promoted = true;
  }

  if (candle.confirm) {
    nextCandles = appendClosed(nextCandles, bar);
    return { candles: nextCandles, forming: null, closed: true };
  }

  return {
    candles: nextCandles,
    forming: bar,
    closed: promoted
  };
}

function pushSignal(row) {
  signalLog.unshift(row);
  if (signalLog.length > MAX_LOG) {
    signalLog.length = MAX_LOG;
  }
  lastSignalText = String(row.text || "");
  sessionLog.appendSignal?.(row);
  sessionLog.appendNote?.(row.text);
  onActivity?.();
}

function isLeverageError(result) {
  const msg = String(result?.message || result?.data?.retMsg || "").toLowerCase();
  return (
    msg.includes("leverage") ||
    msg.includes("lever") ||
    String(result?.data?.retCode || "") === "110043"
  );
}

async function openWithLeverageRetry(symbol, side, volumeUsdt) {
  let result = await algoRest.openPositionAtMarket(symbol, side, volumeUsdt);
  if (result?.ok !== false) {
    return result;
  }
  if (!isLeverageError(result)) {
    return result;
  }

  const settings = await algoRest.getSymbolPositionSettings(symbol);
  if (!settings?.ok) {
    return result;
  }

  const applyResult = await algoRest.applySymbolPositionSettings(symbol, {
    leverage: settings.maxLeverage,
    marginMode: settings.marginMode || "cross"
  });
  if (applyResult?.ok === false) {
    return result;
  }

  return algoRest.openPositionAtMarket(symbol, side, volumeUsdt);
}

function chartRsiSeries(state) {
  const prefs = state.prefs;
  if (!prefs) {
    return [];
  }
  if (!usesSeparateRsiTf(state)) {
    return computeWilderRsiValues(state.chartCandles, prefs.rsiLen);
  }
  const sourceRsi = computeWilderRsiValues(state.rsiCandles, prefs.rsiLen);
  return projectClosedSourceRsiOntoChart(
    state.chartCandles,
    state.tf,
    state.rsiCandles,
    rsiSourceTf(state),
    sourceRsi
  );
}

async function closeAll(state, reason, price) {
  const symbol = state.symbol;
  const result = await algoRest.closePositionAtMarket(symbol);
  const missing =
    result?.ok === false &&
    /нет открытой позиции/i.test(String(result?.message || ""));

  if (result?.ok === false && !missing) {
    pushSignal({
      ts: Date.now(),
      symbol,
      side: state.position,
      price,
      text: `Ошибка закрытия (${reason}): ${result.message || "fail"}`
    });
    return false;
  }

  const prev = state.position;
  state.position = "flat";
  state.stack = 0;
  state.botOwnsPosition = false;
  pushSignal({
    ts: Date.now(),
    symbol,
    side: prev,
    price,
    text: `Закрыть всё @ ${reason}${Number.isFinite(price) ? ` · ${price}` : ""}`
  });
  return true;
}

async function openSlice(state, side, level, price, label) {
  const prefs = state.prefs;
  const volumeUsdt = notionalAt(level, prefs);
  if (!(volumeUsdt > 0)) {
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      side,
      price,
      text: `Пропуск ${label}: объём 0`
    });
    return false;
  }

  const result = await openWithLeverageRetry(
    state.symbol,
    side === "long" ? "Buy" : "Sell",
    volumeUsdt
  );

  if (result?.ok === false) {
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      side,
      price,
      text: `Ошибка входа ${label}: ${result.message || "fail"}`
    });
    return false;
  }

  state.position = side;
  state.stack = level + 1;
  state.sessionEntries += 1;
  state.botOwnsPosition = true;
  pushSignal({
    ts: Date.now(),
    symbol: state.symbol,
    side,
    price,
    text: `${label} · ${volumeUsdt.toFixed(2)} USDT · стек ${state.stack}/${prefs.maxStack}${
      Number.isFinite(price) ? ` · ${price}` : ""
    }`
  });
  return true;
}

async function onClosedChartBar(state) {
  if (!state?.seeded || state.orderInflight || state.mode !== "trade") {
    return;
  }

  const i = state.chartCandles.length - 1;
  if (i < 1) {
    return;
  }

  const barTime = Number(state.chartCandles[i]?.time);
  if (Number.isFinite(barTime) && barTime <= state.lastHandledChartTime) {
    return;
  }
  if (Number.isFinite(barTime)) {
    state.lastHandledChartTime = barTime;
  }

  const rsiValues = chartRsiSeries(state);
  const rsi = Number(rsiValues[i]);
  const prevRsi = Number(rsiValues[i - 1]);
  const price = Number(state.chartCandles[i]?.close);
  const prefs = state.prefs;
  const decision = decideRsiTouchFlipBar({
    rsi,
    prevRsi,
    osLevel: prefs.osLevel,
    obLevel: prefs.obLevel,
    stack: state.stack,
    position: state.position,
    maxStack: prefs.maxStack,
    allowLong: prefs.allowLong,
    allowShort: prefs.allowShort
  });

  if (
    !decision.closeShort &&
    !decision.closeLong &&
    !decision.openLong &&
    !decision.openShort
  ) {
    return;
  }

  state.orderInflight = true;
  try {
    if (decision.closeShort) {
      const ok = await closeAll(state, "OS", price);
      if (!ok) {
        return;
      }
    }
    if (decision.openLong) {
      await openSlice(
        state,
        "long",
        decision.longLevel,
        price,
        decision.longLevel === 0 ? "LONG @ OS" : "LONG add @ OS"
      );
    }
    if (decision.closeLong) {
      const ok = await closeAll(state, "OB", price);
      if (!ok) {
        return;
      }
    }
    if (decision.openShort) {
      await openSlice(
        state,
        "short",
        decision.shortLevel,
        price,
        decision.shortLevel === 0 ? "SHORT @ OB" : "SHORT add @ OB"
      );
    }
  } catch (err) {
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      text: `Ошибка бара: ${err?.message || err}`
    });
    log.warn("rsi touch flip bar:", state.symbol, err?.message || err);
  } finally {
    state.orderInflight = false;
    onActivity?.();
  }
}

function onKline(symbol, tf, candle) {
  const state = tickers.get(normalizeSymbol(symbol));
  if (!state?.seeded) {
    return;
  }

  const chartHit = sameTf(tf, state.tf);
  const rsiHit = usesSeparateRsiTf(state) && sameTf(tf, rsiSourceTf(state));
  if (!chartHit && !rsiHit) {
    return;
  }

  if (rsiHit) {
    const next = mergeKline(state.rsiCandles, state.rsiForming, candle);
    state.rsiCandles = next.candles;
    state.rsiForming = next.forming;
  }

  if (chartHit) {
    const next = mergeKline(state.chartCandles, state.chartForming, candle);
    state.chartCandles = next.candles;
    state.chartForming = next.forming;
    if (next.closed) {
      void onClosedChartBar(state);
    }
  }
}

async function seedSeries(symbol, tf, rsiLen) {
  const need = Math.min(
    3,
    Math.max(1, Math.ceil((Number(rsiLen) + 20) / 1000))
  );
  const result = await algoRest.fetchKlineHistoryDeep(
    symbol,
    tf,
    need,
    0,
    SEED_KLINE_TIMEOUT_MS
  );
  if (!result?.ok || !Array.isArray(result.candles) || !result.candles.length) {
    throw new Error(result?.message || `Нет истории ${symbol} ${tf}`);
  }
  return trimCandles(result.candles);
}

function positionSymbol(row) {
  return normalizeSymbol(row?.symbol || row?.ticker);
}

async function refreshWaitFlat() {
  const waiting = [...tickers.values()].filter((row) => row.mode === "wait-flat");
  if (!waiting.length) {
    return;
  }

  const posResult = await algoRest.getPositions();
  if (posResult?.ok === false) {
    return;
  }

  const open = new Set(
    (Array.isArray(posResult?.positions) ? posResult.positions : [])
      .map(positionSymbol)
      .filter(Boolean)
  );

  for (const state of waiting) {
    if (open.has(state.symbol)) {
      continue;
    }
    state.mode = "trade";
    state.position = "flat";
    state.stack = 0;
    state.botOwnsPosition = false;
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      text: `${state.symbol}: позиция закрылась, начинаем торговлю`
    });
  }
}

function startWaitFlatLoop() {
  stopWaitFlatLoop();
  waitFlatTimer = setInterval(() => {
    void refreshWaitFlat().catch((err) => {
      log.warn("rsi touch flip wait-flat:", err?.message || err);
    });
  }, WAIT_FLAT_MS);
}

function stopWaitFlatLoop() {
  if (waitFlatTimer) {
    clearInterval(waitFlatTimer);
    waitFlatTimer = null;
  }
}

async function mapPool(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let cursor = 0;

  async function worker() {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(list[index], index);
    }
  }

  const n = Math.max(1, Math.min(limit, list.length) || 1);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

function normalizeBookRows(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const bySymbol = new Map();
  for (const item of list) {
    const symbol = normalizeSymbol(item?.symbol);
    const tf = normalizeTf(item?.tf);
    if (!symbol || !tf) {
      continue;
    }
    bySymbol.set(symbol, {
      symbol,
      tf,
      prefs: normalizeLivePrefs(item.prefs || item)
    });
  }
  return [...bySymbol.values()];
}

async function startRsiTouchFlipEngine(config = {}) {
  if (tickers.size) {
    throw new Error("RSI Touch Flip уже запущен");
  }

  const rows = normalizeBookRows(config.rows || config.book);
  if (!rows.length) {
    throw new Error("Книга RSI Touch Flip пуста — добавьте тикеры в панели Данные");
  }

  onActivity = typeof config.onActivity === "function" ? config.onActivity : null;
  signalLog.length = 0;
  lastSignalText = "";

  klineHub = createAlgoBybitKlineHub();
  unsubKline = klineHub.onKline(onKline);

  const failures = [];
  await mapPool(rows, SEED_CONCURRENCY, async (row) => {
    const state = {
      symbol: row.symbol,
      tf: row.tf,
      prefs: {
        ...row.prefs,
        rsiTf: String(row.prefs.rsiTf || "").trim()
      },
      mode: "wait-flat",
      chartCandles: [],
      chartForming: null,
      rsiCandles: [],
      rsiForming: null,
      seeded: false,
      orderInflight: false,
      position: "flat",
      stack: 0,
      sessionEntries: 0,
      lastHandledChartTime: 0,
      botOwnsPosition: false
    };

    try {
      const pos = await algoRest.getPosition(state.symbol);
      if (pos?.ok === false) {
        throw new Error(pos.message || `Не удалось проверить позицию ${state.symbol}`);
      }
      if (pos?.position) {
        state.mode = "wait-flat";
      } else {
        state.mode = "trade";
      }

      state.chartCandles = await seedSeries(
        state.symbol,
        state.tf,
        state.prefs.rsiLen
      );
      state.lastHandledChartTime =
        Number(state.chartCandles[state.chartCandles.length - 1]?.time) || 0;

      if (usesSeparateRsiTf(state)) {
        state.rsiCandles = await seedSeries(
          state.symbol,
          rsiSourceTf(state),
          state.prefs.rsiLen
        );
      }

      state.seeded = true;
      tickers.set(state.symbol, state);
      klineHub.ensureKline(state.symbol, state.tf);
      if (usesSeparateRsiTf(state)) {
        klineHub.ensureKline(state.symbol, rsiSourceTf(state));
      }

      const rsiTfLabel = usesSeparateRsiTf(state) ? rsiSourceTf(state) : "график";
      sessionLog.appendNote?.(
        `${state.symbol} chart=${state.tf} rsiTf=${rsiTfLabel} RSI=${state.prefs.rsiLen} OS=${state.prefs.osLevel} OB=${state.prefs.obLevel} side=${state.prefs.tradeSide} stack=${state.prefs.maxStack} budget=${state.prefs.budget} ${state.mode}`
      );
    } catch (err) {
      failures.push(`${row.symbol}: ${err?.message || err}`);
    }
  });

  if (!tickers.size) {
    await stopRsiTouchFlipEngine();
    throw new Error(failures[0] || "Не удалось запустить ни один тикер из книги");
  }

  if (failures.length) {
    sessionLog.appendNote?.(
      `Пропущены: ${failures.join("; ")}`
    );
  }

  startWaitFlatLoop();
  void refreshWaitFlat();
  log.info("rsi touch flip engine started", {
    tickers: [...tickers.keys()],
    skipped: failures.length
  });
}

async function stopRsiTouchFlipEngine() {
  stopWaitFlatLoop();
  if (unsubKline) {
    unsubKline();
    unsubKline = null;
  }
  if (klineHub) {
    klineHub.close();
    klineHub = null;
  }

  const owned = [...tickers.values()].filter(
    (row) => row.botOwnsPosition || (row.mode === "trade" && row.position !== "flat")
  );
  for (const state of owned) {
    try {
      const closeResult = await algoRest.closePositionAtMarket(state.symbol);
      if (closeResult?.ok === false) {
        sessionLog.appendNote?.(
          `Стоп ${state.symbol}: позиция не закрыта (${closeResult.message || "fail"})`
        );
      } else {
        sessionLog.appendNote?.(`Стоп ${state.symbol}: позиция закрыта`);
      }
    } catch (err) {
      sessionLog.appendNote?.(
        `Стоп ${state.symbol}: не закрыл позицию (${err?.message || err})`
      );
    }
  }

  tickers.clear();
  onActivity = null;
  signalLog.length = 0;
  lastSignalText = "";
}

function getRsiTouchFlipEngineStatus() {
  if (!tickers.size) {
    return emptyStatus();
  }

  const list = [...tickers.values()];
  const first = list[0];
  const inPos = list.filter((row) => row.position !== "flat");
  return {
    symbol: first.symbol,
    tf: first.tf,
    rsiTf: rsiSourceTf(first),
    stack: inPos[0]?.stack || 0,
    position: inPos[0]?.position || "flat",
    lastSignal: lastSignalText,
    signals: signalLog.slice(0, MAX_LOG),
    prefs: first.prefs,
    entriesCount: list.reduce((sum, row) => sum + (row.sessionEntries || 0), 0),
    watchlistCount: list.length,
    tickers: list.map((row) => ({
      symbol: row.symbol,
      tf: row.tf,
      mode: row.mode,
      position: row.position,
      stack: row.stack,
      budget: row.prefs.budget
    }))
  };
}

module.exports = {
  startRsiTouchFlipEngine,
  stopRsiTouchFlipEngine,
  getRsiTouchFlipEngineStatus
};
