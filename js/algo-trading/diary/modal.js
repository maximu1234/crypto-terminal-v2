/**
 * Algo Trading diary modal (overlay) — Multichart.
 * List/render/refresh adapted from Bybit trade diary page for modal use.
 */
import {
  diaryDayKeyLocal,
  formatDiaryDayLabel,
  formatDiaryDuration,
  formatDiaryPct,
  formatDiaryTime,
  formatDiaryUsd,
  formatDiaryWeekRange,
  pnlToneClass,
  sideLabel,
  sideToneClass
} from "./format.js?v=1";

import {
  closeTradeDetail,
  openTradeDetail
} from "./detail-ui.js?v=2";

import {
  mountTradeDiaryPeriodPicker
} from "./period.js?v=1";

import {
  resolveInitialAlgoDiaryPeriod,
  saveAlgoDiaryPeriod
} from "./storage.js?v=2";

import {
  diaryLoadPeriod,
  diaryCollectCachedTrades,
  diaryAfterListPaint
} from "./list.js?v=4";

import {
  diarySanitizeTrade
} from "./policy.js?v=1";

import {
isAlgoBotLiteMode
} from "../lite-layout.js?v=4";

const OVERLAY_ATTR = "data-algo-diary-overlay";

let overlayEl = null;
let modalEl = null;
let statusEl = null;
let contentEl = null;
let refreshBtn = null;
let periodBtn = null;

let weekTrades = [];
let openTradeKey = null;
let activePeriod = resolveInitialAlgoDiaryPeriod();
let periodPicker = null;
let diaryLoadingTimer = null;
let diaryLoadingStartedAt = 0;
let diaryLoadingCachedCount = 0;
let diaryLoadingRunId = 0;
let hasLoadedOnce = false;
let escapeBound = false;
const collapsedDayKeys = new Set();

function tradeKey(trade) {
  /* Stable across enrich: keep income listCloseTimeMs, not rewritten close. */
  const closeMs = trade?.listCloseTimeMs ?? trade?.closeTimeMs;
  return `${trade.symbol}-${closeMs}-${trade.orderId || ""}`;
}

function tradeIdentityKey(trade) {
  const sym = String(trade?.symbol || "").toUpperCase();
  const oid = String(trade?.orderId || "").trim();
  if (sym && oid) {
    return `id:${sym}:${oid}`;
  }
  return `t:${tradeKey(trade)}`;
}

function setStatus(text, { error = false, loading = false } = {}) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = text || "";
  statusEl.classList.toggle("is-error", !!error);
  statusEl.classList.toggle("is-loading", !!loading && !error);
  modalEl?.setAttribute("aria-busy", loading && !error ? "true" : "false");
}

function stopDiaryLoadingStatus(expectedRunId = null) {
  if (expectedRunId !== null && expectedRunId !== diaryLoadingRunId) {
    return;
  }
  if (diaryLoadingTimer) {
    clearInterval(diaryLoadingTimer);
    diaryLoadingTimer = null;
  }
}

function updateDiaryLoadingStatus() {
  const elapsedSec = Math.max(
    0,
    Math.floor((Date.now() - diaryLoadingStartedAt) / 1000)
  );
  const cachedPrefix =
    diaryLoadingCachedCount > 0
      ? `Показано из кэша: ${diaryLoadingCachedCount} · `
      : "";
  let phase = "Загружаем сделки";
  if (elapsedSec >= 5) {
    phase = "Загружаем исполнения и направления";
  }
  if (elapsedSec >= 12) {
    phase = "Обрабатываем данные биржи";
  }
  setStatus(`${cachedPrefix}${phase} · ${elapsedSec} сек. · Дневник работает`, {
    loading: true
  });
}

function startDiaryLoadingStatus(cachedCount = 0) {
  stopDiaryLoadingStatus();
  const runId = ++diaryLoadingRunId;
  diaryLoadingStartedAt = Date.now();
  diaryLoadingCachedCount = Math.max(0, Number(cachedCount) || 0);
  updateDiaryLoadingStatus();
  diaryLoadingTimer = setInterval(() => {
    if (runId === diaryLoadingRunId) {
      updateDiaryLoadingStatus();
    }
  }, 1000);
  return runId;
}

