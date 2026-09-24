/**
 * Mobile Terminal — coins, chart, trade, positions, orders, alerts.
 */
import {
  mountMobileReadOnlyChart
} from "./chart-lite.js?v=3";
import {
  getTerminalBlueSymbols,
  loadFavoritesGroups
} from "../favorites.js?v=5";
import {
  initMobileTradeLite,
  listCachedPositions,
  refreshPositions,
  fetchOpenOrders,
  cancelOpenOrder,
  openMarket,
  closeMarket
} from "./trade-lite.js?v=1";
import {
  initMobileAlertsLite,
  listMobileAlerts,
  createMobilePriceAlert,
  removeMobileAlert,
  formatMobileAlertLine
} from "./alerts-lite.js?v=1";

const STORAGE_SYMBOL = "mc-mobile-terminal-symbol-v1";
const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const TABS = [
  { id: "chart", label: "График" },
  { id: "trade", label: "Сделка" },
  { id: "positions", label: "Позиции" },
  { id: "orders", label: "Ордера" },
  { id: "alerts", label: "Алерты" },
  { id: "coins", label: "Монеты" }
];

function normalizeSymbol(raw) {
  return String(raw || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

function coinList() {
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

function loadActiveSymbol() {
  try {
    const saved = normalizeSymbol(localStorage.getItem(STORAGE_SYMBOL));
    if (saved) {
      return saved;
    }
  } catch {
    /* ignore */
  }
  return coinList()[0];
}

function saveActiveSymbol(sym) {
  try {
    localStorage.setItem(STORAGE_SYMBOL, sym);
  } catch {
    /* ignore */
  }
}

function fmtPnl(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

function pnlClass(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return "";
  }
  return n > 0 ? "mobile-pnl-up" : "mobile-pnl-down";
}

/**
 * @param {HTMLElement} root
 */
export async function mountMobileTerminalPage(root) {
  let activeSymbol = loadActiveSymbol();
  let activeTab = "chart";
  /** @type {Awaited<ReturnType<typeof mountMobileReadOnlyChart>>|null} */
  let chartMount = null;
  let tradeReady = false;

  root.innerHTML = `
    <div class="mobile-terminal-tabs" role="tablist"></div>
    <section class="mobile-card mobile-terminal-panel" data-panel="chart">
      <h2 class="mobile-card-title"><span data-active-sym></span> · 1h</h2>
      <div class="mobile-chart-host" id="mobile-terminal-chart"></div>
    </section>
    <section class="mobile-card mobile-terminal-panel" data-panel="trade" hidden>
      <h2 class="mobile-card-title">Сделка · <span data-active-sym></span></h2>
      <div class="mobile-trade-fields">
        <label>Объём USDT
          <input class="mobile-input" id="mobile-trade-usdt" type="number" inputmode="decimal" min="1" step="1" value="50"/>
        </label>
      </div>
      <div class="mobile-row">
        <button type="button" class="mobile-btn is-long" data-act="long">Long</button>
        <button type="button" class="mobile-btn is-short" data-act="short">Short</button>
      </div>
      <div class="mobile-row" style="margin-top:8px">
        <button type="button" class="mobile-btn is-ghost" data-act="close">Закрыть позицию</button>
      </div>
      <p class="mobile-muted" id="mobile-trade-status" style="margin-top:8px"></p>
    </section>
    <section class="mobile-card mobile-terminal-panel" data-panel="positions" hidden>
      <h2 class="mobile-card-title">Позиции</h2>
      <div id="mobile-positions-list" class="mobile-empty">Загрузка…</div>
      <button type="button" class="mobile-btn is-ghost" data-act="refresh-pos" style="margin-top:8px;width:100%">Обновить</button>
    </section>
    <section class="mobile-card mobile-terminal-panel" data-panel="orders" hidden>
      <h2 class="mobile-card-title">Отложенные ордера · <span data-active-sym></span></h2>
      <div id="mobile-orders-list" class="mobile-empty">Загрузка…</div>
      <button type="button" class="mobile-btn is-ghost" data-act="refresh-orders" style="margin-top:8px;width:100%">Обновить</button>
    </section>
    <section class="mobile-card mobile-terminal-panel" data-panel="alerts" hidden>
      <h2 class="mobile-card-title">Алерты</h2>
      <div class="mobile-trade-fields">
        <label>Цена
          <input class="mobile-input" id="mobile-alert-price" type="number" inputmode="decimal" step="any"/>
        </label>
      </div>
      <button type="button" class="mobile-btn" data-act="create-alert" style="width:100%">Создать алерт на <span data-active-sym></span></button>
      <div id="mobile-alerts-list" class="mobile-empty" style="margin-top:10px">—</div>
    </section>
    <section class="mobile-card mobile-terminal-panel" data-panel="coins" hidden>
      <h2 class="mobile-card-title">Монеты</h2>
      <ul class="mobile-coin-list" id="mobile-coin-list"></ul>
    </section>
  `;

  const tabsEl = root.querySelector(".mobile-terminal-tabs");
  for (const tab of TABS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mobile-terminal-tab";
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    if (tab.id === activeTab) {
      btn.classList.add("is-active");
    }
    tabsEl.append(btn);
  }

  function syncSymLabels() {
    root.querySelectorAll("[data-active-sym]").forEach((el) => {
      el.textContent = activeSymbol;
    });
  }

  function setTab(id) {
    activeTab = id;
    tabsEl.querySelectorAll(".mobile-terminal-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.tab === id);
    });
    root.querySelectorAll(".mobile-terminal-panel").forEach((panel) => {
      panel.hidden = panel.getAttribute("data-panel") !== id;
    });
    if (id === "chart") {
      remountChart();
    }
    if (id === "positions") {
      renderPositions();
    }
    if (id === "orders") {
      renderOrders();
    }
    if (id === "alerts") {
      renderAlerts();
    }
    if (id === "coins") {
      renderCoins();
    }
  }

  async function remountChart() {
    const host = root.querySelector("#mobile-terminal-chart");
    if (!host) {
      return;
    }
    try {
      chartMount?.destroy?.();
    } catch {
      /* ignore */
    }
    chartMount = await mountMobileReadOnlyChart(host, activeSymbol, "60");
  }

  function renderCoins() {
    const list = root.querySelector("#mobile-coin-list");
    if (!list) {
      return;
    }
    list.replaceChildren();
    for (const sym of coinList()) {
      const li = document.createElement("li");
      li.className = "mobile-coin-item";
      if (sym === activeSymbol) {
        li.classList.add("is-active");
      }
      li.innerHTML = `<span class="mobile-coin-item-sym">${sym}</span>`;
      li.addEventListener("click", () => {
        activeSymbol = sym;
        saveActiveSymbol(sym);
        syncSymLabels();
        setTab("chart");
      });
      list.append(li);
    }
  }

  function renderPositions() {
    const box = root.querySelector("#mobile-positions-list");
    if (!box) {
      return;
    }
    const rows = listCachedPositions().filter((p) => {
      const size = Math.abs(Number(p?.size ?? p?.qty ?? p?.positionAmt) || 0);
      return size > 0;
    });
    if (!rows.length) {
      box.className = "mobile-empty";
      box.textContent = tradeReady
        ? "Нет открытых позиций"
        : "Торговля не подключена (ключи Bybit в Настройках на сайте)";
      return;
    }
    box.className = "";
    box.replaceChildren();
    for (const p of rows) {
      const sym = normalizeSymbol(p.symbol);
      const side = String(p.side || p.positionSide || "");
      const pnl = p.unrealisedPnl ?? p.unrealizedPnl ?? p.pnl;
      const row = document.createElement("div");
      row.className = "mobile-pos-row";
      row.innerHTML = `
        <div class="mobile-pos-row-top">
          <span>${sym} · ${side}</span>
          <span class="${pnlClass(pnl)}">${fmtPnl(pnl)}</span>
        </div>
        <div class="mobile-muted">size ${p.size ?? p.qty ?? "—"} · entry ${p.avgPrice ?? p.entryPrice ?? "—"}</div>
      `;
      row.addEventListener("click", () => {
        activeSymbol = sym;
        saveActiveSymbol(sym);
        syncSymLabels();
        setTab("trade");
      });
      box.append(row);
    }
  }

  async function renderOrders() {
    const box = root.querySelector("#mobile-orders-list");
    if (!box) {
      return;
    }
    box.className = "mobile-empty";
    box.textContent = "Загрузка…";
    try {
      const orders = await fetchOpenOrders(activeSymbol);
      if (!orders.length) {
        box.textContent = "Нет отложенных ордеров";
        return;
      }
      box.className = "";
      box.replaceChildren();
      for (const o of orders) {
        const row = document.createElement("div");
        row.className = "mobile-order-row";
        const px = o.price ?? o.triggerPrice ?? "—";
        row.innerHTML = `
          <div class="mobile-order-row-top">
            <span>${normalizeSymbol(o.symbol || activeSymbol)} · ${o.side || ""}</span>
            <button type="button" class="mobile-btn is-ghost" data-cancel>Отмена</button>
          </div>
          <div class="mobile-muted">${o.orderType || o.type || "order"} · ${px}</div>
        `;
        row.querySelector("[data-cancel]")?.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            await cancelOpenOrder(o);
            await renderOrders();
          } catch (err) {
            window.alert(err?.message || "Не удалось отменить");
          }
        });
        box.append(row);
      }
    } catch (err) {
      box.textContent = err?.message || "Ошибка загрузки ордеров";
    }
  }

  function renderAlerts() {
    const box = root.querySelector("#mobile-alerts-list");
    if (!box) {
      return;
    }
    const alerts = listMobileAlerts();
    if (!alerts.length) {
      box.className = "mobile-empty";
      box.textContent = "Нет активных алертов";
      return;
    }
    box.className = "";
    box.replaceChildren();
    for (const a of alerts) {
      const line = formatMobileAlertLine(a);
      const row = document.createElement("div");
      row.className = "mobile-alert-row";
      row.innerHTML = `
        <div class="mobile-alert-row-top">
          <span>${line.sym} · ${line.tf}</span>
          <button type="button" class="mobile-btn is-ghost" data-rm>Удалить</button>
        </div>
        <div class="mobile-muted">${line.price}</div>
      `;
      row.querySelector("[data-rm]")?.addEventListener("click", () => {
        removeMobileAlert(a);
        renderAlerts();
      });
      box.append(row);
    }
  }

  tabsEl.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("[data-tab]");
    if (!btn) {
      return;
    }
    setTab(btn.dataset.tab);
  });

  root.addEventListener("click", async (e) => {
    const act = e.target?.closest?.("[data-act]")?.getAttribute("data-act");
    if (!act) {
      return;
    }
    const status = root.querySelector("#mobile-trade-status");
    if (act === "long" || act === "short") {
      const usdt = Number(root.querySelector("#mobile-trade-usdt")?.value);
      if (!Number.isFinite(usdt) || usdt <= 0) {
        window.alert("Укажите объём USDT");
        return;
      }
      try {
        if (status) {
          status.textContent = "Отправка…";
        }
        await openMarket(activeSymbol, act === "long" ? "Buy" : "Sell", usdt);
        if (status) {
          status.textContent = "Ордер отправлен";
        }
        await refreshPositions();
        renderPositions();
      } catch (err) {
        if (status) {
          status.textContent = err?.message || "Ошибка";
        }
        window.alert(err?.message || "Не удалось открыть");
      }
      return;
    }
    if (act === "close") {
      try {
        await closeMarket(activeSymbol);
        if (status) {
          status.textContent = "Закрытие отправлено";
        }
        await refreshPositions();
        renderPositions();
      } catch (err) {
        window.alert(err?.message || "Не удалось закрыть");
      }
      return;
    }
    if (act === "refresh-pos") {
      await refreshPositions();
      renderPositions();
      return;
    }
    if (act === "refresh-orders") {
      await renderOrders();
      return;
    }
    if (act === "create-alert") {
      const price = Number(root.querySelector("#mobile-alert-price")?.value);
      if (!Number.isFinite(price) || price <= 0) {
        window.alert("Укажите цену алерта");
        return;
      }
      const res = await createMobilePriceAlert(activeSymbol, price, "60");
      if (!res.ok) {
        const msg =
          res.reason === "login"
            ? "Нужен вход в облако"
            : res.reason === "telegram"
              ? "Привяжите Telegram в настройках алертов"
              : "Не удалось создать алерт";
        window.alert(msg);
        return;
      }
      renderAlerts();
    }
  });

  syncSymLabels();
  try {
    const boot = await initMobileTradeLite();
    tradeReady = !!boot?.ok;
  } catch (err) {
    console.warn("[mobile terminal] trade", err);
  }
  try {
    await initMobileAlertsLite();
  } catch (err) {
    console.warn("[mobile terminal] alerts", err);
  }

  setTab("chart");
  window.addEventListener("trade-positions-updated", () => {
    if (activeTab === "positions") {
      renderPositions();
    }
  });
}
