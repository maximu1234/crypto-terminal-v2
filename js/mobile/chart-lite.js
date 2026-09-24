/**
 * Tiny read-only kline chart for mobile pages (no drawings / tablet gestures).
 */
import {
  createScreenerChart,
  applyChartPriceFormat,
  applyScreenerZoom,
  SCREENER_MAX_BARS
} from "../chart-import.js?v=62";
import {
  loadMarketHistory
} from "../market-api.js?v=6";
import {
  subscribeKline
} from "../market-ws.js?v=2";
import {
  ensureOhlcRollover,
  ingestLiveOhlcKline,
  liveBarPeriodSec,
  paintLiveOhlcSeries
} from "../chart/live-bar-roll.js?v=4";

function mobileVisibleBars(tf) {
  const map = {
    "1": 120,
    "5": 100,
    "15": 96,
    "60": 72,
    "240": 60,
    D: 60,
    W: 52
  };
  return map[String(tf || "15")] || 96;
}

function waitTwoFrames() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

function measureHost(hostEl, chartEl) {
  const w = Math.max(
    hostEl?.clientWidth || 0,
    chartEl?.clientWidth || 0,
    120
  );
  const h = Math.max(
    hostEl?.clientHeight || 0,
    chartEl?.clientHeight || 0,
    140
  );
  return { w, h };
}

/**
 * @param {HTMLElement} hostEl
 * @param {string} symbol
 * @param {string} [tf]
 */
export async function mountMobileReadOnlyChart(hostEl, symbol, tf = "60") {
  if (!hostEl) {
    return null;
  }
  hostEl.replaceChildren();

  const chartEl = document.createElement("div");
  chartEl.className = "mobile-chart-canvas-host";
  hostEl.append(chartEl);

  const sym = String(symbol || "BTCUSDT").replace(/\.P$/i, "").toUpperCase();
  const resolution = String(tf || "60");

  /* Flex slots often report 0×0 until laid out — wait before createChart. */
  await waitTwoFrames();
  if (!hostEl.isConnected) {
    return null;
  }

  const { chart, series } = createScreenerChart(chartEl);
  let destroyed = false;
  /** @type {any[]} */
  let candles = [];
  let unsub = null;

  function fitChart() {
    if (destroyed || !candles.length) {
      return;
    }
    const { w, h } = measureHost(hostEl, chartEl);
    try {
      applyScreenerZoom(chart, series, candles, w, h, {
        visibleBars: mobileVisibleBars(resolution),
        shouldContinue: () => !destroyed
      });
    } catch {
      try {
        chart.resize(w, h);
      } catch {
        /* ignore */
      }
    }
  }

  const history = await loadMarketHistory(sym, resolution, 2, { parallel: true });
  if (destroyed) {
    try {
      chart.remove();
    } catch {
      /* ignore */
    }
    return null;
  }
  candles = Array.isArray(history) ? history.slice(-SCREENER_MAX_BARS) : [];
  if (candles.length) {
    applyChartPriceFormat(series, candles);
    series.setData(candles);
    await waitTwoFrames();
    fitChart();
  }

  const periodSec = liveBarPeriodSec(resolution);
  unsub = subscribeKline(sym, resolution, (candle) => {
    if (destroyed || !candle) {
      return;
    }
    try {
      const { rolled, kind, shifted } = ingestLiveOhlcKline(
        candles,
        candle,
        periodSec,
        SCREENER_MAX_BARS
      );
      if (!kind && !rolled) {
        return;
      }
      paintLiveOhlcSeries(series, candles, { kind, shifted });
    } catch {
      /* disposed */
    }
  });

  const rollTimer = setInterval(() => {
    if (destroyed || !candles.length) {
      return;
    }
    if (!ensureOhlcRollover(candles, periodSec)) {
      return;
    }
    try {
      paintLiveOhlcSeries(series, candles, { kind: "new", shifted: false });
    } catch {
      /* ignore */
    }
  }, 1000);

  let resizeTimer = null;
  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            fitChart();
          }, 50);
        })
      : null;
  ro?.observe(hostEl);

  return {
    symbol: sym,
    tf: resolution,
    chart,
    series,
    destroy() {
      destroyed = true;
      clearInterval(rollTimer);
      clearTimeout(resizeTimer);
      try {
        unsub?.();
      } catch {
        /* ignore */
      }
      try {
        ro?.disconnect();
      } catch {
        /* ignore */
      }
      try {
        chart.remove();
      } catch {
        /* ignore */
      }
      hostEl.replaceChildren();
    }
  };
}
