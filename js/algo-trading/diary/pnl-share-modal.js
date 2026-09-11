/**
 * Algo diary — modal «Поделиться PnL».
 * Isolated copy: uses cryptoTerminalDesktop.algoTrading only.
 */
const SHARE_ICON_V = 2;

export const PNL_SHARE_CONTROL_HTML = `<span class="trade-book-share" data-action="share-pnl" role="button" tabindex="-1" aria-label="Поделиться PnL" title="Поделиться PnL">
<img class="trade-book-share-icon trade-book-share-icon--off" src="/assets/share_off.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
<img class="trade-book-share-icon trade-book-share-icon--on" src="/assets/share_on.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
</span>`;

function tradingApi() {
  return window.cryptoTerminalDesktop?.algoTrading || null;
}

function inferPriceDecimals(price) {
  const num = Number(price);
  if (!Number.isFinite(num)) {
    return 2;
  }
  if (num >= 100) {
    return 2;
  }
  if (num >= 1) {
    return 4;
  }
  return 5;
}

function normalizeSide(side) {
  const raw = String(side || "").toLowerCase();
  if (raw === "sell" || raw === "short") {
    return "short";
  }
  return "long";
}

function inferLeverageFromTrade(trade) {
  const fromApi = Number(trade?.leverage);
  if (Number.isFinite(fromApi) && fromApi >= 1) {
    return Math.min(Math.round(fromApi), 200);
  }

  const entry = Number(trade?.avgEntryPrice);
  const exit = Number(trade?.avgExitPrice);
  const pnlPct = Number(trade?.pnlPct);
  if (!Number.isFinite(entry) || !Number.isFinite(exit) || entry === 0) {
    return 1;
  }

  const isLong = normalizeSide(trade?.side) === "long";
  const priceChange = isLong
    ? (exit - entry) / entry
    : (entry - exit) / entry;
  if (Math.abs(priceChange) < 1e-9) {
    return 1;
  }

  const leverage = Math.round(pnlPct / (priceChange * 100));
  if (!Number.isFinite(leverage) || leverage < 1) {
    return 1;
  }
  return Math.min(leverage, 200);
}

export function buildDiaryPayload(trade) {
  const entry = Number(trade?.avgEntryPrice);
  const exit = Number(trade?.avgExitPrice);
  return {
    variant: "diary",
    exchange: "bybit",
    ticker: String(trade?.symbol || "").toUpperCase(),
    side: normalizeSide(trade?.side),
    leverage: inferLeverageFromTrade(trade),
    roiPct: Number(trade?.pnlPct) || 0,
    entryPrice: entry,
    marketPrice: exit,
    priceDecimals: inferPriceDecimals(entry)
  };
}

function sideLabelRu(side) {
  return normalizeSide(side) === "short" ? "Шорт" : "Лонг";
}

function formatShareFileStamp(date = new Date()) {
  const day = date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
  const time = date
    .toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    })
    .replace(/:/g, "-");
  return `${day} ${time}`;
}

function defaultFileName(row) {
  const ticker = String(row?.ticker || row?.symbol || "POSITION").toUpperCase();
  const side = sideLabelRu(row?.side);
  return `Share ${ticker} ${side} ${formatShareFileStamp()}.png`;
}

function waitForImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      reject(new Error("Не удалось загрузить превью бейджа"));
    };
    img.src = dataUrl;
  });
}

function mountOverlay(el) {
  if (!el.isConnected) {
    document.body.appendChild(el);
  }
  el.hidden = false;
}

function hideOverlay(el) {
  if (!el) {
    return;
  }
  el.hidden = true;
}

let overlayEl = null;
let tempPath = null;
let busy = false;

async function cleanupTemp() {
  const pathToDrop = tempPath;
  tempPath = null;
  if (!pathToDrop) {
    return;
  }
  const api = tradingApi();
  if (!api?.discardPnlShareCard) {
    return;
  }
  try {
    await api.discardPnlShareCard(pathToDrop);
  } catch {
    /* ignore */
  }
}

async function closeModal() {
  hideOverlay(overlayEl);
  await cleanupTemp();
  busy = false;
}

function onPageHide() {
  void cleanupTemp();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", onPageHide);
}

