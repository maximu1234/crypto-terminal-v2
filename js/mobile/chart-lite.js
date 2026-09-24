/**
 * Tiny read-only kline chart for mobile pages (no drawings / tablet gestures).
 */
import {
  createScreenerChart,
  applyChartPriceFormat,
  applyScreenerZoom,
  SCREENER_MAX_BARS,
  SCREENER_VISIBLE_BARS
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

function waitFrames(n = 2) {
  return new Promise((resolve) => {
    let left = Math.max(1, n);
    const step = () => {
      left -= 1;
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/**
 * iOS Safari: flex + % height often leaves LW chart at ~80px while the card is tall.
 * Pin explicit px size on the host before createChart / resize.
 */
function pinHostSize(hostEl) {
  if (!hostEl) {
    return { w: 120, h: 180 };
  }
  const rect = hostEl.getBoundingClientRect();
  let w = Math.round(rect.width || hostEl.clientWidth || 0);
  let h = Math.round(rect.height || hostEl.clientHeight || 0);
  if (w < 120) {
    w = Math.max(120, Math.round(window.innerWidth - 28));
  }
  if (h < 80) {
    /* Layout not settled — use leftover viewport (single chart / flex child). */
    h = Math.max(120, Math.round(window.innerHeight - 160));
  }
  hostEl.style.width = `${w}px`;
  hostEl.style.height = `${h}px`;
  hostEl.style.minHeight = `${h}px`;
  return { w, h };
}

/** Narrow right scale — labels secondary on phone. */
const MOBILE_PRICE_SCALE_WIDTH = 22;

function formatMobilePriceLabel(price) {
  const n = Number(price);
  if (!Number.isFinite(n)) {
    return "";
  }
  const abs = Math.abs(n);
  if (abs >= 1000) {
    return String(Math.round(n));
  }
  if (abs >= 1) {
    return n.toFixed(2);
  }
  if (abs >= 0.01) {
    return n.toFixed(4);
  }
  return n.toPrecision(3);
}

function applyMobileChartChrome(chart) {
  if (!chart) {
    return;
  }
  try {
    chart.applyOptions({
      layout: {
        fontSize: 8,
        textColor: "#6b7280"
      },
      localization: {
        priceFormatter: formatMobilePriceLabel
      },
      rightPriceScale: {
        borderVisible: false,
        minimumWidth: MOBILE_PRICE_SCALE_WIDTH,
        entireTextOnly: false,
        scaleMargins: {
          top: 0.05,
          bottom: 0.05
        }
      },
      timeScale: {
        borderVisible: false,
        fontSize: 8
      }
    });
  } catch {
    /* ignore */
  }
  try {
    chart.priceScale("right").applyOptions({
      minimumWidth: MOBILE_PRICE_SCALE_WIDTH,
      borderVisible: false
    });
  } catch {
    /* ignore */
  }
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
  hostEl.style.width = "";
  hostEl.style.height = "";
  hostEl.style.minHeight = "";

  const chartEl = document.createElement("div");
  chartEl.className = "mobile-chart-canvas-host";
  chartEl.style.width = "100%";
  chartEl.style.height = "100%";
  hostEl.append(chartEl);

  const sym = String(symbol || "BTCUSDT").replace(/\.P$/i, "").toUpperCase();
  const resolution = String(tf || "60");

  await waitFrames(2);
  if (!hostEl.isConnected) {
    return null;
  }

  let { w, h } = pinHostSize(hostEl);
  chartEl.style.width = `${w}px`;
  chartEl.style.height = `${h}px`;

  const { chart, series } = createScreenerChart(chartEl);
  applyMobileChartChrome(chart);
  try {
    chart.resize(w, h);
    chart.applyOptions({ width: w, height: h });
  } catch {
    /* ignore */
  }

  let destroyed = false;
  /** @type {any[]} */
  let candles = [];
  let unsub = null;

  function fitChart() {
    if (destroyed) {
      return;
    }
    const size = pinHostSize(hostEl);
    w = size.w;
    h = size.h;
    chartEl.style.width = `${w}px`;
    chartEl.style.height = `${h}px`;
    applyMobileChartChrome(chart);
    try {
      chart.resize(w, h);
      chart.applyOptions({ width: w, height: h });
    } catch {
      /* ignore */
    }
    if (!candles.length) {
      return;
    }
    try {
      applyScreenerZoom(chart, series, candles, w, h, {
        visibleBars: SCREENER_VISIBLE_BARS,
        shouldContinue: () => !destroyed
      });
      chart.resize(w, h);
    } catch {
      /* ignore */
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
    await waitFrames(2);
    fitChart();
    /* Late layout pass — iOS often settles height after fonts/safe-area. */
    setTimeout(() => {
      if (!destroyed) {
        fitChart();
      }
    }, 120);
    setTimeout(() => {
      if (!destroyed) {
        fitChart();
      }
    }, 400);
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
          }, 40);
        })
      : null;
  ro?.observe(hostEl);
  if (hostEl.parentElement) {
    ro?.observe(hostEl.parentElement);
  }

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
      hostEl.style.width = "";
      hostEl.style.height = "";
      hostEl.style.minHeight = "";
    }
  };
}
