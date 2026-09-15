/**
 * Колонка подбора Train/Test в панели «Данные». Live не трогает.
 */
import {
  RSI_TOUCH_FLIP_LEN_GRID,
  listRsiTouchFlipOptimizeCombos,
  optimizeRsiTouchFlipParams
} from "./rsi-touch-flip-optimize.js?v=11";
import {
  runRsiTouchFlip
} from "./rsi-touch-flip-engine.js?v=8";
import {
  clampRsiTouchFlipTrainPct,
  formatRsiTouchFlipParamsBrief,
  rsiTouchFlipFitColumnPatch,
  rsiTouchFlipLaunchAdvice,
  rsiTouchFlipMinTestTrades,
  rsiTouchFlipShouldFillColumnFromFit,
  rsiTouchFlipTestVerdict,
  rsiTouchFlipTrainTestSplit,
  rsiTouchFlipJsonReplacer,
  rsiTouchFlipJsonReviver,
  RSI_TOUCH_FLIP_DEFAULT_TRAIN_PCT
} from "./rsi-touch-flip-walkforward.js?v=13";

const FIT_KEY = "algo_trading_rsi_touch_flip_fit_v1";

/**
 * Последний подбор для тикера (fallback при первом открытии без ticker-store).
 * @param {unknown} symbol
 * @returns {object|null}
 */
