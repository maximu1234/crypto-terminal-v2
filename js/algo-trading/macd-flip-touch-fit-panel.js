/**
 * Колонка подбора Train/Test в панели «Данные». Live не трогает.
 */
import {
  MACD_FLIP_TOUCH_SLOW_GRID,
  listMacdFlipTouchOptimizeCombos,
  optimizeMacdFlipTouchParams
} from "./macd-flip-touch-optimize.js?v=11";
import {
  runMacdFlipTouch
} from "./macd-flip-touch-engine.js?v=8";
import {
  clampMacdFlipTouchTrainPct,
  formatMacdFlipTouchParamsBrief,
  macdFlipTouchFitColumnPatch,
  macdFlipTouchLaunchAdvice,
  macdFlipTouchMinTestTrades,
  macdFlipTouchShouldFillColumnFromFit,
  macdFlipTouchTestVerdict,
  macdFlipTouchTrainTestSplit,
  macdFlipTouchJsonReplacer,
  macdFlipTouchJsonReviver,
  MACD_FLIP_TOUCH_DEFAULT_TRAIN_PCT
} from "./macd-flip-touch-walkforward.js?v=13";

const FIT_KEY = "algo_trading_macd_flip_touch_fit_v1";

/**
 * Последний подбор для тикера (fallback при первом открытии без ticker-store).
 * @param {unknown} symbol
 * @returns {object|null}
 */
