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
  chartEl.style.width = "100%";
  chartEl.style.height = "100%";
  hostEl.append(chartEl);

  const sym = String(symbol || "BTCUSDT").replace(/\.P$/i, "").toUpperCase();
  const resolution = String(tf || "60");
  const { chart, series } = createScreenerChart(chartEl);
  let destroyed = false;
  /** @type {any[]} */
  let candles = [];
  let unsub = null;

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
    applyScreenerZoom(chart, candles);
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

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          try {
            chart.resize(chartEl.clientWidth, chartEl.clientHeight);
          } catch {
            /* ignore */
          }
        })
      : null;
  ro?.observe(chartEl);

  return {
    symbol: sym,
    tf: resolution,
    chart,
    series,
    destroy() {
      destroyed = true;
      clearInterval(rollTimer);
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
