/**
 * Mobile Screener — 2 widgets, full ticker universe, desktop-like toolbar
 * (volume / search / sort / TF). No layout picker.
 */
import {
  mountMobileReadOnlyChart
} from "./chart-lite.js?v=2";
import {
  loadMarketSymbols,
  peekMarketSymbolsCache
} from "../market-api.js?v=6";
import {
  fetchTickersInto
} from "../tickers.js?v=29";
import {
  filterSymbolsByMinVolume,
  normalizeMinVolume,
  parseMinVolumeFilter,
  formatMinVolumeFilter,
  syncMinVolumeFilterInput
} from "../screener-volume-filter.js?v=4";
import {
  loadScreenerState,
  saveScreenerState
} from "../storage.js?v=14";

const PAGE_SIZE = 2;
const MOBILE_PAGE_KEY = "mc-mobile-screener-page-v1";

const TF_OPTIONS = [
  { id: "1", label: "1m" },
  { id: "5", label: "5m" },
  { id: "15", label: "15m" },
  { id: "60", label: "1h" },
  { id: "240", label: "4h" },
  { id: "D", label: "1D" },
  { id: "W", label: "W" }
];

const SORT_OPTIONS = [
  { id: "change24", label: "24ч %" },
  { id: "volume24", label: "Объём 24ч" },
  { id: "symbol", label: "А–Я" }
];

function normalizeSortMode(value) {
  if (value === "symbol" || value === "volume24") {
    return value;
  }
  return "change24";
}

function normalizeTf(value) {
  const id = String(value || "");
  return TF_OPTIONS.some((o) => o.id === id) ? id : "15";
}

function tfLabel(id) {
  return TF_OPTIONS.find((o) => o.id === id)?.label || id;
}

function sortLabel(id) {
  return SORT_OPTIONS.find((o) => o.id === id)?.label || id;
}

function mapSymbolList(list) {
  return (list || [])
    .map((x) => (typeof x === "string" ? x : x?.symbol))
    .filter(Boolean)
    .map((s) => String(s).replace(/\.P$/i, "").trim().toUpperCase());
}

function loadMobilePage() {
  try {
    const n = Number(localStorage.getItem(MOBILE_PAGE_KEY));
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  } catch {
    return 1;
  }
}

function saveMobilePage(page) {
  try {
    localStorage.setItem(MOBILE_PAGE_KEY, String(page));
  } catch {
    /* ignore */
  }
}

function closeOpenMenus(root) {
  root.querySelectorAll(".mobile-screener-pick-menu").forEach((el) => {
    el.classList.add("hidden");
  });
  root.querySelectorAll(".mobile-screener-pick[aria-expanded]").forEach((el) => {
    el.setAttribute("aria-expanded", "false");
  });
}

/**
 * @param {HTMLElement} root
 */
