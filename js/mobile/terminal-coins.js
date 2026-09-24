/**
 * Mobile Terminal — coins tab: full market list like desktop panel
 * (market filter, search, volume ≥, ★/Symbol/24h/Vol sort, flag cycle).
 */
import {
  loadMarketSymbols,
  peekMarketSymbolsCache,
  buildMarketLists
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
  getActiveExchangeDefinition
} from "../exchanges/registry.js?v=1";
import {
  loadFavoritesGroups,
  saveFavoritesGroups,
  getFavoriteGroup,
  setFavoriteGroup,
  cycleFavoriteGroup,
  canSetBlueFlag,
  flagSortRank,
  FLAG_TITLES
} from "../favorites.js?v=5";

const STORAGE_KEY = "mc-mobile-terminal-coins-v1";

const FALLBACK_MARKETS = [
  { id: "all", label: "Все" },
  { id: "crypto", label: "Крипто" },
  { id: "new", label: "Новые" },
  { id: "innovation", label: "Innovation" },
  { id: "stocks", label: "Акции" },
  { id: "commodities", label: "Сырьё" },
  { id: "forex", label: "Forex" }
];

function marketOptions() {
  try {
    const markets = getActiveExchangeDefinition()?.markets;
    if (Array.isArray(markets) && markets.length) {
      return markets.map((m) => ({
        id: String(m.id),
        label: String(m.label || m.id)
      }));
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_MARKETS.slice();
}

function mapSymbolList(list) {
  return (list || [])
    .map((x) => (typeof x === "string" ? x : x?.symbol))
    .filter(Boolean)
    .map((s) => String(s).replace(/\.P$/i, "").trim().toUpperCase());
}

function formatVolume24(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return "—";
  }
  if (n >= 1e9) {
    return `${Number((n / 1e9).toFixed(2))}B`;
  }
  if (n >= 1e6) {
    return `${Number((n / 1e6).toFixed(2))}M`;
  }
  if (n >= 1e3) {
    return `${Number((n / 1e3).toFixed(2))}K`;
  }
  return String(Math.round(n));
}

function formatChange24(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function loadPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement} host
 * @param {{
 *   getActiveSymbol: () => string,
 *   onPickSymbol: (symbol: string) => void
 * }} hooks
 */
export async function mountMobileTerminalCoins(host, hooks) {
  if (!host) {
    return () => {};
  }

  const prefs = loadPrefs();
  const markets = marketOptions();
  let marketId = markets.some((m) => m.id === prefs.market)
    ? prefs.market
    : markets[0]?.id || "all";
  let searchQuery = String(prefs.search || "");
  let minVolume = normalizeMinVolume(prefs.minVolume);
  /** @type {"favorites"|"symbol"|"24h"|"volume24"} */
  let sortMode =
    prefs.sortMode === "favorites" ||
    prefs.sortMode === "symbol" ||
    prefs.sortMode === "24h" ||
    prefs.sortMode === "volume24"
      ? prefs.sortMode
      : "symbol";
  let sortAsc = prefs.sortAsc !== false;
  /** @type {Record<string, string[]>} */
  let listsByMarket = {
    all: [],
    crypto: [],
    new: [],
    innovation: [],
    stocks: [],
    commodities: [],
    forex: []
  };
  /** @type {Map<string, { change24?: number, volume24?: number }>} */
  const tickerMap = new Map();
  let favGroups = loadFavoritesGroups();
  let destroyed = false;

  host.innerHTML = `
    <div class="mobile-coins-toolbar">
      <input type="search" class="mobile-input mobile-coins-search" id="mobile-coins-search"
        placeholder="Поиск монеты…" autocomplete="off" spellcheck="false"
        aria-label="Поиск монеты" enterkeyhint="search"/>
      <div class="mobile-coins-filters">
        <div class="mobile-coins-pick-wrap">
          <button type="button" class="mobile-coins-pick" id="mobile-coins-market-btn"
            aria-haspopup="listbox" aria-expanded="false">
            <span id="mobile-coins-market-label"></span>
            <span class="mobile-coins-pick-caret" aria-hidden="true">▾</span>
          </button>
          <div class="mobile-coins-pick-menu hidden" id="mobile-coins-market-menu" role="listbox"></div>
        </div>
        <input type="text" class="mobile-input mobile-coins-volume" id="mobile-coins-volume"
          placeholder="Объём ≥" inputmode="decimal" autocomplete="off" spellcheck="false"
          aria-label="Минимальный объём 24ч"/>
      </div>
    </div>
    <div class="mobile-coins-header" id="mobile-coins-header" role="row">
      <button type="button" class="mobile-coins-th mobile-coins-th-flag" data-sort="favorites" title="Избранное">★</button>
      <button type="button" class="mobile-coins-th mobile-coins-th-sym" data-sort="symbol">Symbol</button>
      <button type="button" class="mobile-coins-th mobile-coins-th-chg" data-sort="24h">24h</button>
      <button type="button" class="mobile-coins-th mobile-coins-th-vol" data-sort="volume24" title="Объём 24ч">Vol</button>
    </div>
    <p class="mobile-muted mobile-coins-status" id="mobile-coins-status">Загрузка…</p>
    <div class="mobile-coins-body" id="mobile-coins-body" role="list"></div>
  `;

  const searchInput = host.querySelector("#mobile-coins-search");
  const volumeInput = host.querySelector("#mobile-coins-volume");
  const marketBtn = host.querySelector("#mobile-coins-market-btn");
  const marketMenu = host.querySelector("#mobile-coins-market-menu");
  const marketLabel = host.querySelector("#mobile-coins-market-label");
  const headerEl = host.querySelector("#mobile-coins-header");
  const statusEl = host.querySelector("#mobile-coins-status");
  const bodyEl = host.querySelector("#mobile-coins-body");

  function persist() {
    savePrefs({
      market: marketId,
      search: searchQuery,
      minVolume,
      sortMode,
      sortAsc
    });
  }

  function closeMenus() {
    marketMenu?.classList.add("hidden");
    marketBtn?.setAttribute("aria-expanded", "false");
  }

  function setStatus(text) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text || "";
    statusEl.hidden = !text;
  }

  function marketLabelFor(id) {
    return markets.find((m) => m.id === id)?.label || id;
  }

  function syncMarketUi() {
    if (marketLabel) {
      marketLabel.textContent = marketLabelFor(marketId);
    }
    if (!marketMenu) {
      return;
    }
    marketMenu.replaceChildren();
    for (const m of markets) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mobile-coins-pick-item";
      btn.setAttribute("role", "option");
      if (m.id === marketId) {
        btn.classList.add("is-active");
      }
      btn.textContent = m.label;
      btn.addEventListener("click", () => {
        marketId = m.id;
        searchQuery = "";
        if (searchInput) {
          searchInput.value = "";
        }
        persist();
        closeMenus();
        syncMarketUi();
        renderList();
      });
      marketMenu.append(btn);
    }
  }

  function syncHeaderSortUi() {
    headerEl?.querySelectorAll(".mobile-coins-th").forEach((btn) => {
      const mode = btn.getAttribute("data-sort");
      const active = mode === sortMode;
      btn.classList.toggle("is-active", active);
      btn.classList.toggle("is-asc", active && sortAsc);
      btn.classList.toggle("is-desc", active && !sortAsc);
    });
  }

  function baseSymbols() {
    const list = listsByMarket[marketId] || listsByMarket.all || [];
    return list.slice();
  }

  function getVisibleSymbols() {
    let list = filterSymbolsByMinVolume(
      baseSymbols(),
      minVolume,
      (sym) => tickerMap.get(sym)?.volume24
    );
    const q = searchQuery.trim().toUpperCase();
    if (q) {
      list = list.filter((s) => s.includes(q));
    }
    return list;
  }

  function sortSymbols(list) {
    const out = list.slice();
    const dir = sortAsc ? 1 : -1;
    if (sortMode === "favorites") {
      out.sort((a, b) => {
        const ra = flagSortRank(getFavoriteGroup(a, favGroups), sortAsc);
        const rb = flagSortRank(getFavoriteGroup(b, favGroups), sortAsc);
        if (ra !== rb) {
          return ra - rb;
        }
        return a.localeCompare(b);
      });
      return out;
    }
    if (sortMode === "symbol") {
      out.sort((a, b) => dir * a.localeCompare(b));
      return out;
    }
    const field = sortMode === "volume24" ? "volume24" : "change24";
    out.sort((a, b) => {
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
      if (ca !== cb) {
        return dir * (ca - cb);
      }
      return a.localeCompare(b);
    });
    return out;
  }

  function renderList() {
    if (!bodyEl || destroyed) {
      return;
    }
    const active = hooks.getActiveSymbol?.() || "";
    const visible = sortSymbols(getVisibleSymbols());
    setStatus(
      visible.length
        ? `${visible.length} тикеров`
        : minVolume > 0 || searchQuery
          ? "Нет тикеров по фильтру"
          : "Нет тикеров"
    );
    syncHeaderSortUi();
    bodyEl.replaceChildren();
    const frag = document.createDocumentFragment();
    for (const sym of visible) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "mobile-coins-row";
      if (sym === active) {
        row.classList.add("is-active");
      }
      const group = getFavoriteGroup(sym, favGroups);
      const chg = tickerMap.get(sym)?.change24;
      const vol = tickerMap.get(sym)?.volume24;
      const chgClass =
        Number.isFinite(chg) && chg > 0
          ? "mobile-pnl-up"
          : Number.isFinite(chg) && chg < 0
            ? "mobile-pnl-down"
            : "";
      row.innerHTML = `
        <span class="mobile-coins-flag-wrap">
          <span class="mobile-coins-flag${group ? ` is-${group}` : ""}" data-flag title="${
            group ? FLAG_TITLES[group] || group : "Флаг"
          }"></span>
        </span>
        <span class="mobile-coins-sym">${sym}</span>
        <span class="mobile-coins-chg ${chgClass}">${formatChange24(chg)}</span>
        <span class="mobile-coins-vol">${formatVolume24(vol)}</span>
      `;
      row.querySelector("[data-flag]")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cur = getFavoriteGroup(sym, favGroups);
        let next = cycleFavoriteGroup(cur);
        if (next === "blue" && !canSetBlueFlag(sym, favGroups)) {
          next = cycleFavoriteGroup("blue");
        }
        favGroups = setFavoriteGroup(sym, next, favGroups);
        saveFavoritesGroups(favGroups);
        favGroups = loadFavoritesGroups();
        renderList();
      });
      row.addEventListener("click", () => {
        hooks.onPickSymbol?.(sym);
      });
      frag.append(row);
    }
    bodyEl.append(frag);
  }

  function applyInstrumentLists(instruments) {
    const built = buildMarketLists(instruments) || {};
    listsByMarket = {
      all: mapSymbolList(built.all),
      crypto: mapSymbolList(built.crypto),
      new: mapSymbolList(built.new),
      innovation: mapSymbolList(built.innovation),
      stocks: mapSymbolList(built.stocks),
      commodities: mapSymbolList(built.commodities),
      forex: mapSymbolList(built.forex)
    };
    if (!listsByMarket.all.length) {
      const flat = mapSymbolList(instruments);
      listsByMarket.all = flat;
      listsByMarket.crypto = flat;
    }
  }

  searchInput.value = searchQuery;
  syncMinVolumeFilterInput(volumeInput, minVolume);
  syncMarketUi();
  syncHeaderSortUi();

  marketBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = marketMenu?.classList.contains("hidden");
    closeMenus();
    if (open) {
      marketMenu?.classList.remove("hidden");
      marketBtn.setAttribute("aria-expanded", "true");
    }
  });
  document.addEventListener("click", closeMenus);

  headerEl?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-sort]");
    if (!btn) {
      return;
    }
    const mode = btn.getAttribute("data-sort");
    if (
      mode !== "favorites" &&
      mode !== "symbol" &&
      mode !== "24h" &&
      mode !== "volume24"
    ) {
      return;
    }
    if (sortMode === mode) {
      sortAsc = !sortAsc;
    } else {
      sortMode = mode;
      sortAsc = mode === "symbol" || mode === "favorites";
    }
    persist();
    renderList();
  });

  let searchTimer = null;
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = String(searchInput.value || "");
      persist();
      renderList();
    }, 120);
  });

  let volumeTimer = null;
  volumeInput?.addEventListener("input", () => {
    clearTimeout(volumeTimer);
    volumeTimer = setTimeout(() => {
      minVolume = parseMinVolumeFilter(volumeInput.value);
      persist();
      renderList();
    }, 250);
  });
  volumeInput?.addEventListener("change", () => {
    minVolume = parseMinVolumeFilter(volumeInput.value);
    syncMinVolumeFilterInput(volumeInput, minVolume);
    if (minVolume > 0) {
      volumeInput.value = formatMinVolumeFilter(minVolume);
    }
    persist();
    renderList();
  });

  const cached = peekMarketSymbolsCache();
  if (cached?.length) {
    applyInstrumentLists(cached);
    renderList();
  }

  try {
    const tickersPromise = fetchTickersInto(tickerMap);
    const instruments = await loadMarketSymbols();
    if (destroyed) {
      return () => {};
    }
    applyInstrumentLists(instruments);
    await tickersPromise;
    renderList();
  } catch (err) {
    console.warn("[mobile terminal coins]", err);
    setStatus(err?.message || "Ошибка загрузки рынка");
  }

  const tickerTimer = setInterval(() => {
    if (destroyed) {
      return;
    }
    void fetchTickersInto(tickerMap).then(() => {
      if (!destroyed) {
        renderList();
      }
    });
  }, 15000);

  return () => {
    destroyed = true;
    clearInterval(tickerTimer);
    clearTimeout(searchTimer);
    clearTimeout(volumeTimer);
    document.removeEventListener("click", closeMenus);
    host.replaceChildren();
  };
}

/** Re-render highlight after external symbol change without remount. */
export function refreshMobileTerminalCoinsActive(host, activeSymbol) {
  if (!host) {
    return;
  }
  host.querySelectorAll(".mobile-coins-row").forEach((row) => {
    const sym = row.querySelector(".mobile-coins-sym")?.textContent || "";
    row.classList.toggle("is-active", sym === activeSymbol);
  });
}