export function loadMacdFlipTouchFitRowForSymbol(
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
    const parsed = JSON.parse(raw, macdFlipTouchJsonReviver);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function saveFitStore(row) {
  try {
    localStorage.setItem(
      FIT_KEY,
      JSON.stringify(row, macdFlipTouchJsonReplacer)
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
    ? { minTrades: macdFlipTouchMinTestTrades(split.test.bars) }
    : {};
  return {
    ...row,
    verdict: macdFlipTouchTestVerdict(row.test, opts)
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
  const box = el("algo-macd-flip-launch");
  box?.setAttribute("data-state", state);
}

function readTrainPct() {
  return clampMacdFlipTouchTrainPct(
    el("algo-macd-flip-train-pct")?.value || MACD_FLIP_TOUCH_DEFAULT_TRAIN_PCT
  );
}

function seriesFromPayload(series) {
  if (!series || typeof series !== "object") {
    return null;
  }
  const macdValues = Array.isArray(series.macdValues)
    ? series.macdValues
    : Array.isArray(series.macd)
      ? series.macd
      : null;
  const signalValues = Array.isArray(series.signalValues)
    ? series.signalValues
    : Array.isArray(series.signal)
      ? series.signal
      : null;
  if (!macdValues || !signalValues) {
    return null;
  }
  return { macdValues, signalValues };
}

function evaluateSplit(candles, series, prefs, chartTf, trainPct) {
  const split = macdFlipTouchTrainTestSplit(
    candles,
    undefined,
    chartTf,
    trainPct
  );
  if (!split) {
    return null;
  }
  const packed = seriesFromPayload(series);
  if (!packed) {
    return null;
  }
  const trainResult = runMacdFlipTouch(split.train.candles, prefs, {
    macdValues: packed.macdValues.slice(split.train.from, split.train.to),
    signalValues: packed.signalValues.slice(split.train.from, split.train.to)
  });
  const testResult = runMacdFlipTouch(split.test.candles, prefs, {
    macdValues: packed.macdValues.slice(split.test.from, split.test.to),
    signalValues: packed.signalValues.slice(split.test.from, split.test.to),
    excludeFormingBar: true
  });
  const train = {
    ...trainResult.overview,
    chartDays: split.train.days
  };
  const test = {
    ...testResult.overview,
    chartDays: split.test.days
  };
  const fullResult = runMacdFlipTouch(candles, prefs, {
    macdValues: packed.macdValues,
    signalValues: packed.signalValues,
    excludeFormingBar: true
  });
  const overview = {
    ...fullResult.overview,
    chartDays: (Number(split.train.days) || 0) + (Number(split.test.days) || 0)
  };
  const verdict = macdFlipTouchTestVerdict(test, {
    minTrades: macdFlipTouchMinTestTrades(split.test.bars)
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
 *   resolveMacd: (candles: Array, prefs: object) => Promise<{ macdValues: number[], signalValues: number[] }>,
 *   isDisposed: () => boolean,
 *   isHistoryReady: () => boolean
 * }} host
 */
export function mountMacdFlipTouchFit(host) {
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
    const node = el("algo-macd-flip-split-label");
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
    const node = el("algo-macd-flip-current-test");
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
    const title = el("algo-macd-flip-launch-title");
    const params = el("algo-macd-flip-launch-params");
    const detail = el("algo-macd-flip-launch-detail");
    const trainEl = el("algo-macd-flip-fit-train");
    const testEl = el("algo-macd-flip-fit-test");
    const applyBtn = el("algo-macd-flip-apply-fit");
    const idle = macdFlipTouchLaunchAdvice(null);
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

    let advice = macdFlipTouchLaunchAdvice(
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
      const brief = formatMacdFlipTouchParamsBrief(row.prefs);
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
          ` Макс. по Обзору ${formatMacdFlipTouchParamsBrief(overviewBest.prefs)} — Test красный, в бота не берём.`;
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
    const wrap = el("algo-macd-flip-fit-progress");
    const bar = el("algo-macd-flip-fit-progress-bar");
    const label = el("algo-macd-flip-fit-progress-label");
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
    const runBtn = el("algo-macd-flip-optimize");
    const stopBtn = el("algo-macd-flip-optimize-stop");
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
    if (!macdFlipTouchShouldFillColumnFromFit(row, currentEval)) {
      return;
    }
    host.applyCandidate(macdFlipTouchFitColumnPatch(row.prefs));
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
    let series;
    try {
      series = await host.resolveMacd(candles, nextPrefs);
    } catch {
      return;
    }
    if (host.isDisposed?.() || !sameFitSymbol(stored.symbol, host.getSymbol?.())) {
      return;
    }
    const evalRow = evaluateSplit(
      candles,
      series,
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
    const macdSeries = seriesFromPayload(payload?.macdSeries || payload?.series);
    const pctInput = el("algo-macd-flip-train-pct");
    if (pctInput && document.activeElement !== pctInput && !pctInput.value) {
      pctInput.value = String(MACD_FLIP_TOUCH_DEFAULT_TRAIN_PCT);
    }
    const trainPct = readTrainPct();
    const split = macdFlipTouchTrainTestSplit(
      candles,
      undefined,
      chartTf,
      trainPct
    );
    renderSplitLabel(split);
    let currentEval = null;
    if (macdSeries && prefs) {
      currentEval = evaluateSplit(
        candles,
        macdSeries,
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
    const split = macdFlipTouchTrainTestSplit(
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
    renderProgress(0, listMacdFlipTouchOptimizeCombos().length);

    try {
      // Прогрев кэша источника MTF на max slow — дальше resolve берёт из кэша.
      const warmSlow = Math.max(...MACD_FLIP_TOUCH_SLOW_GRID);
      try {
        await host.resolveMacd(candles, {
          ...basePrefs,
          slowLength: warmSlow
        });
      } catch {
        /* дальше combo-цикл сам отфильтрует */
      }

      if (signal.cancelled || host.isDisposed?.() || !stillOnPinnedChart()) {
        return;
      }

      const result = await optimizeMacdFlipTouchParams({
        candles,
        basePrefs,
        chartTf,
        trainPct,
        signal,
        resolveSeries: (prefs) => host.resolveMacd(candles, prefs),
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
          const currentSeries = await host.resolveMacd(candles, basePrefs);
          if (!host.isDisposed?.() && stillOnPinnedChart()) {
            currentEval = evaluateSplit(
              candles,
              currentSeries,
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
          const title = el("algo-macd-flip-launch-title");
          const detail = el("algo-macd-flip-launch-detail");
          setLaunchState("no");
          if (title) {
            title.textContent = "Подбор не нашёл набор";
          }
          if (detail) {
            detail.textContent =
              "На Train ни одна ячейка сетки не дала достаточно сделок. Смените ТФ MACD, сторону или загрузите больше истории.";
          }
        }
        return;
      }

      const pick = result.bestTradable || result.best;
      const overviewBest =
        result.best?.prefs &&
        result.bestTradable?.prefs &&
        (
          result.best.prefs.fastLength !== result.bestTradable.prefs.fastLength ||
          result.best.prefs.slowLength !== result.bestTradable.prefs.slowLength ||
          result.best.prefs.signalLength !== result.bestTradable.prefs.signalLength
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
        const currentSeries = await host.resolveMacd(candles, basePrefs);
        if (!host.isDisposed?.() && stillOnPinnedChart()) {
          currentEval = evaluateSplit(
            candles,
            currentSeries,
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
      console.warn("[algo-macd-flip-touch] fit", err?.message || err);
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
      macdFlipTouchTrainTestSplit(candles, undefined, chartTf, trainPct)
    );
    void (async () => {
      try {
        const macdSeries = await host.resolveMacd(candles, prefs);
        if (host.isDisposed?.()) {
          return;
        }
        sync({ candles, prefs, chartTf, macdSeries });
      } catch {
        /* ignore */
      }
    })();
  }

  function onApply() {
    const candles = host.getCandles?.() || [];
    const chartTf = host.getChartTf?.() || "";
    const split = macdFlipTouchTrainTestSplit(
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
    host.applyCandidate(macdFlipTouchFitColumnPatch(stored.prefs));
  }

  el("algo-macd-flip-optimize")?.addEventListener("click", () => {
    void runOptimize();
  });
  el("algo-macd-flip-optimize-stop")?.addEventListener("click", () => {
    signal.cancelled = true;
  });
  el("algo-macd-flip-apply-fit")?.addEventListener("click", onApply);
  el("algo-macd-flip-train-pct")?.addEventListener("change", onTrainPctChange);

  const idlePct = el("algo-macd-flip-train-pct");
  if (idlePct && !idlePct.value) {
    idlePct.value = String(MACD_FLIP_TOUCH_DEFAULT_TRAIN_PCT);
  }
  renderCandidate(refreshFitRowVerdict(loadFitStore(), null));

  return {
    sync,
    destroy() {
      signal.cancelled = true;
    }
  };
}
