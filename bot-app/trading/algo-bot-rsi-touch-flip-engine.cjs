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
  normalizeLivePrefs,
  livePrefsFingerprint,
  planRsiTouchFlipBookSync,
  normalizeBalancePct,
  normalizeMarginMode,
  allocatedBalanceUsdt,
  equalShareBudget,
  rsiTouchFlipCycleSlHit,
  rsiTouchFlipLocalLooksOpen,
  rsiTouchFlipOpenLooksFilled,
  rsiTouchFlipShouldFlattenGhost
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
let engineLive = false;
let syncBusy = false;
/** @type {object[]|null} */
let queuedBookRows = null;
/** @type {number|null} */
let queuedBalancePct = null;
/** @type {"cross"|"isolated"|null} */
let queuedMarginMode = null;
let allocPct = 100;
let allocatedUsdt = 0;
/** @type {"cross"|"isolated"} */
let sessionMarginMode = "cross";
let startCancelRequested = false;

function requestRsiTouchFlipStartCancel() {
  startCancelRequested = true;
}

function clearRsiTouchFlipStartCancel() {
  startCancelRequested = false;
}

function isRsiTouchFlipStartCancelled() {
  return startCancelRequested;
}

function throwIfRsiTouchFlipStartCancelled() {
  if (startCancelRequested) {
    throw new Error("Запуск RSI Touch Flip отменён");
  }
}

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

async function openWithLeverageRetry(state, side, volumeUsdt) {
  const symbol = state.symbol;
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
    marginMode: wantedMarginMode()
  });
  if (applyResult?.ok === false) {
    return result;
  }

  return algoRest.openPositionAtMarket(symbol, side, volumeUsdt);
}

function wantedMarginMode() {
  return sessionMarginMode === "isolated" ? "isolated" : "cross";
}

