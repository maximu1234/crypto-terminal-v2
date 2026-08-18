/**
 * UI: «Подобрать для всех Ст1/2/3» — модалка как у Топ-100.
 */
import {
normalizeAlgoOptimizeStrategyId,
algoOptimizeStrategyLabel
} from "./strategy-param-optimize.js?v=9";

import {
ALGO_OPTIMIZE_UNIVERSE_BG_EVENT,
startAlgoOptimizeUniverseJob,
stopAlgoOptimizeUniverseJob,
isAlgoOptimizeUniverseJobRunning,
getAlgoOptimizeUniverseJobStrategy,
readAlgoOptimizeUniverseJob,
resumeAlgoOptimizeUniverseJob
} from "./optimize-universe-background.js?v=5";

import {
normalizeAlgoScanTf,
ALGO_TICKER_SCAN_TF
} from "./ticker-scanner.js?v=10";

import {
normalizeAlgoStatsMode
} from "./pattern-trade-stats.js?v=15";

import {
loadOptimizeUniverseResult,
saveOptimizeUniverseResult
} from "./modal-results-storage.js?v=5";

import {
pattern12SettingsCacheKey
} from "./pattern-12-settings.js?v=5";

import {
publishBotTickerBookFromOptimizeRows,
loadBotTickerBook,
persistBotTickerBookToMain
} from "./bot-ticker-book.js?v=7";

import {
writeTickerStrategyOverlays
} from "./ticker-strategy-overlays.js?v=1";

import {
botStrategyToFlagId,
replaceAlgoTickerFlagList
} from "./ticker-flags.js?v=8";

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
 * @param {object[]} rows
 * @param {{ key: string, direction: "asc"|"desc" }} sort
 * @returns {object[]}
 */
function sortRows(rows, sort){
  const key = sort?.key || "netUsd";
  const direction = sort?.direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if(key === "symbol"){
      const result = String(a?.symbol || "").localeCompare(
        String(b?.symbol || ""),
        "ru",
        { numeric: true, sensitivity: "base" }
      );
      return result * direction;
    }
    const aRaw = a?.[key];
    const bRaw = b?.[key];
    const an = aRaw === null || aRaw === undefined || aRaw === ""
      ? Number.NaN
      : Number(aRaw);
    const bn = bRaw === null || bRaw === undefined || bRaw === ""
      ? Number.NaN
      : Number(bRaw);
    const aOk = Number.isFinite(an);
    const bOk = Number.isFinite(bn);
    if(aOk && bOk && an !== bn){
      return (an - bn) * direction;
    }
    if(aOk !== bOk){
      return aOk ? -1 : 1;
    }
    return String(a?.symbol || "").localeCompare(String(b?.symbol || ""));
  });
}

/**
 * @param {object|null|undefined} row
 * @returns {boolean}
 */
function rowIncluded(row){
  if(!row || row.skipped){
    return false;
  }
  return row.include !== false;
}

/**
 * @param {object[]} rows
 * @returns {object[]}
 */
function withDefaultInclude(rows){
  return (Array.isArray(rows) ? rows : []).map(row => {
    if(!row || typeof row !== "object"){
      return row;
    }
    if(row.skipped){
      return {
        ...row,
        include: false
      };
    }
    return {
      ...row,
      include: row.include !== false
    };
  });
}

/**
 * @param {{
 *   getTradeOpts: () => object,
 *   getStrategyStatsMode?: (id: string) => string,
 *   getScanTf?: () => string,
 *   onListsChanged?: () => void
 * }} host
 */
