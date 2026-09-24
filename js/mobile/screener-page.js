/**
 * Mobile Screener — exactly two read-only chart slots.
 */
import {
  mountMobileReadOnlyChart
} from "./chart-lite.js?v=1";
import {
  loadFavoritesGroups,
  getTerminalBlueSymbols
} from "../favorites.js?v=5";

const STORAGE_KEY = "mc-mobile-screener-symbols-v1";
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT"];
const TF = "60";

function normalizeSymbol(raw) {
  return String(raw || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function loadStoredSymbols() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [
        normalizeSymbol(parsed[0]) || DEFAULT_SYMBOLS[0],
        normalizeSymbol(parsed[1]) || DEFAULT_SYMBOLS[1]
      ];
    }
  } catch {
    /* ignore */
  }
  try {
    const blue = getTerminalBlueSymbols(loadFavoritesGroups()) || [];
    return [
      normalizeSymbol(blue[0]) || DEFAULT_SYMBOLS[0],
      normalizeSymbol(blue[1]) || DEFAULT_SYMBOLS[1]
    ];
  } catch {
    /* ignore */
  }
  return [...DEFAULT_SYMBOLS];
}

function saveSymbols(symbols) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    /* ignore */
  }
}

function favoriteOptions() {
  const out = [...DEFAULT_SYMBOLS];
  try {
    const blue = getTerminalBlueSymbols(loadFavoritesGroups()) || [];
    for (const entry of blue) {
      const sym = normalizeSymbol(entry);
      if (sym && !out.includes(sym)) {
        out.push(sym);
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

/**
 * @param {HTMLElement} root
 */
export async function mountMobileScreenerPage(root) {
  const grid = root.querySelector("#mobile-screener-grid") || root;
  grid.replaceChildren();
  const symbols = loadStoredSymbols();
  const options = favoriteOptions();
  /** @type {Array<Awaited<ReturnType<typeof mountMobileReadOnlyChart>>>} */
  const mounts = [null, null];

  async function remount(slotIndex, symbol) {
    const slot = grid.children[slotIndex];
    const chartHost = slot?.querySelector(".mobile-screener-slot-chart");
    if (!chartHost) {
      return;
    }
    try {
      mounts[slotIndex]?.destroy?.();
    } catch {
      /* ignore */
    }
    mounts[slotIndex] = await mountMobileReadOnlyChart(chartHost, symbol, TF);
  }

  for (let i = 0; i < 2; i++) {
    const slot = document.createElement("article");
    slot.className = "mobile-screener-slot";
    const head = document.createElement("div");
    head.className = "mobile-screener-slot-head";
    const select = document.createElement("select");
    select.className = "mobile-select";
    select.setAttribute("aria-label", `Символ ${i + 1}`);
    const sym = symbols[i];
    const opts = options.includes(sym) ? options : [sym, ...options];
    for (const o of opts) {
      const opt = document.createElement("option");
      opt.value = o;
      opt.textContent = o;
      if (o === sym) {
        opt.selected = true;
      }
      select.append(opt);
    }
    select.addEventListener("change", () => {
      symbols[i] = normalizeSymbol(select.value);
      saveSymbols(symbols);
      remount(i, symbols[i]);
    });
    head.append(select);
    const chartHost = document.createElement("div");
    chartHost.className = "mobile-screener-slot-chart";
    slot.append(head, chartHost);
    grid.append(slot);
  }

  await Promise.all([
    remount(0, symbols[0]),
    remount(1, symbols[1])
  ]);
}