export function loadRsiTouchFlipFitRowForSymbol(
symbol
){

const stored =
loadFitStore();
const id =
String(
symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase();

if(
!stored ||
String(
stored.symbol ||
""
).replace(
/\.P$/i,
""
).trim().toUpperCase() !==
id
){
return null;
}

return stored;

}

function el(id) {
  return document.getElementById(id);
}

function sameFitSymbol(a, b) {
  const norm = (value) =>
    String(value || "")
      .replace(/\.P$/i, "")
      .trim()
      .toUpperCase();
  return norm(a) === norm(b) && !!norm(a);
}

function sameOverlayPrefs(a, b) {
  return (
    (a?.cycleSlEnabled === true) === (b?.cycleSlEnabled === true) &&
    Number(a?.cycleSlPct || 0) === Number(b?.cycleSlPct || 0) &&
    (a?.compoundEnabled === true) === (b?.compoundEnabled === true)
  );
}

function formatUsd(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return value < 0 ? `-${abs}` : abs;
}

function formatPct(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatFactor(value) {
  if (value === Infinity || value === "Infinity") {
    return "∞";
  }
  if (!Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(2);
}

function formatDays(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

function compactOverviewLine(overview) {
  if (!overview) {
    return "—";
  }
  const closed = Number.isFinite(overview.closedTrades)
    ? overview.closedTrades
    : "—";
  return [
    `${formatDays(overview.chartDays)} дн`,
    `${closed} сд`,
    `${formatUsd(overview.netProfit)} (${formatPct(overview.netProfitPct)})`,
    `PF ${formatFactor(overview.profitFactor)}`,
    `DD ${formatPct(
      Number.isFinite(overview.maxDrawdownPct)
        ? -Math.abs(overview.maxDrawdownPct)
        : NaN
    )}`
  ].join(" · ");
}

function compactTestBadge(overview, verdict) {
  if (!overview) {
    return "—";
  }
  const mark = verdict?.ok ? "можно" : "нельзя";
  const closed = Number.isFinite(overview.closedTrades)
    ? overview.closedTrades
    : "—";
  return `${mark} · ${formatUsd(overview.netProfit)} · PF ${formatFactor(overview.profitFactor)} · ${closed} сд`;
}

function loadFitStore() {
  try {
    const raw = localStorage.getItem(FIT_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw, rsiTouchFlipJsonReviver);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveFitStore(row) {
  try {
    localStorage.setItem(
      FIT_KEY,
      JSON.stringify(row, rsiTouchFlipJsonReplacer)
    );
  } catch {
    /* quota */
  }
}

function verdictChanged(a, b) {
  return (
    a?.ok !== b?.ok ||
    String((a?.reasons || []).join("|")) !== String((b?.reasons || []).join("|"))
  );
}

/** Пересчитать Test по текущим правилам — без повторного прогона сетки. */
function refreshFitRowVerdict(row, split) {
  if (!row?.test) {
    return row;
  }
  const opts = split
    ? { minTrades: rsiTouchFlipMinTestTrades(split.test.bars) }
    : {};
  return {
    ...row,
    verdict: rsiTouchFlipTestVerdict(row.test, opts)
  };
}

function paintSigned(node, value) {
  if (!node) {
    return;
  }
  node.classList.toggle(
    "algo-stats-value--long",
    Number.isFinite(value) && value > 0
  );
  node.classList.toggle(
    "algo-stats-value--short",
    Number.isFinite(value) && value < 0
  );
}

function setLaunchState(state) {
  const box = el("algo-rsi-flip-launch");
  box?.setAttribute("data-state", state);
}

function readTrainPct() {
  return clampRsiTouchFlipTrainPct(
    el("algo-rsi-flip-train-pct")?.value || RSI_TOUCH_FLIP_DEFAULT_TRAIN_PCT
  );
}

function evaluateSplit(candles, rsiValues, prefs, chartTf, trainPct) {
  const split = rsiTouchFlipTrainTestSplit(
    candles,
    rsiValues,
    chartTf,
    trainPct
  );
  if (!split) {
    return null;
  }
  const trainResult = runRsiTouchFlip(split.train.candles, prefs, {
    rsiValues: split.train.rsiValues
  });
  const testResult = runRsiTouchFlip(split.test.candles, prefs, {
    rsiValues: split.test.rsiValues
  });
  const train = {
    ...trainResult.overview,
    chartDays: split.train.days
  };
  const test = {
    ...testResult.overview,
    chartDays: split.test.days
  };
  const fullResult = runRsiTouchFlip(candles, prefs, { rsiValues });
  const overview = {
    ...fullResult.overview,
    chartDays: (Number(split.train.days) || 0) + (Number(split.test.days) || 0)
  };
  const verdict = rsiTouchFlipTestVerdict(test, {
    minTrades: rsiTouchFlipMinTestTrades(split.test.bars)
  });
  return { split, train, test, overview, verdict };
}

/**
 * @param {{
 *   isActive: () => boolean,
 *   getCandles: () => Array,
 *   getChartTf: () => string,
 *   getSymbol: () => string,
 *   getPrefs: () => object,
 *   applyCandidate: (patch: object) => void,
 *   resolveRsi: (candles: Array, prefs: object) => Promise<number[]>,
 *   isDisposed: () => boolean,
 *   isHistoryReady: () => boolean
 * }} host
 */
export function mountRsiTouchFlipFit(host) {
  let running = false;
  let signal = { cancelled: false };
  let pinnedChart = { symbol: "", tf: "" };

  function stillOnPinnedChart() {
    return (
      sameFitSymbol(pinnedChart.symbol, host.getSymbol?.()) &&
      String(pinnedChart.tf || "") === String(host.getChartTf?.() || "")
    );
  }

  function renderSplitLabel(split) {
    const node = el("algo-rsi-flip-split-label");
    if (!node) {
      return;
    }
    if (!split) {
      node.textContent = host.isHistoryReady?.()
        ? "мало свечей для нарезки"
        : "загрузка свечей…";
      return;
    }
    node.textContent =
      `Train ${formatDays(split.train.days)} дн (${split.train.bars}) · ` +
      `Test ${formatDays(split.test.days)} дн (${split.test.bars})`;
  }

  function renderCurrentTest(evalRow) {
    const node = el("algo-rsi-flip-current-test");
    if (!node) {
      return;
    }
    if (!evalRow) {
      node.textContent = "—";
      node.classList.remove(
        "algo-stats-value--long",
        "algo-stats-value--short"
      );
      return;
    }
    node.textContent = compactTestBadge(evalRow.test, evalRow.verdict);
    paintSigned(node, evalRow.verdict.ok ? 1 : -1);
  }

  function renderCandidate(row, currentEval) {
    const title = el("algo-rsi-flip-launch-title");
    const params = el("algo-rsi-flip-launch-params");
    const detail = el("algo-rsi-flip-launch-detail");
    const trainEl = el("algo-rsi-flip-fit-train");
    const testEl = el("algo-rsi-flip-fit-test");
    const applyBtn = el("algo-rsi-flip-apply-fit");
    const idle = rsiTouchFlipLaunchAdvice(null);
    const currentOk = currentEval?.verdict?.ok === true;

    if (!row?.prefs) {
      setLaunchState("idle");
      if (title) {
        title.textContent = idle.title;
      }
      if (params) {
        params.textContent = "";
      }
      if (detail) {
        detail.textContent = idle.detail;
      }
      if (trainEl) {
        trainEl.textContent = "—";
      }
      if (testEl) {
        testEl.textContent = "—";
      }
      applyBtn?.setAttribute("disabled", "");
      return;
    }

    let advice = rsiTouchFlipLaunchAdvice(
      row.verdict,
      row.train,
      row.test,
      { currentPassesTest: currentOk }
    );
    const currentNet = Number(currentEval?.overview?.netProfit);
    const gridNet = Number(row.overview?.netProfit);
    if (
      advice.canLaunch &&
      currentOk &&
      Number.isFinite(currentNet) &&
      Number.isFinite(gridNet) &&
      currentNet > gridNet + 1e-9
    ) {
      advice = {
        canLaunch: false,
        title: "Сетка не обошла поля слева",
        detail:
          `На всём графике (Обзор) у текущих полей ${formatUsd(currentNet)}, у лучшего набора сетки ${formatUsd(gridNet)}. Подставлять сетку не нужно.`
      };
    }
    setLaunchState(advice.canLaunch ? "ok" : "no");
    if (title) {
      title.textContent = advice.title;
    }
    if (params) {
      const brief = formatRsiTouchFlipParamsBrief(row.prefs);
      if (advice.canLaunch) {
        params.textContent = brief;
      } else if (row.verdict?.ok) {
        params.textContent = `лучший с зелёным Test: ${brief}`;
      } else {
        params.textContent = `макс. по Обзору (Test красный — не в бота): ${brief}`;
      }
    }
    if (detail) {
      let text = advice.detail;
      const overviewBest = row.overviewBest;
      if (
        row.verdict?.ok &&
        overviewBest?.prefs &&
        overviewBest.verdict?.ok !== true
      ) {
        text +=
          ` Макс. по Обзору ${formatRsiTouchFlipParamsBrief(overviewBest.prefs)} — Test красный, в бота не берём.`;
      }
      detail.textContent = text;
    }
    if (trainEl) {
      trainEl.textContent = compactOverviewLine(row.train);
      paintSigned(trainEl, row.train?.netProfit);
    }
    if (testEl) {
      testEl.textContent = compactOverviewLine(row.test);
      paintSigned(testEl, row.verdict?.ok ? 1 : -1);
    }
    if (advice.canLaunch) {
      applyBtn?.removeAttribute("disabled");
    } else {
      applyBtn?.setAttribute("disabled", "");
    }
  }

  function renderProgress(done, total) {
    const wrap = el("algo-rsi-flip-fit-progress");
    const bar = el("algo-rsi-flip-fit-progress-bar");
    const label = el("algo-rsi-flip-fit-progress-label");
    if (!wrap) {
      return;
    }
    const show = total > 0 && done < total;
    wrap.toggleAttribute("hidden", !show);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    if (bar) {
      bar.style.width = `${pct}%`;
    }
    if (label) {
      label.textContent = `${done} / ${total}`;
    }
  }

  function setRunningUi(on) {
    running = on;
    const runBtn = el("algo-rsi-flip-optimize");
    const stopBtn = el("algo-rsi-flip-optimize-stop");
    runBtn?.toggleAttribute("disabled", on);
    stopBtn?.toggleAttribute("hidden", !on);
    stopBtn?.toggleAttribute("disabled", !on);
    if (!on) {
      renderProgress(0, 0);
    }
  }

  function makeFitRow(resultRow, candles, chartTf, trainPct, extra = {}) {
    return {
      symbol: extra.symbol || host.getSymbol?.(),
      chartTf,
      candleCount: candles.length,
      trainPct,
      prefs: resultRow.prefs,
      combo: resultRow.combo,
      train: resultRow.train,
      test: resultRow.test,
      overview: resultRow.overview,
      verdict: resultRow.verdict,
      overviewBest: extra.overviewBest || null,
      updatedAt: Date.now()
    };
  }

  function applyFitRowToColumn(row, currentEval) {
    if (!rsiTouchFlipShouldFillColumnFromFit(row, currentEval)) {
      return;
    }
    host.applyCandidate(rsiTouchFlipFitColumnPatch(row.prefs));
  }

  async function recomputeStoredOverlay(candles, chartTf, livePrefs, currentEval) {
    const stored = loadFitStore();
    if (!stored?.prefs || host.isDisposed?.()) {
      return;
    }
    if (!sameFitSymbol(stored.symbol, host.getSymbol?.())) {
      return;
    }
    const nextPrefs = {
      ...stored.prefs,
      cycleSlEnabled: livePrefs?.cycleSlEnabled === true,
      cycleSlPct: livePrefs?.cycleSlPct,
      compoundEnabled: livePrefs?.compoundEnabled === true
    };
    let rsi;
    try {
      rsi = await host.resolveRsi(candles, nextPrefs);
    } catch {
      return;
    }
    if (host.isDisposed?.() || !sameFitSymbol(stored.symbol, host.getSymbol?.())) {
      return;
    }
    const evalRow = evaluateSplit(
      candles,
      rsi,
      nextPrefs,
      chartTf,
      readTrainPct()
    );
    if (!evalRow) {
      return;
    }
    const row = {
      ...stored,
      prefs: nextPrefs,
      train: evalRow.train,
      test: evalRow.test,
      overview: evalRow.overview,
      verdict: evalRow.verdict
    };
    saveFitStore(row);
    renderCandidate(row, currentEval);
  }

  function sync(payload) {
    if (host.isDisposed?.() || !host.isActive?.()) {
      return;
    }
    if (running && !stillOnPinnedChart()) {
      signal.cancelled = true;
    }
    const candles = payload?.candles || [];
    const prefs = payload?.prefs;
    const chartTf = payload?.chartTf || "";
    const rsiValues = payload?.rsiValues;
    const pctInput = el("algo-rsi-flip-train-pct");
    if (pctInput && document.activeElement !== pctInput && !pctInput.value) {
      pctInput.value = String(RSI_TOUCH_FLIP_DEFAULT_TRAIN_PCT);
    }
    const trainPct = readTrainPct();
    const split = rsiTouchFlipTrainTestSplit(
      candles,
      rsiValues,
      chartTf,
      trainPct
    );
    renderSplitLabel(split);
    let currentEval = null;
    if (rsiValues && prefs) {
      currentEval = evaluateSplit(
        candles,
        rsiValues,
        prefs,
        chartTf,
        trainPct
      );
      renderCurrentTest(currentEval);
    }

    const stored = loadFitStore();
    const sameChart =
      stored &&
      sameFitSymbol(stored.symbol, host.getSymbol?.()) &&
      String(stored.chartTf || "") === String(chartTf || "");
    const candidate = sameChart
      ? refreshFitRowVerdict(stored, split)
      : null;
    if (candidate && stored && verdictChanged(candidate.verdict, stored.verdict)) {
      saveFitStore(candidate);
    }
    if (candidate && prefs && !sameOverlayPrefs(candidate.prefs, prefs)) {
      void recomputeStoredOverlay(candles, chartTf, prefs, currentEval);
      return;
    }
    renderCandidate(candidate, currentEval);
  }

  async function runOptimize() {
    if (running || host.isDisposed?.() || !host.isActive?.()) {
      return;
    }
    const candles = host.getCandles?.() || [];
    const basePrefs = host.getPrefs?.();
    const chartTf = host.getChartTf?.() || "";
    const trainPct = readTrainPct();
    if (!host.isHistoryReady?.()) {
      renderSplitLabel(null);
      return;
    }
    const split = rsiTouchFlipTrainTestSplit(
      candles,
      undefined,
      chartTf,
      trainPct
    );
    if (!split) {
      renderSplitLabel(null);
      return;
    }

    signal = { cancelled: false };
    pinnedChart = {
      symbol: host.getSymbol?.(),
      tf: chartTf
    };
    setRunningUi(true);
    renderProgress(0, listRsiTouchFlipOptimizeCombos().length);

    const rsiByLen = new Map();
    try {
      for (const rsiLen of RSI_TOUCH_FLIP_LEN_GRID) {
        if (signal.cancelled || host.isDisposed?.() || !stillOnPinnedChart()) {
          signal.cancelled = true;
          break;
        }
        const rsi = await host.resolveRsi(candles, {
          ...basePrefs,
          rsiLen
        });
        if (signal.cancelled || host.isDisposed?.() || !stillOnPinnedChart()) {
          signal.cancelled = true;
          break;
        }
        rsiByLen.set(rsiLen, rsi);
      }

      if (signal.cancelled || host.isDisposed?.() || !stillOnPinnedChart()) {
        return;
      }

      const result = await optimizeRsiTouchFlipParams({
        candles,
        rsiByLen,
        basePrefs,
        chartTf,
        trainPct,
        signal,
        onProgress: (p) => renderProgress(p.done, p.total)
      });

      if (host.isDisposed?.() || !stillOnPinnedChart()) {
        return;
      }
      if (result.cancelled) {
        return;
      }
      if (!result.best && !result.bestTradable) {
        let currentEval = null;
        try {
          const currentRsi = await host.resolveRsi(candles, basePrefs);
          if (!host.isDisposed?.() && stillOnPinnedChart()) {
            currentEval = evaluateSplit(
              candles,
              currentRsi,
              basePrefs,
              chartTf,
              trainPct
            );
            renderCurrentTest(currentEval);
          }
        } catch {
          /* ignore */
        }
        if (!stillOnPinnedChart()) {
          return;
        }
        if (result.bestTrain?.prefs) {
          const row = makeFitRow(result.bestTrain, candles, chartTf, trainPct, {
            symbol: pinnedChart.symbol
          });
          saveFitStore(row);
          applyFitRowToColumn(row, currentEval);
          renderCandidate(row, currentEval);
        } else {
          renderCandidate(null, currentEval);
          const title = el("algo-rsi-flip-launch-title");
          const detail = el("algo-rsi-flip-launch-detail");
          setLaunchState("no");
          if (title) {
            title.textContent = "Подбор не нашёл набор";
          }
          if (detail) {
            detail.textContent =
              "На Train ни одна ячейка сетки не дала достаточно сделок. Смените ТФ RSI, сторону или загрузите больше истории.";
          }
        }
        return;
      }

      const pick = result.bestTradable || result.best;
      const overviewBest =
        result.best?.prefs &&
        result.bestTradable?.prefs &&
        (
          result.best.prefs.rsiLen !== result.bestTradable.prefs.rsiLen ||
          result.best.prefs.osLevel !== result.bestTradable.prefs.osLevel ||
          result.best.prefs.obLevel !== result.bestTradable.prefs.obLevel ||
          result.best.prefs.maxStack !== result.bestTradable.prefs.maxStack
        )
          ? {
              prefs: result.best.prefs,
              verdict: result.best.verdict,
              overview: result.best.overview,
              test: result.best.test
            }
          : null;
      const row = makeFitRow(pick, candles, chartTf, trainPct, {
        overviewBest,
        symbol: pinnedChart.symbol
      });
      let currentEval = null;
      try {
        const currentRsi = await host.resolveRsi(candles, basePrefs);
        if (!host.isDisposed?.() && stillOnPinnedChart()) {
          currentEval = evaluateSplit(
            candles,
            currentRsi,
            basePrefs,
            chartTf,
            trainPct
          );
          renderCurrentTest(currentEval);
        }
      } catch {
        /* ignore */
      }
      if (!stillOnPinnedChart()) {
        return;
      }
      saveFitStore(row);
      applyFitRowToColumn(row, currentEval);
      renderCandidate(row, currentEval);
    } catch (err) {
      console.warn("[algo-rsi-touch-flip] fit", err?.message || err);
    } finally {
      if (!host.isDisposed?.()) {
        setRunningUi(false);
      }
    }
  }

  function onTrainPctChange() {
    if (host.isDisposed?.() || !host.isActive?.()) {
      return;
    }
    const candles = host.getCandles?.() || [];
    const prefs = host.getPrefs?.();
    const chartTf = host.getChartTf?.() || "";
    const trainPct = readTrainPct();
    renderSplitLabel(
      rsiTouchFlipTrainTestSplit(candles, undefined, chartTf, trainPct)
    );
    void (async () => {
      try {
        const rsiValues = await host.resolveRsi(candles, prefs);
        if (host.isDisposed?.()) {
          return;
        }
        sync({ candles, prefs, chartTf, rsiValues });
      } catch {
        /* ignore */
      }
    })();
  }

  function onApply() {
    const candles = host.getCandles?.() || [];
    const chartTf = host.getChartTf?.() || "";
    const split = rsiTouchFlipTrainTestSplit(
      candles,
      undefined,
      chartTf,
      readTrainPct()
    );
    const stored = refreshFitRowVerdict(loadFitStore(), split);
    if (!stored?.prefs || stored.verdict?.ok !== true) {
      return;
    }
    saveFitStore(stored);
    host.applyCandidate(rsiTouchFlipFitColumnPatch(stored.prefs));
  }

  el("algo-rsi-flip-optimize")?.addEventListener("click", () => {
    void runOptimize();
  });
  el("algo-rsi-flip-optimize-stop")?.addEventListener("click", () => {
    signal.cancelled = true;
  });
  el("algo-rsi-flip-apply-fit")?.addEventListener("click", onApply);
  el("algo-rsi-flip-train-pct")?.addEventListener("change", onTrainPctChange);

  const idlePct = el("algo-rsi-flip-train-pct");
  if (idlePct && !idlePct.value) {
    idlePct.value = String(RSI_TOUCH_FLIP_DEFAULT_TRAIN_PCT);
  }
  renderCandidate(refreshFitRowVerdict(loadFitStore(), null));

  return {
    sync,
    destroy() {
      signal.cancelled = true;
    }
  };
}