export function mountAlgoStrategyParamOptimizeUniverseUi(host){
  const modal = document.getElementById("algo-optimize-universe-modal");
  const titleEl = document.getElementById("algo-optimize-universe-modal-title");
  const noteEl = document.getElementById("algo-optimize-universe-modal-note");
  const progressWrap = document.getElementById("algo-optimize-universe-progress");
  const progressBar = document.getElementById("algo-optimize-universe-progress-bar");
  const progressLabel = document.getElementById("algo-optimize-universe-progress-label");
  const runBtn = document.getElementById("algo-optimize-universe-run");
  const applyBotBtn = document.getElementById("algo-optimize-universe-apply-bot");
  const applyAllBtn = document.getElementById("algo-optimize-universe-apply-all");
  const stopBtn = document.getElementById("algo-optimize-universe-stop");
  const pickAll = document.getElementById("algo-optimize-universe-pick-all");
  const tableHead = document.querySelector("#algo-optimize-universe-table thead");
  const tableBody = document.querySelector("#algo-optimize-universe-table tbody");
  const closeBtns = [
    ...(document.querySelectorAll('[data-close="algo-optimize-universe-modal"]') || [])
  ];
  const openBtns = [
    ...(document.querySelectorAll("[data-algo-optimize-universe]") || [])
  ];

  if(!modal || !openBtns.length){
    return {
      stopAll(){},
      destroy(){}
    };
  }

  /** @type {"st1"|"st2"|"st3"} */
  let pendingStrategy = "st1";
  /** @type {{ key: string, direction: "asc"|"desc" }} */
  let tableSort = {
    key: "netUsd",
    direction: "desc"
  };
  /** Последний прогресс фоновой джобы (для мгновенной отрисовки при открытии). */
  /** @type {{ strategyId: string, tf: string, done: number, total: number, rows: object[] }|null} */
  let liveProgress = null;
  /** Якорь для Shift+клика по чекбоксам (диапазон строк). */
  let lastPickedSymbol = "";

  function currentSettingsKey(){
    return pattern12SettingsCacheKey(
      host.getTradeOpts?.()?.patternSettings
    );
  }

  function isJobRunning(){
    return isAlgoOptimizeUniverseJobRunning();
  }

  function jobStrategy(){
    return getAlgoOptimizeUniverseJobStrategy();
  }

  /**
   * Читаем с диска: фоновая джоба пишет туда прогресс с любой страницы.
   * @param {string} strategyId
   */
  function loadCached(strategyId){
    const id = normalizeAlgoOptimizeStrategyId(strategyId);
    const disk = loadOptimizeUniverseResult(id, currentSettingsKey());
    if(!disk){
      return null;
    }
    return {
      ...disk,
      rows: withDefaultInclude(disk.rows || [])
    };
  }

  /**
   * @param {string} strategyId
   * @param {{ rows: object[], done: number, total: number, tf: string, statsMode: string, partial?: boolean }} payload
   */
  function saveCached(strategyId, payload){
    const id = normalizeAlgoOptimizeStrategyId(strategyId);
    const next = {
      rows: withDefaultInclude(payload.rows),
      done: Number(payload.done) || 0,
      total: Number(payload.total) || 0,
      tf: String(payload.tf || ""),
      statsMode: String(payload.statsMode || ""),
      settingsKey: String(payload.settingsKey || currentSettingsKey()),
      partial: payload.partial === true,
      finishedAt: Date.now()
    };
    saveOptimizeUniverseResult(id, next);
    return next;
  }

  /**
   * @param {string} strategyId
   * @param {object[]} rows
   */
  function persistRows(strategyId, rows){
    const cached = loadCached(strategyId);
    if(!cached){
      return;
    }
    saveCached(strategyId, {
      ...cached,
      rows
    });
  }

  function setOpen(open){
    modal.classList.toggle("hidden", !open);
    modal.hidden = !open;
    if(open){
      modal.removeAttribute("hidden");
    }else{
      modal.setAttribute("hidden", "");
    }
  }

  function isOpen(){
    return !modal.hidden;
  }

  /** Правки книги блокируем только у той стратегии, которую сейчас сканируем. */
  function isEditLocked(){
    return isJobRunning() && jobStrategy() === pendingStrategy;
  }

  function setProgress(done, total){
    const t = Math.max(0, Number(total) || 0);
    const d = Math.max(0, Number(done) || 0);
    if(progressWrap){
      progressWrap.hidden = false;
    }
    const pct = t ? Math.round(Math.min(d, t) / t * 100) : 0;
    if(progressBar){
      progressBar.style.width = `${pct}%`;
    }
    if(progressLabel){
      progressLabel.textContent = t ? `${Math.min(d, t)} / ${t}` : `${d}`;
    }
  }

  function syncRunningUi(){
    const running = isJobRunning();
    if(runBtn){
      runBtn.disabled = running;
      runBtn.hidden = running;
    }
    if(stopBtn){
      stopBtn.hidden = !running;
      stopBtn.disabled = !running;
    }
    if(applyBotBtn){
      applyBotBtn.disabled = isEditLocked();
    }
    if(applyAllBtn){
      applyAllBtn.disabled = isEditLocked();
    }
  }

  /**
   * @param {object[]} rows
   */
  function syncPickAll(rows){
    if(!pickAll){
      return;
    }
    const eligible = rows.filter(r => r && !r.skipped);
    const included = eligible.filter(rowIncluded);
    pickAll.disabled = !eligible.length || isEditLocked();
    pickAll.checked = eligible.length > 0 && included.length === eligible.length;
    pickAll.indeterminate =
      included.length > 0 && included.length < eligible.length;
  }

  /**
   * @param {object[]} rows
   */
  function renderTable(rows){
    if(!tableBody){
      return;
    }

    const sorted = sortRows(withDefaultInclude(rows), tableSort);
    const html = sorted.map((row, i) => {
      const skipped = !!row.skipped;
      const net = skipped ? "—" : formatUsd(row.netUsd);
      const winRate = row.winRate === null || row.winRate === undefined
        ? Number.NaN
        : Number(row.winRate);
      const closedCount = Number(row.closed);
      const storedWins = Number(row.wins);
      const storedLosses = Number(row.losses);
      const wins = Number.isFinite(storedWins)
        ? storedWins
        : Number.isFinite(closedCount) && Number.isFinite(winRate)
          ? Math.round(closedCount * winRate / 100)
          : Number.NaN;
      const losses = Number.isFinite(storedLosses)
        ? storedLosses
        : Number.isFinite(closedCount) && Number.isFinite(wins)
          ? closedCount - wins
          : Number.NaN;
      const outcomes = Number.isFinite(wins) && Number.isFinite(losses)
        ? `${wins}/${losses}`
        : "—/—";
      const closed = skipped ? "—" : `${row.closed ?? 0} (${outcomes})`;
      const winRateLabel = skipped || !Number.isFinite(winRate)
        ? "—"
        : `${winRate.toFixed(1)}%`;
      const expectancyR = row.expectancyR === null || row.expectancyR === undefined
        ? Number.NaN
        : Number(row.expectancyR);
      const expectancyLabel = skipped || !Number.isFinite(expectancyR)
        ? "—"
        : expectancyR.toFixed(2);
      const maxDd = row.maxDrawdownUsd === null || row.maxDrawdownUsd === undefined
        ? Number.NaN
        : Number(row.maxDrawdownUsd);
      const maxDdLabel = skipped || !Number.isFinite(maxDd)
        ? "—"
        : formatUsd(-Math.abs(maxDd), { signed: true });
      const params = skipped
        ? (row.error ? `ошибка: ${row.error}` : "—")
        : (row.paramsBrief || "—");
      const tfLabel = skipped ? "—" : (row.tf || "—");
      const netClass = !skipped && Number(row.netUsd) > 0
        ? "is-pos"
        : !skipped && Number(row.netUsd) < 0
          ? "is-neg"
          : "";
      const sym = String(row.symbol || "").replace(/"/g, "&quot;");
      const checked = rowIncluded(row) ? " checked" : "";
      const disabled = skipped || isEditLocked() ? " disabled" : "";
      return `<tr data-symbol="${sym}" class="${skipped ? "is-skip" : ""}">
        <td class="algo-optimize-universe-col-pick">
          <label class="algo-bot-check">
            <input type="checkbox" data-algo-optimize-include${checked}${disabled} />
          </label>
        </td>
        <td>${i + 1}</td>
        <td>${row.symbol || "—"}</td>
        <td>${tfLabel}</td>
        <td class="algo-optimize-universe-params">${params}</td>
        <td>${closed}</td>
        <td>${winRateLabel}</td>
        <td>${expectancyLabel}</td>
        <td class="is-neg">${maxDdLabel}</td>
        <td class="${netClass}">${net}</td>
      </tr>`;
    }).join("");

    tableBody.innerHTML =
      html ||
      `<tr><td colspan="10" class="algo-optimize-universe-empty">Нет результатов</td></tr>`;
    syncPickAll(sorted);
  }

  function syncSortHeaders(){
    for(const th of tableHead?.querySelectorAll("[data-algo-optimize-sort]") || []){
      const active = th.getAttribute("data-algo-optimize-sort") === tableSort.key;
      th.setAttribute(
        "aria-sort",
        active
          ? (tableSort.direction === "asc" ? "ascending" : "descending")
          : "none"
      );
    }
  }

  function setTableSort(key){
    if(!["symbol", "closed", "winRate", "expectancyR", "maxDrawdownUsd", "netUsd"].includes(key)){
      return;
    }
    /* Порядок строк меняется — старый якорь диапазона больше не осмыслен. */
    lastPickedSymbol = "";
    if(tableSort.key === key){
      tableSort.direction = tableSort.direction === "asc" ? "desc" : "asc";
    }else{
      tableSort = {
        key,
        direction: key === "symbol" ? "asc" : "desc"
      };
    }
    syncSortHeaders();
    renderTable(loadCached(pendingStrategy)?.rows || []);
  }

  /**
   * @param {object[]} rows
   * @param {{ hintUpdate?: boolean }} [opts]
   */
  function renderSummary(rows, opts = {}){
    if(!noteEl){
      return;
    }
    const list = withDefaultInclude(rows);
    const ok = list.filter(r => !r.skipped && Number.isFinite(Number(r.netUsd)));
    const picked = list.filter(rowIncluded);
    let sum = 0;
    for(const r of ok){
      sum += Number(r.netUsd) || 0;
    }
    let text =
      `${algoOptimizeStrategyLabel(pendingStrategy)} · все тикеры · готово ${ok.length}` +
      (ok.length ? ` · сумма PnL ${formatUsd(sum)}` : "") +
      (picked.length ? ` · в книгу ${picked.length}` : "");
    if(opts.hintUpdate){
      text += ". Нажмите «Запустить» для обновления.";
    }
    const book = loadBotTickerBook(pendingStrategy);
    if(book?.tickerCount){
      const when = book.publishedAt
        ? new Date(book.publishedAt).toLocaleString()
        : "—";
      text += ` · книга бота: ${book.tickerCount} тикеров (${when})`;
    }
    noteEl.textContent = text;
  }

  /**
   * @param {string} symbol
   * @param {boolean} include
   */
  function setRowInclude(symbol, include){
    const cached = loadCached(pendingStrategy);
    if(!cached){
      return;
    }
    const sym = String(symbol || "").trim().toUpperCase();
    const rows = withDefaultInclude(cached.rows).map(row => {
      if(String(row?.symbol || "").trim().toUpperCase() !== sym){
        return row;
      }
      if(row.skipped){
        return {
          ...row,
          include: false
        };
      }
      return {
        ...row,
        include: !!include
      };
    });
    persistRows(pendingStrategy, rows);
    syncPickAll(rows);
    renderSummary(rows);
  }

  /**
   * Символы в текущем порядке таблицы (сортировка учтена).
   * @returns {string[]}
   */
  function renderedSymbols(){
    return [
      ...(tableBody?.querySelectorAll("tr[data-symbol]") || [])
    ].map(tr => String(tr.getAttribute("data-symbol") || "").trim().toUpperCase());
  }

  /**
   * Shift+клик: применить состояние ко всем строкам между якорем и текущей.
   * @param {string} fromSymbol
   * @param {string} toSymbol
   * @param {boolean} include
   * @returns {boolean}
   */
  function setRangeInclude(fromSymbol, toSymbol, include){
    const order = renderedSymbols();
    const from = order.indexOf(String(fromSymbol || "").trim().toUpperCase());
    const to = order.indexOf(String(toSymbol || "").trim().toUpperCase());

    if(from < 0 || to < 0){
      return false;
    }

    const range = new Set(
      order.slice(Math.min(from, to), Math.max(from, to) + 1)
    );
    const cached = loadCached(pendingStrategy);

    if(!cached){
      return false;
    }

    const rows = withDefaultInclude(cached.rows).map(row => {
      const sym = String(row?.symbol || "").trim().toUpperCase();
      if(!range.has(sym)){
        return row;
      }
      if(row.skipped){
        return {
          ...row,
          include: false
        };
      }
      return {
        ...row,
        include: !!include
      };
    });

    persistRows(pendingStrategy, rows);
    renderTable(rows);
    renderSummary(rows);
    return true;
  }

  function setAllInclude(include){
    const cached = loadCached(pendingStrategy);
    if(!cached){
      return;
    }
    const rows = withDefaultInclude(cached.rows).map(row => {
      if(!row || row.skipped){
        return {
          ...row,
          include: false
        };
      }
      return {
        ...row,
        include: !!include
      };
    });
    persistRows(pendingStrategy, rows);
    renderTable(rows);
    renderSummary(rows);
  }

  function applyToAllTickers(){
    const cached = loadCached(pendingStrategy);
    const allRows = withDefaultInclude(cached?.rows || []);
    const rows = allRows.filter(rowIncluded);
    const entries = rows
      .filter(row => row?.patch && typeof row.patch === "object")
      .map(row => ({
        symbol: row.symbol,
        patch: row.patch
      }));
    if(!entries.length){
      if(noteEl){
        const anyRows = allRows.some(row => row && !row.skipped);
        noteEl.textContent = anyRows
          ? "Нет отмеченных тикеров. Включите чекбоксы и снова «Применить ко всем»."
          : "Нет строк с параметрами. Запустите подбор ещё раз.";
      }
      return;
    }
    let written = 0;
    if(typeof host.applyOptimizedPatchesToTickers === "function"){
      written = Number(host.applyOptimizedPatchesToTickers(pendingStrategy, entries)) || 0;
    }else{
      written = writeTickerStrategyOverlays(pendingStrategy, entries);
    }
    if(!written){
      if(noteEl){
        noteEl.textContent = "Не удалось записать параметры в Данные.";
      }
      return;
    }
    if(noteEl){
      noteEl.textContent =
        `В Данные записано ${written} тикеров ${algoOptimizeStrategyLabel(pendingStrategy)}. При переключении тикера панель покажет эти параметры.`;
    }
  }

  function applyToBot(){
    const cached = loadCached(pendingStrategy);
    const allRows = withDefaultInclude(cached?.rows || []);
    const rows = allRows.filter(rowIncluded);
    const result = publishBotTickerBookFromOptimizeRows(pendingStrategy, {
      rows,
      tf: cached?.tf || "",
      statsMode: cached?.statsMode || ""
    });
    if(!result.ok){
      if(noteEl){
        noteEl.textContent = result.message || "Не удалось применить к боту";
      }
      return;
    }

    const symbols = Object.keys(result.book?.tickers || {}).sort((a, b) =>
      a.localeCompare(b)
    );
    replaceAlgoTickerFlagList(
      botStrategyToFlagId(pendingStrategy),
      symbols
    );
    host.onListsChanged?.();

    renderSummary(allRows);
    void persistBotTickerBookToMain(pendingStrategy, result.book);
    if(noteEl){
      const base = noteEl.textContent || "";
      noteEl.textContent =
        `${base} · применено к боту (${result.tickerCount}) и в список ${algoOptimizeStrategyLabel(pendingStrategy)}. Без этой книги бот не запустится; снимок берётся при старте.`;
    }
  }

  function openFor(rawId){
    pendingStrategy = normalizeAlgoOptimizeStrategyId(rawId);
    lastPickedSymbol = "";
    const tf = normalizeAlgoScanTf(host.getScanTf?.() || ALGO_TICKER_SCAN_TF);
    const statsMode = normalizeAlgoStatsMode(
      host.getStrategyStatsMode?.(pendingStrategy) || "direct"
    );
    const cached = loadCached(pendingStrategy);
    const running = isJobRunning();
    const live = running && liveProgress && liveProgress.strategyId === pendingStrategy
      ? liveProgress
      : null;

    if(titleEl){
      titleEl.textContent = `Подбор · ${algoOptimizeStrategyLabel(pendingStrategy)} · все тикеры`;
    }

    if(live){
      renderTable(withDefaultInclude(live.rows));
      setProgress(live.done, live.total);
      if(noteEl){
        noteEl.textContent =
          `Идёт подбор · ${live.done} / ${live.total} · ТФ ${live.tf}. Окно можно закрыть — подбор продолжится.`;
      }
    }else if(running){
      const job = readAlgoOptimizeUniverseJob();
      const done = Number(job?.done) || 0;
      const total = Number(job?.total) || 0;
      renderTable(cached?.rows || []);
      setProgress(done, total);
      if(noteEl){
        noteEl.textContent = jobStrategy() === pendingStrategy
          ? `Идёт подбор · ${done} / ${total} · ТФ ${job?.tf || tf}. Окно можно закрыть и уйти на другую страницу — подбор продолжится.`
          : `Сейчас считается ${algoOptimizeStrategyLabel(jobStrategy())} · ${done} / ${total}. «Стоп» остановит его.`;
      }
    }else if(cached){
      renderTable(cached.rows || []);
      setProgress(cached.done, cached.total);
      renderSummary(cached.rows || [], { hintUpdate: true });
    }else{
      if(noteEl){
        noteEl.textContent =
          `${algoOptimizeStrategyLabel(pendingStrategy)} · все тикеры · ТФ ${tf} · ${statsMode}. Нажмите «Запустить».`;
      }
      renderTable([]);
      if(progressWrap){
        progressWrap.hidden = true;
      }
      setProgress(0, 0);
    }

    syncRunningUi();
    setOpen(true);
  }

  function runScan(){
    if(isJobRunning()){
      if(noteEl){
        noteEl.textContent =
          `Уже идёт подбор ${algoOptimizeStrategyLabel(jobStrategy() || pendingStrategy)} — дождитесь конца или нажмите «Стоп».`;
      }
      return;
    }

    const strategyId = pendingStrategy;
    const tf = normalizeAlgoScanTf(host.getScanTf?.() || ALGO_TICKER_SCAN_TF);
    const statsMode = normalizeAlgoStatsMode(
      host.getStrategyStatsMode?.(strategyId) || "direct"
    );
    const tradeOpts = host.getTradeOpts?.(strategyId) || {};

    liveProgress = {
      strategyId,
      tf,
      done: 0,
      total: 0,
      rows: []
    };

    renderTable([]);
    setProgress(0, 0);

    if(titleEl){
      titleEl.textContent = `Подбор · ${algoOptimizeStrategyLabel(strategyId)} · все тикеры`;
    }
    if(noteEl){
      noteEl.textContent =
        `Идёт подбор · ТФ ${tf} · ${statsMode}… Окно можно закрыть и уйти на другую страницу — подбор продолжится.`;
    }

    startAlgoOptimizeUniverseJob({
      strategyId,
      tf,
      statsMode,
      tradeOpts
    });
    syncRunningUi();
  }

  function stopScan(){
    if(stopBtn){
      stopBtn.disabled = true;
    }
    if(noteEl && isJobRunning()){
      noteEl.textContent =
        `Останавливаю подбор ${algoOptimizeStrategyLabel(jobStrategy() || pendingStrategy)}…`;
    }
    stopAlgoOptimizeUniverseJob();
  }

  for(const btn of openBtns){
    btn.addEventListener("click", () => {
      openFor(btn.getAttribute("data-algo-optimize-universe"));
    });
  }

  runBtn?.addEventListener("click", () => {
    runScan();
  });

  applyBotBtn?.addEventListener("click", () => {
    applyToBot();
  });

  applyAllBtn?.addEventListener("click", () => {
    applyToAllTickers();
  });

  stopBtn?.addEventListener("click", () => {
    stopScan();
  });

  pickAll?.addEventListener("change", () => {
    if(isEditLocked()){
      pickAll.checked = !pickAll.checked;
      return;
    }
    setAllInclude(!!pickAll.checked);
  });

  tableHead?.addEventListener("click", ev => {
    const th = ev.target instanceof Element
      ? ev.target.closest("[data-algo-optimize-sort]")
      : null;
    if(!th){
      return;
    }
    setTableSort(th.getAttribute("data-algo-optimize-sort") || "");
  });

  /* click, не change: только он знает про shiftKey (и его же шлёт пробел). */
  tableBody?.addEventListener("click", ev => {
    const input = ev.target;
    if(!(input instanceof HTMLInputElement)){
      return;
    }
    if(!input.hasAttribute("data-algo-optimize-include")){
      return;
    }
    if(isEditLocked()){
      ev.preventDefault();
      return;
    }

    const tr = input.closest("tr");
    const symbol = tr?.getAttribute("data-symbol") || "";
    const include = !!input.checked;

    if(ev.shiftKey && lastPickedSymbol && lastPickedSymbol !== symbol){
      /* Shift+клик выделяет текст между строками — мешает читать таблицу. */
      window.getSelection?.()?.removeAllRanges?.();

      if(setRangeInclude(lastPickedSymbol, symbol, include)){
        lastPickedSymbol = symbol;
        return;
      }
    }

    setRowInclude(symbol, include);
    lastPickedSymbol = symbol;
  });

  for(const el of closeBtns){
    el.addEventListener("click", () => {
      setOpen(false);
    });
  }

  document.addEventListener("keydown", ev => {
    if(ev.key !== "Escape"){
      return;
    }
    if(modal && !modal.hidden){
      setOpen(false);
    }
  });

  function onBackgroundUpdate(ev){
    const detail = ev?.detail || {};
    const strategyId = normalizeAlgoOptimizeStrategyId(detail.strategyId);

    if(detail.type === "progress"){
      liveProgress = {
        strategyId,
        tf: String(detail.tf || ""),
        done: Number(detail.done) || 0,
        total: Number(detail.total) || 0,
        rows: Array.isArray(detail.rows) ? detail.rows : []
      };
    }

    if(detail.type === "finished" || detail.type === "stopped" || detail.type === "error"){
      liveProgress = null;
    }

    /* Окно закрыто или открыта другая стратегия — DOM не трогаем. */
    if(!isOpen() || pendingStrategy !== strategyId){
      return;
    }

    syncRunningUi();

    if(detail.type === "progress"){
      setProgress(detail.done, detail.total);
      renderTable(withDefaultInclude(detail.rows || []));
      if(noteEl){
        noteEl.textContent =
          `Идёт подбор · ${detail.done} / ${detail.total} · ТФ ${detail.tf}. Окно можно закрыть и уйти на другую страницу — подбор продолжится.`;
      }
      return;
    }

    if(detail.type === "error"){
      if(noteEl){
        noteEl.textContent = `Ошибка: ${detail.message || "неизвестная"}`;
      }
      return;
    }

    if(detail.type === "finished" || detail.type === "stopped"){
      const cached = loadCached(strategyId);
      setProgress(
        Number(detail.done) || cached?.done || 0,
        Number(detail.total) || cached?.total || 0
      );
      renderTable(cached?.rows || []);
      renderSummary(cached?.rows || [], { hintUpdate: detail.type === "finished" });
      if(detail.type === "stopped" && noteEl){
        noteEl.textContent = `${noteEl.textContent || ""} · остановлено`;
      }
    }
  }

  window.addEventListener(
    ALGO_OPTIMIZE_UNIVERSE_BG_EVENT,
    onBackgroundUpdate
  );

  /* Страница Алго открылась во время фонового подбора — продолжаем его здесь. */
  resumeAlgoOptimizeUniverseJob();

  return {
    /* Фоновый подбор не привязан к странице: teardown его не отменяет. */
    stopAll(){},
    destroy(){
      window.removeEventListener(
        ALGO_OPTIMIZE_UNIVERSE_BG_EVENT,
        onBackgroundUpdate
      );
      setOpen(false);
    }
  };
}