async function ensureTickerMarginMode(state) {
  const wanted = wantedMarginMode();
  const settings = await algoRest.getSymbolPositionSettings(state.symbol);
  if (!settings?.ok) {
    return settings;
  }
  if (settings.marginMode === wanted) {
    return { ok: true };
  }
  if (state.position !== "flat" || state.mode === "wait-flat") {
    return { ok: true, deferred: true };
  }
  return algoRest.applySymbolPositionSettings(state.symbol, {
    leverage: settings.leverage,
    marginMode: wanted
  });
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

function flattenLocalToFlat(state) {
  if (!state) {
    return;
  }
  state.position = "flat";
  state.stack = 0;
  state.botOwnsPosition = false;
  state.entryBudget = null;
}

async function flattenGhostIfMissing(state, posResult, price) {
  if (!rsiTouchFlipShouldFlattenGhost(state, posResult)) {
    return false;
  }
  const prev = state.position;
  flattenLocalToFlat(state);
  try {
    await refreshShareBudgets();
  } catch (err) {
    log.warn("rsi touch flip share after ghost flatten:", err?.message || err);
  }
  pushSignal({
    ts: Date.now(),
    symbol: state.symbol,
    side: prev,
    price,
    text: `${state.symbol}: позиция на бирже исчезла, сбрасываем`
  });
  return true;
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
  flattenLocalToFlat(state);
  try {
    await refreshShareBudgets();
  } catch (err) {
    log.warn("rsi touch flip share after close:", err?.message || err);
  }
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
  const startingFlat = state.stack === 0;
  const margin = await ensureTickerMarginMode(state);
  if (margin?.ok === false) {
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      side,
      price,
      text: `Пропуск ${label}: не выставил ${wantedMarginMode()} (${margin.message || "fail"})`
    });
    return false;
  }
  const budget = sliceBudget(state);
  const volumeUsdt = notionalAt(level, {
    ...prefs,
    budget
  });
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
    state,
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

  if (!rsiTouchFlipOpenLooksFilled(result)) {
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      side,
      price,
      text: `Ошибка входа ${label}: ордер принят, позиции на бирже нет`
    });
    return false;
  }

  state.position = side;
  state.stack = level + 1;
  state.sessionEntries += 1;
  state.botOwnsPosition = true;
  if (startingFlat) {
    state.entryBudget = budget;
  }
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

  if (state.slBlockLong && Number.isFinite(rsi) && rsi > prefs.osLevel) {
    state.slBlockLong = false;
  }
  if (state.slBlockShort && Number.isFinite(rsi) && rsi < prefs.obLevel) {
    state.slBlockShort = false;
  }

  let posResult = null;
  if (rsiTouchFlipLocalLooksOpen(state)) {
    posResult = await algoRest.getPosition(state.symbol);
    await flattenGhostIfMissing(state, posResult, price);
  }

  let cycleSlHit = false;
  if (
    prefs.cycleSlEnabled === true &&
    state.botOwnsPosition &&
    state.position !== "flat"
  ) {
    if (!posResult) {
      posResult = await algoRest.getPosition(state.symbol);
    }
    const pnl = Number(posResult?.position?.pnl);
    const cap =
      Number(state.entryBudget) > 0
        ? Number(state.entryBudget)
        : sliceBudget(state);
    cycleSlHit = rsiTouchFlipCycleSlHit(pnl, cap, prefs);
  }

  if (cycleSlHit && state.position === "long") {
    state.slBlockLong = true;
  }
  if (cycleSlHit && state.position === "short") {
    state.slBlockShort = true;
  }

  const decision = decideRsiTouchFlipBar({
    rsi,
    prevRsi,
    osLevel: prefs.osLevel,
    obLevel: prefs.obLevel,
    stack: state.stack,
    position: state.position,
    maxStack: prefs.maxStack,
    allowLong: prefs.allowLong,
    allowShort: prefs.allowShort,
    slBlockLong: state.slBlockLong,
    slBlockShort: state.slBlockShort
  });

  if (
    !cycleSlHit &&
    !decision.closeShort &&
    !decision.closeLong &&
    !decision.openLong &&
    !decision.openShort
  ) {
    return;
  }

  state.orderInflight = true;
  try {
    if (cycleSlHit) {
      const ok = await closeAll(state, "CYCLE SL", price);
      if (!ok) {
        return;
      }
    }
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
  if (!engineLive) {
    return;
  }
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
  const owned = [...tickers.values()].filter(
    (row) =>
      row.mode === "trade" &&
      !row.orderInflight &&
      rsiTouchFlipLocalLooksOpen(row)
  );
  if (!waiting.length && !owned.length) {
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
    flattenLocalToFlat(state);
    state.slBlockLong = false;
    state.slBlockShort = false;
    try {
      await ensureTickerMarginMode(state);
    } catch (err) {
      log.warn("rsi touch flip margin after wait-flat:", err?.message || err);
    }
    pushSignal({
      ts: Date.now(),
      symbol: state.symbol,
      text: `${state.symbol}: позиция закрылась, начинаем торговлю`
    });
  }
  for (const state of owned) {
    await flattenGhostIfMissing(
      state,
      { ok: true, position: open.has(state.symbol) ? { symbol: state.symbol } : null },
      lastChartPrice(state)
    );
  }
  if ([...tickers.values()].some((row) => row.mode === "trade" && row.position === "flat")) {
    try {
      await refreshShareBudgets();
    } catch (err) {
      log.warn("rsi touch flip share after wait-flat:", err?.message || err);
    }
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

function walletAvailableUsdt(wallet) {
  const available = Number(wallet?.available);
  const usdt = Number(wallet?.usdt);
  if (Number.isFinite(available) && available > 0) {
    return available;
  }
  if (Number.isFinite(usdt) && usdt > 0) {
    return usdt;
  }
  if (Number.isFinite(available) && available >= 0) {
    return available;
  }
  if (Number.isFinite(usdt)) {
    return usdt;
  }
  return NaN;
}

async function refreshWalletAllocated() {
  const wallet = await algoRest.getWalletBalance();
  const available = walletAvailableUsdt(wallet);
  allocatedUsdt = allocatedBalanceUsdt(available, allocPct);
  return allocatedUsdt;
}

function applyShareBudgets() {
  const share = equalShareBudget(allocatedUsdt, tickers.size);
  for (const state of tickers.values()) {
    state.prefs = {
      ...state.prefs,
      budget: share
    };
  }
  return share;
}

async function refreshShareBudgets() {
  await refreshWalletAllocated();
  return applyShareBudgets();
}

function sliceBudget(state) {
  if (state.stack > 0 && Number(state.entryBudget) > 0) {
    return Number(state.entryBudget);
  }
  return Number(state.prefs.budget);
}

function tickerNote(state) {
  const rsiTfLabel = usesSeparateRsiTf(state) ? rsiSourceTf(state) : "график";
  return `${state.symbol} chart=${state.tf} rsiTf=${rsiTfLabel} RSI=${state.prefs.rsiLen} OS=${state.prefs.osLevel} OB=${state.prefs.obLevel} side=${state.prefs.tradeSide} stack=${state.prefs.maxStack} budget=${state.prefs.budget} margin=${wantedMarginMode()} ${state.mode}`;
}

function lastChartPrice(state) {
  const close = Number(state?.chartCandles?.[state.chartCandles.length - 1]?.close);
  return Number.isFinite(close) ? close : undefined;
}

async function waitNotInflight(state, ms = 15000) {
  const started = Date.now();
  while (state?.orderInflight && Date.now() - started < ms) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function subscribeStateKlines(state) {
  if (!klineHub || !state) {
    return;
  }
  klineHub.ensureKline(state.symbol, state.tf);
  if (usesSeparateRsiTf(state)) {
    klineHub.ensureKline(state.symbol, rsiSourceTf(state));
  }
}

function unsubscribeStateKlines(state) {
  if (!klineHub || !state) {
    return;
  }
  klineHub.releaseKline(state.symbol, state.tf);
  const rsiTf = rsiSourceTf(state);
  if (!sameTf(state.tf, rsiTf)) {
    klineHub.releaseKline(state.symbol, rsiTf);
  }
}

async function seedTicker(row) {
  const state = {
    symbol: row.symbol,
    tf: row.tf,
    prefs: {
      ...row.prefs,
      rsiTf: String(row.prefs.rsiTf || "").trim(),
      budget: 0
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
    botOwnsPosition: false,
    entryBudget: null,
    slBlockLong: false,
    slBlockShort: false
  };

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
  subscribeStateKlines(state);
  if (state.mode === "trade") {
    try {
      await ensureTickerMarginMode(state);
    } catch (err) {
      log.warn("rsi touch flip margin on seed:", err?.message || err);
    }
  }
  sessionLog.appendNote?.(tickerNote(state));
  return state;
}

async function dropTicker(state, reason) {
  if (!state) {
    return;
  }
  await waitNotInflight(state);
  const shouldClose =
    state.botOwnsPosition ||
    (state.mode === "trade" && state.position !== "flat");
  if (shouldClose) {
    const closed = await closeAll(state, reason, lastChartPrice(state));
    if (!closed) {
      throw new Error("не закрыл позицию — тикер остаётся в live");
    }
  }
  unsubscribeStateKlines(state);
  tickers.delete(state.symbol);
  sessionLog.appendNote?.(`${state.symbol}: снят с live (${reason})`);
}

async function reseedSeries(state) {
  state.chartCandles = await seedSeries(
    state.symbol,
    state.tf,
    state.prefs.rsiLen
  );
  state.chartForming = null;
  state.lastHandledChartTime =
    Number(state.chartCandles[state.chartCandles.length - 1]?.time) || 0;
  if (usesSeparateRsiTf(state)) {
    state.rsiCandles = await seedSeries(
      state.symbol,
      rsiSourceTf(state),
      state.prefs.rsiLen
    );
    state.rsiForming = null;
  } else {
    state.rsiCandles = [];
    state.rsiForming = null;
  }
}

async function applyTickerUpdate(state, row) {
  await waitNotInflight(state);
  const prevTf = state.tf;
  const prevRsiTf = rsiSourceTf(state);
  const liveBudget = Number(state.prefs?.budget);
  const nextPrefs = {
    ...row.prefs,
    rsiTf: String(row.prefs.rsiTf || "").trim(),
    budget:
      Number.isFinite(liveBudget) && liveBudget > 0 ? liveBudget : 0
  };
  const nextTf = row.tf;
  const nextRsiTf = rsiSourceTf({ tf: nextTf, prefs: nextPrefs });
  const needReseed =
    !sameTf(prevTf, nextTf) ||
    !sameTf(prevRsiTf, nextRsiTf) ||
    Number(state.prefs.rsiLen) !== Number(nextPrefs.rsiLen);

  if (needReseed) {
    unsubscribeStateKlines(state);
  }

  state.tf = nextTf;
  state.prefs = nextPrefs;

  if (needReseed) {
    await reseedSeries(state);
    subscribeStateKlines(state);
  }

  if (state.position === "flat" && state.mode === "trade") {
    try {
      await ensureTickerMarginMode(state);
    } catch (err) {
      log.warn("rsi touch flip margin on update:", err?.message || err);
    }
  }

  sessionLog.appendNote?.(
    `${state.symbol}: параметры обновлены · ${tickerNote(state)}`
  );
  pushSignal({
    ts: Date.now(),
    symbol: state.symbol,
    side: state.position,
    price: lastChartPrice(state),
    text: `${state.symbol}: новые параметры книги${
      state.position !== "flat"
        ? " · открытую позицию закроем уже по ним"
        : ""
    }`
  });
}

function currentSyncPlanInput() {
  return [...tickers.values()].map((state) => ({
    symbol: state.symbol,
    tf: state.tf,
    prefs: state.prefs,
    fingerprint: livePrefsFingerprint(state.tf, state.prefs)
  }));
}

function formatSyncMessage(plan, skipped) {
  const parts = [];
  if (plan.add.length) {
    parts.push(`+${plan.add.map((row) => row.symbol).join(",")}`);
  }
  if (plan.remove.length) {
    parts.push(`−${plan.remove.join(",")}`);
  }
  if (plan.update.length) {
    parts.push(`~${plan.update.map((row) => row.symbol).join(",")}`);
  }
  if (skipped.length) {
    parts.push(`пропуск ${skipped.join("; ")}`);
  }
  if (!parts.length) {
    return `Live RSI Flip: книга без изменений (${tickers.size} тик.)`;
  }
  return `Live RSI Flip подхватил книгу: ${parts.join(" ")}`;
}

function projectedLiveCount(plan) {
  let n = tickers.size;
  for (const symbol of plan.remove || []) {
    if (tickers.has(symbol)) {
      n -= 1;
    }
  }
  return Math.max(0, n + (Array.isArray(plan.add) ? plan.add.length : 0));
}

function shareGateFailResult(message) {
  return {
    ok: false,
    running: true,
    added: [],
    removed: [],
    updated: [],
    skipped: [],
    watchlistCount: tickers.size,
    message
  };
}

async function applyBookDiff(nextRows, nextPct = allocPct, nextMargin = sessionMarginMode) {
  const plan = planRsiTouchFlipBookSync(currentSyncPlanInput(), nextRows);
  const skipped = [];
  const prevPct = allocPct;
  const prevMargin = sessionMarginMode;
  allocPct = nextPct;
  sessionMarginMode = nextMargin;
  const projected = projectedLiveCount(plan);
  const gateCount = projected === 0 ? 0 : Math.max(tickers.size, projected);

  if (gateCount > 0) {
    try {
      await refreshWalletAllocated();
    } catch (err) {
      allocPct = prevPct;
      sessionMarginMode = prevMargin;
      return shareGateFailResult(
        err?.message ||
          "Не удалось прочитать баланс алго-ключа — live книгу не менял"
      );
    }

    const gatedShare = equalShareBudget(allocatedUsdt, gateCount);
    if (!(gatedShare >= 1)) {
      allocPct = prevPct;
      sessionMarginMode = prevMargin;
      return shareGateFailResult(
        `Доля на тикер ${Number(gatedShare).toFixed(2)} USDT < 1 USDT (${gateCount} тик. · ${nextPct}% баланса) — live книгу не менял`
      );
    }
  }

  for (const symbol of plan.remove) {
    const state = tickers.get(symbol);
    if (state) {
      try {
        await dropTicker(state, "убрали из книги");
      } catch (err) {
        skipped.push(`${symbol}: ${err?.message || err}`);
      }
    }
  }

  for (const row of plan.update) {
    const state = tickers.get(row.symbol);
    if (!state) {
      continue;
    }
    try {
      await applyTickerUpdate(state, row);
    } catch (err) {
      skipped.push(`${row.symbol}: ${err?.message || err}`);
    }
  }

  if (plan.add.length) {
    await mapPool(plan.add, SEED_CONCURRENCY, async (row) => {
      try {
        await seedTicker(row);
      } catch (err) {
        skipped.push(`${row.symbol}: ${err?.message || err}`);
      }
    });
  }

  if (plan.add.length || plan.remove.length || plan.update.length) {
    startWaitFlatLoop();
    void refreshWaitFlat();
  }

  const share = applyShareBudgets();
  const shareNote =
    Number.isFinite(share) && share > 0
      ? ` · ${allocPct}% → ${Number(allocatedUsdt).toFixed(2)} / ${tickers.size} = ${share.toFixed(2)} USDT`
      : "";
  const message = `${formatSyncMessage(plan, skipped)}${shareNote}`;
  sessionLog.appendNote?.(message);
  onActivity?.();
  return {
    ok: true,
    running: true,
    added: plan.add.map((row) => row.symbol),
    removed: plan.remove,
    updated: plan.update.map((row) => row.symbol),
    skipped,
    watchlistCount: tickers.size,
    message
  };
}

async function startRsiTouchFlipEngine(config = {}) {
  if (engineLive) {
    throw new Error("RSI Touch Flip уже запущен");
  }
  throwIfRsiTouchFlipStartCancelled();

  const rows = normalizeBookRows(config.rows || config.book);
  if (!rows.length) {
    throw new Error("Книга RSI Touch Flip пуста — добавьте тикеры в панели Данные");
  }

  onActivity = typeof config.onActivity === "function" ? config.onActivity : null;
  signalLog.length = 0;
  lastSignalText = "";
  queuedBookRows = null;
  queuedBalancePct = null;
  queuedMarginMode = null;
  allocPct = normalizeBalancePct(config.balancePct);
  sessionMarginMode = normalizeMarginMode(config.marginMode);

  klineHub = createAlgoBybitKlineHub();
  unsubKline = klineHub.onKline(onKline);

  const failures = [];
  await mapPool(rows, SEED_CONCURRENCY, async (row) => {
    throwIfRsiTouchFlipStartCancelled();
    try {
      await seedTicker(row);
    } catch (err) {
      throwIfRsiTouchFlipStartCancelled();
      failures.push(`${row.symbol}: ${err?.message || err}`);
    }
  });
  throwIfRsiTouchFlipStartCancelled();

  if (!tickers.size) {
    await stopRsiTouchFlipEngine();
    throw new Error(failures[0] || "Не удалось запустить ни один тикер из книги");
  }

  if (failures.length) {
    sessionLog.appendNote?.(
      `Пропущены: ${failures.join("; ")}`
    );
  }

  let share = 0;
  try {
    throwIfRsiTouchFlipStartCancelled();
    share = await refreshShareBudgets();
  } catch (err) {
    await stopRsiTouchFlipEngine();
    throw new Error(err?.message || "Не удалось прочитать баланс для долей RSI Flip");
  }
  throwIfRsiTouchFlipStartCancelled();
  if (!(share >= 1)) {
    await stopRsiTouchFlipEngine();
    throw new Error(
      `Доля на тикер ${Number(share).toFixed(2)} USDT < 1 USDT (${tickers.size} тик. · ${allocPct}% баланса)`
    );
  }
  sessionLog.appendNote?.(
    `Доли: ${allocPct}% баланса → ${Number(allocatedUsdt).toFixed(2)} USDT / ${tickers.size} = ${share.toFixed(2)} USDT на тикер`
  );

  engineLive = true;
  startWaitFlatLoop();
  void refreshWaitFlat();
  log.info("rsi touch flip engine started", {
    tickers: [...tickers.keys()],
    skipped: failures.length
  });
}

async function stopRsiTouchFlipEngine() {
  queuedBookRows = null;
  queuedBalancePct = null;
  engineLive = false;
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

async function syncRsiTouchFlipBook(config = {}) {
  const rows = normalizeBookRows(config.rows || config.book);
  const nextPct =
    config.balancePct != null && config.balancePct !== ""
      ? normalizeBalancePct(config.balancePct)
      : allocPct;
  const nextMargin =
    config.marginMode != null && config.marginMode !== ""
      ? normalizeMarginMode(config.marginMode)
      : sessionMarginMode;
  if (!engineLive) {
    allocPct = nextPct;
    sessionMarginMode = nextMargin;
    return {
      ok: true,
      running: false,
      added: [],
      removed: [],
      updated: [],
      skipped: [],
      watchlistCount: 0,
      message: "Бот RSI Flip не запущен — книга сохранена"
    };
  }

  if (syncBusy) {
    queuedBookRows = rows;
    queuedBalancePct = nextPct;
    queuedMarginMode = nextMargin;
    return {
      ok: true,
      running: true,
      queued: true,
      message: "Live RSI Flip: книга в очереди"
    };
  }

  syncBusy = true;
  try {
    let current = rows;
    let currentPct = nextPct;
    let currentMargin = nextMargin;
    let result = {
      ok: true,
      running: true,
      added: [],
      removed: [],
      updated: [],
      skipped: [],
      watchlistCount: tickers.size,
      message: `Live RSI Flip: книга без изменений (${tickers.size} тик.)`
    };
    while (engineLive) {
      result = await applyBookDiff(current, currentPct, currentMargin);
      if (!queuedBookRows) {
        return result;
      }
      current = queuedBookRows;
      currentPct =
        queuedBalancePct != null ? queuedBalancePct : currentPct;
      currentMargin =
        queuedMarginMode != null ? queuedMarginMode : currentMargin;
      queuedBookRows = null;
      queuedBalancePct = null;
      queuedMarginMode = null;
    }
    return result;
  } finally {
    syncBusy = false;
  }
}

function isRsiTouchFlipEngineRunning() {
  return engineLive;
}

function getRsiTouchFlipEngineStatus() {
  if (!engineLive) {
    return emptyStatus();
  }

  const list = [...tickers.values()];
  const first = list[0];
  const inPos = list.filter((row) => row.position !== "flat");
  return {
    symbol: first?.symbol || "",
    tf: first?.tf || "",
    rsiTf: first ? rsiSourceTf(first) : "",
    stack: inPos[0]?.stack || 0,
    position: inPos[0]?.position || "flat",
    lastSignal: lastSignalText,
    signals: signalLog.slice(0, MAX_LOG),
    prefs: first?.prefs || null,
    entriesCount: list.reduce((sum, row) => sum + (row.sessionEntries || 0), 0),
    watchlistCount: list.length,
    allocPct,
    allocatedUsdt,
    shareBudget: equalShareBudget(allocatedUsdt, list.length),
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
  syncRsiTouchFlipBook,
  isRsiTouchFlipEngineRunning,
  getRsiTouchFlipEngineStatus,
  requestRsiTouchFlipStartCancel,
  clearRsiTouchFlipStartCancel,
  isRsiTouchFlipStartCancelled
};