function escapeHtml(raw) {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sumField(rows, key) {
  return rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
}

function groupTradesByDay(trades) {
  const map = new Map();
  for (const trade of trades) {
    const key = diaryDayKeyLocal(trade.closeTimeMs);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(trade);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

/** Cols: time, ticker, duration, PnL $, PnL %, Com, Long/Short (no share / chart-link). */
function renderColHead() {
  return `
<div class="trade-diary-colhead trade-diary-grid" aria-hidden="true">
<span></span>
<span>Тикер</span>
<span>Время</span>
<span class="trade-diary-num">PnL $</span>
<span class="trade-diary-num">PnL %</span>
<span class="trade-diary-num">Com. $</span>
<span class="trade-diary-num">Long/Short</span>
</div>`;
}

function renderTradeRow(trade) {
  const key = tradeKey(trade);
  const isOpen = openTradeKey === key;

  return `
<div class="trade-diary-trade" data-trade-key="${escapeHtml(key)}">
<button type="button" class="trade-diary-row trade-diary-grid${isOpen ? " is-open" : ""}" data-action="toggle-detail" aria-expanded="${isOpen ? "true" : "false"}">
<span class="trade-diary-time">
<svg class="trade-diary-time-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
${escapeHtml(formatDiaryTime(trade.closeTimeMs))}
</span>
<span class="trade-diary-symbol">${escapeHtml(trade.symbol)}</span>
<span class="trade-diary-duration">${escapeHtml(formatDiaryDuration(trade.durationMs))}</span>
<span class="trade-diary-pnl-wrap trade-diary-num ${pnlToneClass(trade.pnlUsd)}">
<span class="trade-diary-pnl-value">${escapeHtml(formatDiaryUsd(trade.pnlUsd))}</span>
</span>
<span class="trade-diary-num ${pnlToneClass(trade.pnlPct)}">${escapeHtml(formatDiaryPct(trade.pnlPct))}</span>
<span class="trade-diary-num trade-diary-muted">${escapeHtml(formatDiaryUsd(trade.commissionUsd))}</span>
<span class="trade-diary-side ${sideToneClass(trade.side)}">${escapeHtml(sideLabel(trade.side))}</span>
</button>
<div class="trade-diary-detail${isOpen ? "" : " hidden"}" data-detail-panel></div>
</div>`;
}

function renderDayBlock(dayKey, rows) {
  const dayMs = new Date(`${dayKey}T12:00:00`).getTime();
  const dayPnl = sumField(rows, "pnlUsd");
  const dayCom = sumField(rows, "commissionUsd");
  const sorted = [...rows].sort((a, b) => b.closeTimeMs - a.closeTimeMs);
  const isCollapsed = collapsedDayKeys.has(dayKey);

  return `
<section class="trade-diary-day${isCollapsed ? " is-collapsed" : ""}" data-day-key="${escapeHtml(dayKey)}">
<button type="button" class="trade-diary-day-head trade-diary-grid" data-action="toggle-day" aria-expanded="${isCollapsed ? "false" : "true"}">
<span class="trade-diary-day-label">
<svg class="trade-diary-day-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/></svg>
${escapeHtml(formatDiaryDayLabel(dayMs))}
</span>
<span class="trade-diary-day-pnl ${pnlToneClass(dayPnl)}">${escapeHtml(formatDiaryUsd(dayPnl))}</span>
<span class="trade-diary-day-com trade-diary-muted">${escapeHtml(formatDiaryUsd(dayCom))}</span>
</button>
<div class="trade-diary-day-trades">
<div class="trade-diary-day-trades-inner">
${sorted.map(renderTradeRow).join("")}
</div>
</div>
</section>`;
}

function renderWeek(trades, rangeStartMs, rangeEndMs) {
  const weekPnl = sumField(trades, "pnlUsd");
  const weekCom = sumField(trades, "commissionUsd");
  const days = groupTradesByDay(trades);

  return `
<section class="trade-diary-week">
<div class="trade-diary-week-head trade-diary-grid">
<span class="trade-diary-week-range">${escapeHtml(formatDiaryWeekRange(rangeStartMs, rangeEndMs))}</span>
<span class="trade-diary-week-pnl ${pnlToneClass(weekPnl)}">${escapeHtml(formatDiaryUsd(weekPnl))}</span>
<span class="trade-diary-week-com trade-diary-muted">${escapeHtml(formatDiaryUsd(weekCom))}</span>
</div>
${renderColHead()}
${
  days.length
    ? days.map(([dayKey, rows]) => renderDayBlock(dayKey, rows)).join("")
    : `<div class="trade-diary-empty">За выбранный период закрытых сделок нет.</div>`
}
</section>`;
}

function findTradeByKey(key) {
  return weekTrades.find((trade) => tradeKey(trade) === key);
}

function renderDiaryContent(trades, rangeStartMs, rangeEndMs) {
  if (!contentEl) {
    return;
  }

  contentEl.innerHTML = renderWeek(trades, rangeStartMs, rangeEndMs);

  if (!openTradeKey) {
    return;
  }

  const trade = findTradeByKey(openTradeKey);
  if (!trade) {
    openTradeKey = null;
    return;
  }

  const wrap = contentEl.querySelector(
    `[data-trade-key="${CSS.escape(openTradeKey)}"]`
  );
  const panel = wrap?.querySelector("[data-detail-panel]");
  if (panel) {
    void openTradeDetail(panel, trade);
  }
}

async function toggleTradeDetail(key) {
  if (!contentEl) {
    return;
  }

  if (openTradeKey === key) {
    const openWrap = contentEl.querySelector(
      `[data-trade-key="${CSS.escape(key)}"]`
    );
    const panel = openWrap?.querySelector("[data-detail-panel]");
    closeTradeDetail(panel);
    openTradeKey = null;
    const row = openWrap?.querySelector(".trade-diary-row");
    row?.classList.remove("is-open");
    row?.setAttribute("aria-expanded", "false");
    return;
  }

  if (openTradeKey) {
    const prevWrap = contentEl.querySelector(
      `[data-trade-key="${CSS.escape(openTradeKey)}"]`
    );
    const prevPanel = prevWrap?.querySelector("[data-detail-panel]");
    closeTradeDetail(prevPanel);
    prevWrap?.querySelector(".trade-diary-row")?.classList.remove("is-open");
  }

  openTradeKey = key;
  const wrap = contentEl.querySelector(
    `[data-trade-key="${CSS.escape(key)}"]`
  );
  const panel = wrap?.querySelector("[data-detail-panel]");
  const row = wrap?.querySelector(".trade-diary-row");
  const trade = findTradeByKey(key);

  row?.classList.add("is-open");
  row?.setAttribute("aria-expanded", "true");

  if (trade && panel) {
    await openTradeDetail(panel, trade);
  }
}

function toggleDayCollapse(dayKey) {
  if (!contentEl || !dayKey) {
    return;
  }

  const section = contentEl.querySelector(
    `[data-day-key="${CSS.escape(dayKey)}"]`
  );
  if (!section) {
    return;
  }

  const willCollapse = !section.classList.contains("is-collapsed");
  section.classList.toggle("is-collapsed", willCollapse);

  if (willCollapse) {
    collapsedDayKeys.add(dayKey);
  } else {
    collapsedDayKeys.delete(dayKey);
  }

  const btn = section.querySelector("[data-action='toggle-day']");
  btn?.setAttribute("aria-expanded", willCollapse ? "false" : "true");

  if (willCollapse && openTradeKey) {
    const trade = findTradeByKey(openTradeKey);
    if (trade && diaryDayKeyLocal(trade.closeTimeMs) === dayKey) {
      void toggleTradeDetail(openTradeKey);
    }
  }
}

function bindDiaryInteractions() {
  if (!contentEl || contentEl.dataset.bound === "1") {
    return;
  }
  contentEl.dataset.bound = "1";

  contentEl.addEventListener("click", (event) => {
    const dayBtn = event.target.closest("[data-action='toggle-day']");
    if (dayBtn) {
      const section = dayBtn.closest("[data-day-key]");
      const dayKey = section?.dataset.dayKey;
      if (dayKey) {
        toggleDayCollapse(dayKey);
      }
      return;
    }

    const row = event.target.closest("[data-action='toggle-detail']");
    if (!row) {
      return;
    }
    const wrap = row.closest("[data-trade-key]");
    const key = wrap?.dataset.tradeKey;
    if (!key) {
      return;
    }
    void toggleTradeDetail(key);
  });
}

function paintDiaryTrades(trades, statusText, { loading = false, error = false } = {}) {
  weekTrades = (trades || []).map(diarySanitizeTrade);
  openTradeKey = null;
  collapsedDayKeys.clear();

  for (const [dayKey] of groupTradesByDay(trades)) {
    collapsedDayKeys.add(dayKey);
  }

  renderDiaryContent(trades, activePeriod.startMs, activePeriod.endMs);
  setStatus(statusText, { loading, error });
}

function patchDiaryTradeDurations(enrichedTrades) {
  const byIdentity = new Map();
  for (const trade of enrichedTrades || []) {
    byIdentity.set(tradeIdentityKey(trade), trade);
    byIdentity.set(tradeKey(trade), trade);
  }

  weekTrades = weekTrades.map((trade) => {
    const enriched =
      byIdentity.get(tradeIdentityKey(trade)) ||
      byIdentity.get(tradeKey(trade));

    if (
      !enriched ||
      !(Number(enriched.durationMs) > 0)
    ) {
      return trade;
    }

    const listCloseTimeMs =
      Number(trade.listCloseTimeMs) || Number(trade.closeTimeMs);

    return {
      ...trade,
      listCloseTimeMs,
      openTimeMs: enriched.openTimeMs,
      closeTimeMs: enriched.closeTimeMs,
      durationMs: enriched.durationMs,
      side: enriched.side || trade.side,
      avgEntryPrice: enriched.avgEntryPrice || trade.avgEntryPrice,
      avgExitPrice: enriched.avgExitPrice || trade.avgExitPrice,
      qty: enriched.qty || trade.qty,
      sparse: false,
      resolved: true
    };
  });

  if (!contentEl) {
    return;
  }

  for (const trade of weekTrades) {
    if (!(Number(trade.durationMs) > 0)) {
      continue;
    }
    const wrap = contentEl.querySelector(
      `[data-trade-key="${CSS.escape(tradeKey(trade))}"]`
    );
    const durationEl = wrap?.querySelector(".trade-diary-duration");
    if (durationEl) {
      durationEl.textContent = formatDiaryDuration(trade.durationMs);
    }
    const sideEl = wrap?.querySelector(".trade-diary-side");
    if (sideEl) {
      sideEl.textContent = sideLabel(trade.side);
      sideEl.className = `trade-diary-side ${sideToneClass(trade.side)}`;
    }
  }
}

async function maybeEnrichDiaryDurations(trades, period) {
  await diaryAfterListPaint({
    trades,
    period,
    applyEnrichedTrades: patchDiaryTradeDurations
  });
}

async function refreshDiary({ forceRefresh = false } = {}) {
  if (!contentEl) {
    return;
  }

  if (refreshBtn) {
    refreshBtn.disabled = true;
  }
  saveAlgoDiaryPeriod(activePeriod);

  let loadingCachedCount = 0;

  if (!forceRefresh) {
    const preview = diaryCollectCachedTrades(activePeriod);
    if (preview.length) {
      loadingCachedCount = preview.length;
      paintDiaryTrades(
        preview,
        `Сделок за период: ${preview.length} · кэш · обновляем…`,
        { loading: true }
      );
    } else {
      setStatus("Идет загрузка сделок ...", { loading: true });
      contentEl.innerHTML = "";
      openTradeKey = null;
    }
  } else {
    setStatus("Идет загрузка сделок ...", { loading: true });
    contentEl.innerHTML = "";
    openTradeKey = null;
  }

  const loadingRunId = startDiaryLoadingStatus(loadingCachedCount);

  try {
    const result = await diaryLoadPeriod(activePeriod, { forceRefresh });

    if (!result?.ok) {
      setStatus(result?.message || "Не удалось загрузить сделки", {
        error: true
      });
      if (!weekTrades.length) {
        contentEl.innerHTML = "";
      }
      return;
    }

    const trades = Array.isArray(result.trades) ? result.trades : [];
    const statusSuffix = result?.fromCache
      ? " · кэш"
      : result?.partialCache
        ? " · кэш + сегодня"
        : result?.sparse
          ? " · income"
          : "";

    paintDiaryTrades(
      trades,
      trades.length
        ? `Сделок за период: ${trades.length}${statusSuffix}`
        : result?.fromCache
          ? "Нет сделок · кэш"
          : ""
    );

    void maybeEnrichDiaryDurations(trades, activePeriod);
    hasLoadedOnce = true;
  } catch (err) {
    setStatus(err?.message || "Ошибка загрузки", { error: true });
    if (!weekTrades.length) {
      contentEl.innerHTML = "";
    }
  } finally {
    stopDiaryLoadingStatus(loadingRunId);
    if (refreshBtn) {
      refreshBtn.disabled = false;
    }
  }
}

function onEscapeKey(event) {
  if (event.key !== "Escape") {
    return;
  }
  if (!overlayEl || overlayEl.classList.contains("hidden")) {
    return;
  }
  if (document.querySelector(".trade-diary-period-overlay")) {
    return;
  }
  event.preventDefault();
  closeAlgoDiaryModal();
}

function ensureOverlay() {
  if (overlayEl) {
    return overlayEl;
  }

  const root = document.createElement("div");
  root.className = "algo-diary-overlay hidden";
  root.setAttribute(OVERLAY_ATTR, "");
  root.innerHTML = `
  <div class="algo-diary-modal" role="dialog" aria-modal="true" aria-label="Дневник Алготрейдинга">
    <div class="algo-diary-modal-head">
      <h2>Дневник</h2>
      <div class="algo-diary-modal-head-actions">
        <button type="button" id="algo-diary-period-btn" class="trade-diary-period-trigger" aria-haspopup="dialog">
          <svg class="trade-diary-period-trigger-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 3v4M16 3v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <span data-period-label>Период</span>
        </button>
        <button type="button" id="algo-diary-refresh" class="trade-diary-refresh" title="Обновить">Обновить</button>
        <button type="button" data-algo-diary-close class="algo-diary-close" aria-label="Закрыть">×</button>
      </div>
    </div>
    <p id="algo-diary-status" class="trade-diary-status" aria-live="polite"></p>
    <div id="algo-diary-content" class="trade-diary-content algo-diary-content"></div>
  </div>`;

  document.body.appendChild(root);

  overlayEl = root;
  modalEl = root.querySelector(".algo-diary-modal");
  statusEl = root.querySelector("#algo-diary-status");
  contentEl = root.querySelector("#algo-diary-content");
  refreshBtn = root.querySelector("#algo-diary-refresh");
  periodBtn = root.querySelector("#algo-diary-period-btn");

  root.addEventListener("click", (event) => {
    if (event.target === root) {
      closeAlgoDiaryModal();
    }
  });

  root.querySelectorAll("[data-algo-diary-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeAlgoDiaryModal();
    });
  });

  refreshBtn?.addEventListener("click", () => {
    void refreshDiary({ forceRefresh: true });
  });

  bindDiaryInteractions();

  if (!escapeBound) {
    document.addEventListener("keydown", onEscapeKey);
    escapeBound = true;
  }

  return overlayEl;
}

function mountPeriodPickerOnce() {
  if (periodPicker || !periodBtn) {
    return;
  }
  periodPicker = mountTradeDiaryPeriodPicker(periodBtn, {
    initialPeriod: activePeriod,
    onApply(period) {
      activePeriod = period;
      saveAlgoDiaryPeriod(period);
      void refreshDiary({ forceRefresh: true });
    }
  });
}

export function closeAlgoDiaryModal() {
  if (!overlayEl) {
    return;
  }

  if (openTradeKey && contentEl) {
    const wrap = contentEl.querySelector(
      `[data-trade-key="${CSS.escape(openTradeKey)}"]`
    );
    const panel = wrap?.querySelector("[data-detail-panel]");
    closeTradeDetail(panel);
    openTradeKey = null;
  }

  overlayEl.classList.remove("is-open");
  overlayEl.classList.add("hidden");
}

export async function openAlgoDiaryModal() {
  if (isAlgoBotLiteMode()) {
    return;
  }
  ensureOverlay();
  mountPeriodPickerOnce();

  overlayEl.classList.remove("hidden");
  overlayEl.classList.add("is-open");

  await refreshDiary({ forceRefresh: false });
}