function ensureOverlay() {
  if (overlayEl) {
    return overlayEl;
  }

  const el = document.createElement("div");
  el.className = "trade-pnl-share-overlay";
  el.innerHTML = `
<div class="trade-pnl-share-dialog trade-pnl-share-dialog--bybit" role="dialog" aria-modal="true" aria-label="Поделиться PnL">
<button type="button" class="trade-pnl-share-close" data-action="close" aria-label="Закрыть">×</button>
<div class="trade-pnl-share-preview-wrap">
<img class="trade-pnl-share-preview" data-role="preview" alt="Бейдж Поделиться PnL">
</div>
<p class="trade-pnl-share-status" data-role="status" hidden></p>
<div class="trade-pnl-share-actions">
<button type="button" class="trade-pnl-share-save" data-action="save">Сохранить</button>
</div>
</div>
`;

  el.addEventListener("click", (event) => {
    if (event.target === el) {
      void closeModal();
    }
  });

  el.querySelector('[data-action="close"]')?.addEventListener("click", () => {
    void closeModal();
  });

  el.querySelector('[data-action="save"]')?.addEventListener("click", async () => {
    const api = tradingApi();
    const overlay = overlayEl;
    const statusEl = overlay?.querySelector('[data-role="status"]');
    const saveBtn = overlay?.querySelector('[data-action="save"]');
    if (!api?.savePnlShareCard || !tempPath) {
      return;
    }
    if (saveBtn) {
      saveBtn.disabled = true;
    }
    try {
      const result = await api.savePnlShareCard({
        tempPath,
        defaultName: overlay?.dataset.defaultName || "pnl-share.png"
      });
      if (!result?.ok) {
        throw new Error(result?.error || "Не удалось сохранить бейдж");
      }
      if (result.canceled) {
        if (saveBtn) {
          saveBtn.disabled = false;
        }
        return;
      }
      await closeModal();
    } catch (err) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = String(err?.message || err);
      }
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlayEl && !overlayEl.hidden) {
      event.preventDefault();
      event.stopPropagation();
      void closeModal();
    }
  });

  document.body.appendChild(el);
  el.hidden = true;
  overlayEl = el;
  return el;
}

export async function openPnlShareDiaryModal(trade) {
  const api = tradingApi();
  if (!api?.generatePnlShareCard) {
    window.alert("Бейдж Поделиться PnL доступен только в desktop .app");
    return;
  }
  if (busy) {
    return;
  }

  busy = true;
  const payload = buildDiaryPayload(trade);

  try {
    await cleanupTemp();
    const result = await api.generatePnlShareCard(payload);
    if (!result?.ok || !result?.dataUrl) {
      throw new Error(result?.error || "Не удалось сгенерировать бейдж");
    }

    tempPath = result.tempPath || null;
    await waitForImage(result.dataUrl);

    const overlay = ensureOverlay();
    const preview = overlay.querySelector('[data-role="preview"]');
    const statusEl = overlay.querySelector('[data-role="status"]');
    const saveBtn = overlay.querySelector('[data-action="save"]');
    overlay.dataset.defaultName = defaultFileName({
      ticker: trade?.symbol,
      side: trade?.side
    });

    if (preview) {
      preview.src = result.dataUrl;
    }
    overlay.querySelector(".trade-pnl-share-dialog")?.classList.add(
      "trade-pnl-share-dialog--diary"
    );
    if (statusEl) {
      statusEl.hidden = true;
      statusEl.textContent = "";
    }
    if (saveBtn) {
      saveBtn.disabled = false;
    }
    mountOverlay(overlay);
  } catch (err) {
    const overlay = overlayEl || ensureOverlay();
    const statusEl = overlay.querySelector('[data-role="status"]');
    const preview = overlay.querySelector('[data-role="preview"]');
    const saveBtn = overlay.querySelector('[data-action="save"]');
    if (preview) {
      preview.removeAttribute("src");
    }
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent = String(err?.message || err);
    }
    if (saveBtn) {
      saveBtn.disabled = true;
    }
    mountOverlay(overlay);
    await cleanupTemp();
  } finally {
    busy = false;
  }
}