export async function mountMobileScreenerPage(root) {
  const saved = loadScreenerState() || {};
  let sortMode = normalizeSortMode(saved.sort);
  let currentTF = normalizeTf(saved.tf);
  let minVolumeFilter = normalizeMinVolume(saved.minVolume);
  let currentPage = loadMobilePage();
  /** @type {string[]} */
  let allSymbols = [];
  const tickerMap = new Map();
  /** @type {Array<Awaited<ReturnType<typeof mountMobileReadOnlyChart>>|null>} */
  const mounts = [null, null];
  let renderToken = 0;

  root.innerHTML = `
    <div class="mobile-screener-toolbar">
      <input type="text" class="mobile-input mobile-screener-volume" id="mobile-screener-volume"
        placeholder="Объём ≥" inputmode="decimal" autocomplete="off" spellcheck="false"
        aria-label="Минимальный объём 24ч"/>
      <input type="search" class="mobile-input mobile-screener-search" id="mobile-screener-search"
        placeholder="Поиск" autocomplete="off" spellcheck="false"
        aria-label="Поиск монеты" enterkeyhint="search"/>
      <div class="mobile-screener-pick-wrap">
        <button type="button" class="mobile-screener-pick" id="mobile-screener-sort-btn" aria-haspopup="listbox" aria-expanded="false">
          <span id="mobile-screener-sort-label">${sortLabel(sortMode)}</span>
          <span class="mobile-screener-pick-caret" aria-hidden="true">▾</span>
        </button>
        <div class="mobile-screener-pick-menu hidden" id="mobile-screener-sort-menu" role="listbox" aria-label="Сортировка"></div>
      </div>
      <div class="mobile-screener-pick-wrap">
        <button type="button" class="mobile-screener-pick" id="mobile-screener-tf-btn" aria-haspopup="listbox" aria-expanded="false">
          <span id="mobile-screener-tf-label">${tfLabel(currentTF)}</span>
          <span class="mobile-screener-pick-caret" aria-hidden="true">▾</span>
        </button>
        <div class="mobile-screener-pick-menu hidden" id="mobile-screener-tf-menu" role="listbox" aria-label="Таймфрейм"></div>
      </div>
    </div>
    <p class="mobile-muted mobile-screener-status" id="mobile-screener-status">Загрузка…</p>
    <div class="mobile-screener-grid" id="mobile-screener-grid"></div>
    <div class="mobile-screener-pager" id="mobile-screener-pager"></div>
  `;

  const grid = root.querySelector("#mobile-screener-grid");
  const statusEl = root.querySelector("#mobile-screener-status");
  const pagerEl = root.querySelector("#mobile-screener-pager");
  const volumeInput = root.querySelector("#mobile-screener-volume");
  const searchInput = root.querySelector("#mobile-screener-search");
  const sortBtn = root.querySelector("#mobile-screener-sort-btn");
  const sortMenu = root.querySelector("#mobile-screener-sort-menu");
  const sortLabelEl = root.querySelector("#mobile-screener-sort-label");
  const tfBtn = root.querySelector("#mobile-screener-tf-btn");
  const tfMenu = root.querySelector("#mobile-screener-tf-menu");
  const tfLabelEl = root.querySelector("#mobile-screener-tf-label");

  for (let i = 0; i < PAGE_SIZE; i++) {
    const slot = document.createElement("article");
    slot.className = "mobile-screener-slot";
    slot.innerHTML = `
      <div class="mobile-screener-slot-head">
        <span class="mobile-screener-slot-sym">—</span>
        <span class="mobile-screener-slot-chg mobile-muted"></span>
      </div>
      <div class="mobile-screener-slot-chart"></div>
    `;
    grid.append(slot);
  }

  function persistShared() {
    const prev = loadScreenerState() || {};
    saveScreenerState({
      ...prev,
      sort: sortMode,
      tf: currentTF,
      minVolume: minVolumeFilter
    });
    saveMobilePage(currentPage);
  }

  function getVisibleSymbols() {
    return filterSymbolsByMinVolume(
      allSymbols,
      minVolumeFilter,
      (sym) => tickerMap.get(sym)?.volume24
    );
  }

  function getSortedSymbols() {
    const list = getVisibleSymbols();
    if (sortMode === "symbol") {
      list.sort((a, b) => a.localeCompare(b));
      return list;
    }
    const field = sortMode === "volume24" ? "volume24" : "change24";
    list.sort((a, b) => {
      const ca = tickerMap.get(a)?.[field];
      const cb = tickerMap.get(b)?.[field];
      const ha = Number.isFinite(ca);
      const hb = Number.isFinite(cb);
      if (!ha && !hb) {
        return a.localeCompare(b);
      }
      if (!ha) {
        return 1;
      }
      if (!hb) {
        return -1;
      }
      return cb - ca;
    });
    return list;
  }

  function totalPages() {
    const n = getVisibleSymbols().length;
    return Math.max(1, Math.ceil(n / PAGE_SIZE));
  }

  function clampPage() {
    const max = totalPages();
    if (currentPage > max) {
      currentPage = max;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }
  }

  function symbolsForPage() {
    clampPage();
    const sorted = getSortedSymbols();
    const start = (currentPage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }

  function findPageForSymbol(symbol) {
    const normalized = String(symbol || "")
      .replace(/\.P$/i, "")
      .trim()
      .toUpperCase();
    if (!normalized) {
      return null;
    }
    const sorted = getSortedSymbols();
    const index = sorted.indexOf(normalized);
    if (index < 0) {
      return null;
    }
    return Math.floor(index / PAGE_SIZE) + 1;
  }

  function setStatus(text) {
    if (statusEl) {
      statusEl.textContent = text || "";
      statusEl.hidden = !text;
    }
  }

  function updateSlotMeta(slotIndex, symbol) {
    const slot = grid.children[slotIndex];
    if (!slot) {
      return;
    }
    const symEl = slot.querySelector(".mobile-screener-slot-sym");
    const chgEl = slot.querySelector(".mobile-screener-slot-chg");
    if (symEl) {
      symEl.textContent = symbol || "—";
    }
    const chg = tickerMap.get(symbol)?.change24;
    if (chgEl) {
      if (Number.isFinite(chg)) {
        const sign = chg > 0 ? "+" : "";
        chgEl.textContent = `${sign}${chg.toFixed(2)}%`;
        chgEl.classList.toggle("mobile-pnl-up", chg > 0);
        chgEl.classList.toggle("mobile-pnl-down", chg < 0);
      } else {
        chgEl.textContent = "";
        chgEl.classList.remove("mobile-pnl-up", "mobile-pnl-down");
      }
    }
  }

  async function remountSlot(slotIndex, symbol, token) {
    const slot = grid.children[slotIndex];
    const chartHost = slot?.querySelector(".mobile-screener-slot-chart");
    if (!chartHost) {
      return;
    }
    updateSlotMeta(slotIndex, symbol);
    try {
      mounts[slotIndex]?.destroy?.();
    } catch {
      /* ignore */
    }
    mounts[slotIndex] = null;
    if (!symbol) {
      chartHost.replaceChildren();
      return;
    }
    const mount = await mountMobileReadOnlyChart(chartHost, symbol, currentTF);
    if (token !== renderToken) {
      try {
        mount?.destroy?.();
      } catch {
        /* ignore */
      }
      return;
    }
    mounts[slotIndex] = mount;
  }

  async function renderPage() {
    const token = ++renderToken;
    clampPage();
    persistShared();
    const pageSymbols = symbolsForPage();
    const total = totalPages();
    const visible = getVisibleSymbols().length;
    setStatus(
      visible
        ? `${visible} тикеров · стр. ${currentPage}/${total}`
        : minVolumeFilter > 0
          ? "Нет тикеров по фильтру объёма"
          : "Нет тикеров"
    );
    renderPager(total);
    const jobs = [];
    for (let i = 0; i < PAGE_SIZE; i++) {
      jobs.push(remountSlot(i, pageSymbols[i] || "", token));
    }
    await Promise.all(jobs);
  }

  function renderPager(total) {
    if (!pagerEl) {
      return;
    }
    pagerEl.replaceChildren();
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "mobile-btn is-ghost mobile-screener-page-btn";
    prev.textContent = "‹";
    prev.disabled = currentPage <= 1;
    prev.addEventListener("click", () => {
      if (currentPage <= 1) {
        return;
      }
      currentPage -= 1;
      void renderPage();
    });
    const info = document.createElement("span");
    info.className = "mobile-screener-page-info";
    info.textContent = `${currentPage} / ${total}`;
    const next = document.createElement("button");
    next.type = "button";
    next.className = "mobile-btn is-ghost mobile-screener-page-btn";
    next.textContent = "›";
    next.disabled = currentPage >= total;
    next.addEventListener("click", () => {
      if (currentPage >= total) {
        return;
      }
      currentPage += 1;
      void renderPage();
    });
    pagerEl.append(prev, info, next);
  }

  function fillPickMenu(menu, options, activeId, onPick) {
    menu.replaceChildren();
    for (const opt of options) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mobile-screener-pick-item";
      btn.setAttribute("role", "option");
      if (opt.id === activeId) {
        btn.classList.add("is-active");
      }
      btn.textContent = opt.label;
      btn.addEventListener("click", () => {
        onPick(opt.id);
        closeOpenMenus(root);
      });
      menu.append(btn);
    }
  }

  function syncPickLabels() {
    if (sortLabelEl) {
      sortLabelEl.textContent = sortLabel(sortMode);
    }
    if (tfLabelEl) {
      tfLabelEl.textContent = tfLabel(currentTF);
    }
    fillPickMenu(sortMenu, SORT_OPTIONS, sortMode, (id) => {
      sortMode = normalizeSortMode(id);
      currentPage = 1;
      void renderPage();
    });
    fillPickMenu(tfMenu, TF_OPTIONS, currentTF, (id) => {
      currentTF = normalizeTf(id);
      void renderPage();
    });
  }

  function toggleMenu(btn, menu) {
    const open = menu.classList.contains("hidden");
    closeOpenMenus(root);
    if (open) {
      menu.classList.remove("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  }

  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(sortBtn, sortMenu);
  });
  tfBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu(tfBtn, tfMenu);
  });
  document.addEventListener("click", () => closeOpenMenus(root));

  syncMinVolumeFilterInput(volumeInput, minVolumeFilter);
  let volumeTimer = null;
  volumeInput.addEventListener("input", () => {
    clearTimeout(volumeTimer);
    volumeTimer = setTimeout(() => {
      minVolumeFilter = parseMinVolumeFilter(volumeInput.value);
      currentPage = 1;
      void renderPage();
    }, 300);
  });
  volumeInput.addEventListener("change", () => {
    minVolumeFilter = parseMinVolumeFilter(volumeInput.value);
    syncMinVolumeFilterInput(volumeInput, minVolumeFilter);
    if (minVolumeFilter > 0) {
      volumeInput.value = formatMinVolumeFilter(minVolumeFilter);
    }
    currentPage = 1;
    void renderPage();
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") {
      return;
    }
    e.preventDefault();
    const q = String(searchInput.value || "")
      .replace(/\.P$/i, "")
      .trim()
      .toUpperCase();
    if (!q) {
      return;
    }
    const hit =
      getSortedSymbols().find((s) => s === q || s.startsWith(q)) ||
      allSymbols.find((s) => s === q || s.startsWith(q));
    if (!hit) {
      setStatus(`Монета ${q} не найдена`);
      return;
    }
    if (minVolumeFilter > 0 && !getVisibleSymbols().includes(hit)) {
      setStatus(`${hit} скрыта фильтром объёма`);
      return;
    }
    const page = findPageForSymbol(hit);
    if (!page) {
      return;
    }
    currentPage = page;
    searchInput.value = hit;
    void renderPage();
  });

  syncPickLabels();

  const instant = peekMarketSymbolsCache();
  if (instant?.length) {
    allSymbols = mapSymbolList(instant);
  }

  setStatus("Загрузка…");
  try {
    const tickersPromise = fetchTickersInto(tickerMap);
    const list = await loadMarketSymbols();
    allSymbols = mapSymbolList(list);
    await tickersPromise;
  } catch (err) {
    console.warn("[mobile screener]", err);
    setStatus(err?.message || "Ошибка загрузки рынка");
  }

  await renderPage();

  /* Refresh ticker % occasionally without full remount */
  const tickerTimer = setInterval(() => {
    void fetchTickersInto(tickerMap).then(() => {
      const pageSymbols = symbolsForPage();
      for (let i = 0; i < PAGE_SIZE; i++) {
        updateSlotMeta(i, pageSymbols[i] || "");
      }
    });
  }, 15000);

  return () => {
    clearInterval(tickerTimer);
    for (const m of mounts) {
      try {
        m?.destroy?.();
      } catch {
        /* ignore */
      }
    }
  };
}
