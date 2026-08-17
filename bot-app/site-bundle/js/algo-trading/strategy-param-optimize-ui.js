/**
 * UI: «Подобрать параметры» под режимами подсчёта + попап результата.
 */
import {
optimizeAlgoStrategyParams,
normalizeAlgoOptimizeStrategyId,
algoOptimizeStrategyLabel,
comboToApplyPatch
} from "./strategy-param-optimize.js?v=8";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=14";

import {
ALGO_SUPERTREND_TF_OPTIONS
} from "./pattern-supertrend-filter.js?v=4";

const TF_LABELS = new Map(
  ALGO_SUPERTREND_TF_OPTIONS.map(opt => [opt.value, opt.label])
);

/**
 * @param {number|null|undefined} value
 * @param {{ signed?: boolean }} [opts]
 */
function formatUsd(value, opts = {}){
  const n = Number(value);
  if(!Number.isFinite(n)){
    return "—";
  }
  const abs = Math.abs(n);
  const body = abs >= 100 ? abs.toFixed(0) : abs.toFixed(2);
  const signed = opts.signed !== false;
  const sign = n > 0 && signed ? "+" : n < 0 ? "−" : "";
  return `${sign}${body}$`;
}

/**
 * @param {number|null|undefined} rate
 */
function formatPct(rate){
  const n = Number(rate);
  if(!Number.isFinite(n)){
    return "—";
  }
  return `${n.toFixed(1)}%`;
}

/**
 * @param {number|null|undefined} value
 * @param {number} [digits]
 */
function formatNum(value, digits = 2){
  const n = Number(value);
  if(!Number.isFinite(n)){
    return "—";
  }
  return String(Number(n.toFixed(digits)));
}

/**
 * @param {string} tf
 */
function formatTf(tf){
  const key = String(tf || "");
  return TF_LABELS.get(key) || (key ? key : "Текущий");
}

/**
 * @param {string} strategyId
 * @param {object} combo
 * @returns {Array<{ label: string, value: string }>}
 */
function buildResultRows(strategyId, combo){
  const rows = [
    { label: "СЛ%", value: `${formatNum(combo.slPctOfX, 1)}%` },
    {
      label: "Откат перед arm",
      value: combo.pullbackBeforeArm
        ? `вкл · ${formatNum(combo.pullbackBeforeArmPct, 1)}%`
        : "выкл"
    },
    {
      label: "Супертренд",
      value: combo.supertrendOn
        ? `ATR ${combo.supertrendAtr} · F ${formatNum(combo.supertrendFactor, 1)} · ТФ ${formatTf(combo.supertrendTf)}`
        : "выкл"
    }
  ];

  if(strategyId === "st1"){
    rows.push({ label: "ТП 1к", value: formatNum(combo.tpRr, 2) });
    return rows;
  }

  rows.push({
    label: "ТП1 / ТП2 / ТП3",
    value: `${formatNum(combo.tp1, 3)} / ${formatNum(combo.tp2, 3)} / ${formatNum(combo.tp3, 3)}`
  });
  rows.push({
    label: "Трейлинг СЛ",
    value: combo.trailSl
      ? `вкл · ${formatNum(combo.trailSlX1, 2)} → ${formatNum(combo.trailSlX2, 2)}`
      : "выкл"
  });
  rows.push({
    label: "Доли ТП%",
    value: `${combo.share1} / ${combo.share2} / ${combo.share3}`
  });
  return rows;
}

/**
 * @param {{
 *   getCandles: () => Array,
 *   getTradeOpts: () => object,
 *   getStrategyStatsMode: (id: string) => string,
 *   applyOptimizedParams: (strategyId: string, patch: object) => void
 * }} host
 */
export function mountAlgoStrategyParamOptimizeUi(host){
  const modal = document.getElementById("algo-optimize-modal");
  const titleEl = document.getElementById("algo-optimize-modal-title");
  const noteEl = document.getElementById("algo-optimize-modal-note");
  const progressWrap = document.getElementById("algo-optimize-progress");
  const progressBar = document.getElementById("algo-optimize-progress-bar");
  const progressLabel = document.getElementById("algo-optimize-progress-label");
  const bodyEl = document.getElementById("algo-optimize-modal-body");
  const applyBtn = document.getElementById("algo-optimize-apply");
  const stopBtn = document.getElementById("algo-optimize-stop");
  const closeBtns = [
    ...(document.querySelectorAll('[data-close="algo-optimize-modal"]') || [])
  ];
  const openBtns = [
    ...(document.querySelectorAll("[data-algo-optimize]") || [])
  ];

  if(!modal || !openBtns.length){
    return { destroy(){} };
  }

  /** @type {{ cancelled: boolean }|null} */
  let signal = null;
  let running = false;
  /** @type {object|null} */
  let pendingBest = null;
  /** @type {string} */
  let pendingStrategy = "st1";

  function setOpen(open){
    modal.classList.toggle("hidden", !open);
    modal.hidden = !open;
    if(open){
      modal.removeAttribute("hidden");
    }else{
      modal.setAttribute("hidden", "");
    }
  }

  function setProgress(done, total){
    const t = Math.max(1, Number(total) || 1);
    const d = Math.max(0, Math.min(t, Number(done) || 0));
    const pct = Math.round(d / t * 100);
    if(progressWrap){
      progressWrap.hidden = false;
    }
    if(progressBar){
      progressBar.style.width = `${pct}%`;
    }
    if(progressLabel){
      progressLabel.textContent = `${d} / ${t}`;
    }
  }

  function renderIdleHint(strategyId){
    if(bodyEl){
      bodyEl.innerHTML = `<p class="algo-optimize-empty">Идёт перебор параметров для ${algoOptimizeStrategyLabel(strategyId)}…</p>`;
    }
    if(applyBtn){
      applyBtn.disabled = true;
      applyBtn.hidden = true;
    }
  }

  /**
   * @param {string} strategyId
   * @param {object|null} best
   * @param {object|null} stats
   * @param {{ cancelled?: boolean, tried?: number, total?: number }} meta
   */
  function renderResult(strategyId, best, stats, meta = {}){
    if(!bodyEl){
      return;
    }

    if(!best){
      bodyEl.innerHTML = `<p class="algo-optimize-empty">${
        meta.cancelled
          ? "Подбор остановлен — лучший вариант не найден."
          : "Не удалось подобрать параметры (мало данных на графике)."
      }</p>`;
      if(applyBtn){
        applyBtn.disabled = true;
        applyBtn.hidden = true;
      }
      return;
    }

    const rows = buildResultRows(strategyId, best)
      .map(row => (
        `<div class="algo-optimize-row"><span class="algo-optimize-label">${row.label}</span><span class="algo-optimize-value">${row.value}</span></div>`
      ))
      .join("");

    const closed = Number(stats?.closed);
    const wr = Number(stats?.winRate);
    const net = Number(stats?.netUsd);
    const exp = Number(stats?.expectancyR);
    const maxDrawdown = stats?.maxDrawdownUsd === null ||
      stats?.maxDrawdownUsd === undefined
      ? Number.NaN
      : Number(stats.maxDrawdownUsd);

    bodyEl.innerHTML = `
      <div class="algo-optimize-score">
        <div class="algo-optimize-score-item"><span>${formatUsd(net)}</span><label>Итого $</label></div>
        <div class="algo-optimize-score-item"><span>${formatPct(wr)}</span><label>WR</label></div>
        <div class="algo-optimize-score-item"><span>${Number.isFinite(exp) ? exp.toFixed(2) : "—"}</span><label>E[R]</label></div>
        <div class="algo-optimize-score-item" title="Max drawdown — максимальная просадка по кумулятивному PnL"><span>${Number.isFinite(maxDrawdown) ? formatUsd(-Math.abs(maxDrawdown)) : "—"}</span><label>MD</label></div>
        <div class="algo-optimize-score-item"><span>${Number.isFinite(closed) ? String(closed) : "—"}</span><label>Закрытых</label></div>
      </div>
      <div class="algo-optimize-params">${rows}</div>
      <p class="algo-optimize-meta">Критерий: максимальная прибыль ($) · перебрано ${meta.tried ?? "—"} / ${meta.total ?? "—"}</p>
    `;

    if(applyBtn){
      applyBtn.hidden = false;
      applyBtn.disabled = false;
    }
  }

  async function runOptimize(rawId){
    if(running){
      return;
    }

    const strategyId = normalizeAlgoOptimizeStrategyId(rawId);
    pendingStrategy = strategyId;
    pendingBest = null;
    running = true;
    signal = { cancelled: false };

    if(titleEl){
      titleEl.textContent = `Подбор · ${algoOptimizeStrategyLabel(strategyId)}`;
    }
    if(noteEl){
      noteEl.textContent = "Открытый график · без изменения СЛ$, timeout и ТФ";
    }
    if(stopBtn){
      stopBtn.hidden = false;
      stopBtn.disabled = false;
    }
    renderIdleHint(strategyId);
    setProgress(0, 1);
    setOpen(true);

    try{
      const candles = host.getCandles?.() || [];
      const tradeOpts = host.getTradeOpts?.(strategyId) || {};
      const statsMode = normalizeAlgoStatsMode(
        host.getStrategyStatsMode?.(strategyId) || "direct"
      );

      const result = await optimizeAlgoStrategyParams({
        candles,
        strategyId,
        symbol: host.getSymbol?.() || tradeOpts.symbol || "",
        fixedOpts: {
          ...tradeOpts,
          symbol: host.getSymbol?.() || tradeOpts.symbol || ""
        },
        statsMode,
        signal,
        onProgress({ done, total, best, bestStats }){
          setProgress(done, total);
          if(best){
            pendingBest = best;
            renderResult(strategyId, best, bestStats, {
              tried: done,
              total
            });
          }
        }
      });

      pendingBest = result.best;
      setProgress(result.tried, result.total);
      renderResult(strategyId, result.best, result.bestStats, {
        cancelled: result.cancelled,
        tried: result.tried,
        total: result.total
      });
    }catch(err){
      console.warn("[algo-trading] optimize", err);
      if(bodyEl){
        bodyEl.innerHTML = `<p class="algo-optimize-empty">Ошибка подбора параметров.</p>`;
      }
      if(applyBtn){
        applyBtn.disabled = true;
        applyBtn.hidden = true;
      }
    }finally{
      running = false;
      signal = null;
      if(stopBtn){
        stopBtn.hidden = true;
        stopBtn.disabled = true;
      }
    }
  }

  function onOpenClick(event){
    const btn = event.target?.closest?.("[data-algo-optimize]");
    if(!btn){
      return;
    }
    event.preventDefault();
    void runOptimize(btn.getAttribute("data-algo-optimize"));
  }

  for(const btn of openBtns){
    btn.addEventListener("click", onOpenClick);
  }

  for(const el of closeBtns){
    el.addEventListener("click", () => {
      if(running && signal){
        signal.cancelled = true;
      }
      setOpen(false);
    });
  }

  stopBtn?.addEventListener("click", () => {
    if(signal){
      signal.cancelled = true;
    }
    if(stopBtn){
      stopBtn.disabled = true;
    }
  });

  applyBtn?.addEventListener("click", () => {
    if(!pendingBest){
      return;
    }
    const patch = comboToApplyPatch(pendingStrategy, pendingBest);
    host.applyOptimizedParams?.(pendingStrategy, patch);
    setOpen(false);
  });

  return {
    destroy(){
      if(signal){
        signal.cancelled = true;
      }
      for(const btn of openBtns){
        btn.removeEventListener("click", onOpenClick);
      }
      setOpen(false);
    }
  };
}
