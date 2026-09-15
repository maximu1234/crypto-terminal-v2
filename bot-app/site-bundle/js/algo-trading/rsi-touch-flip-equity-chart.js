/**
 * График «Доходность» в панели Данные (RSI Touch Flip).
 * Стиль кривой как PnL в Дневнике: зелёный выше 0, красный ниже.
 * Lazy: модуль импортируют только при открытии вкладки.
 */
import {
  loadLightweightCharts
} from "../charts-lib-boot.js?v=3";
import {
  withChartLocalTime
} from "../chart/chart-local-time.js?v=1";
import {
  RSI_TOUCH_FLIP_EQUITY_NEG_COLOR,
  RSI_TOUCH_FLIP_EQUITY_POS_COLOR
} from "./rsi-touch-flip-equity.js?v=5";

const BG =
"#0f1419";
const GRID =
"#2a3548";
const TEXT =
"#9ca3af";
const AXIS =
"#2e2e30";
const ZERO =
"#374151";
const POS_FILL =
"rgba(34, 197, 94, 0.18)";
const NEG_FILL =
"rgba(239, 68, 68, 0.18)";

function emptyModel() {
  return {
    line: [],
    train: [],
    test: [],
    histogram: [],
    splitTime: null,
    fromTime: null,
    toTime: null,
    lastValue: null,
    lastTime: null,
    hasSplit: false
  };
}

function sizeOf(el) {
  const w = Math.max(0, Math.floor(el?.clientWidth || 0));
  const h = Math.max(0, Math.floor(el?.clientHeight || 0));
  return { w, h };
}

/**
 * @param {HTMLElement|null} host
 */
export function mountRsiTouchFlipEquityChart(host) {
  let chart = null;
  let pnlSeries = null;
  let histSeries = null;
  let ro = null;
  let model = emptyModel();
  let vline = null;
  let trainLabel = null;
  let testLabel = null;
  let lastW = 0;
  let lastH = 0;

  function ensureOverlay() {
    if (!host || vline) {
      return;
    }
    vline = document.createElement("div");
    vline.className = "algo-rsi-flip-equity-vline";
    vline.hidden = true;
    trainLabel = document.createElement("span");
    trainLabel.className = "algo-rsi-flip-equity-split-label is-train";
    trainLabel.textContent = "Train";
    testLabel = document.createElement("span");
    testLabel.className = "algo-rsi-flip-equity-split-label is-test";
    testLabel.textContent = "Test";
    vline.append(trainLabel, testLabel);
    host.appendChild(vline);
  }

  function fitVisibleRange() {
    if (!chart) {
      return;
    }
    const from = model.fromTime;
    const to = model.toTime;
    if (
      Number.isFinite(from) &&
      Number.isFinite(to) &&
      to > from
    ) {
      try {
        chart.timeScale().setVisibleRange({
          from,
          to
        });
        return;
      } catch {
        /* fall through to fitContent */
      }
    }
    try {
      chart.timeScale().fitContent();
    } catch {
      /* ignore */
    }
  }

  function syncSplitOverlay() {
    if (!host || !chart || !vline) {
      return;
    }
    if (!model.hasSplit || model.splitTime == null) {
      vline.hidden = true;
      return;
    }
    const x = chart.timeScale().timeToCoordinate(model.splitTime);
    if (x == null || !Number.isFinite(x)) {
      vline.hidden = true;
      return;
    }
    vline.hidden = false;
    vline.style.left = `${Math.round(x)}px`;
  }

  function applyModel() {
    if (!pnlSeries || !histSeries) {
      return;
    }
    pnlSeries.setData(Array.isArray(model.line) ? model.line : []);
    histSeries.setData(model.histogram);
    fitVisibleRange();
    syncSplitOverlay();
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        resize();
        fitVisibleRange();
        syncSplitOverlay();
        requestAnimationFrame(() => {
          fitVisibleRange();
          syncSplitOverlay();
        });
      });
    }
  }

  function resize() {
    if (!chart || !host) {
      return;
    }
    const { w, h } = sizeOf(host);
    if (w < 8 || h < 8) {
      return;
    }
    if (lastW !== w || lastH !== h) {
      lastW = w;
      lastH = h;
      chart.applyOptions({
        width: w,
        height: h
      });
    }
    fitVisibleRange();
    syncSplitOverlay();
  }

  async function ensureChart() {
    if (chart || !host) {
      return;
    }
    await loadLightweightCharts();
    const LC = globalThis.LightweightCharts;
    if (!LC?.createChart) {
      return;
    }
    const { w, h } = sizeOf(host);
    chart = LC.createChart(
      host,
      withChartLocalTime({
        width: Math.max(w, 16),
        height: Math.max(h, 16),
        layout: {
          background: {
            color: BG
          },
          textColor: TEXT,
          fontSize: 11
        },
        grid: {
          vertLines: {
            color: GRID,
            style: 2
          },
          horzLines: {
            visible: false
          }
        },
        rightPriceScale: {
          borderColor: AXIS,
          scaleMargins: {
            top: 0.06,
            bottom: 0.18
          }
        },
        timeScale: {
          borderColor: AXIS,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 2,
          minBarSpacing: 0.001,
          shiftVisibleRangeOnNewBar: false
        },
        crosshair: {
          horzLine: {
            color: "#6b7280",
            labelBackgroundColor: "#111827"
          },
          vertLine: {
            color: "#6b7280",
            labelBackgroundColor: "#111827"
          }
        },
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true
        },
        handleScale: {
          mouseWheel: true,
          pinch: true,
          axisPressedMouseMove: true
        }
      })
    );
    histSeries = chart.addHistogramSeries({
      priceScaleId: "trades",
      lastValueVisible: false,
      priceLineVisible: false,
      base: 0,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: (value) => Number(value).toFixed(2)
      }
    });
    chart.priceScale("trades").applyOptions({
      scaleMargins: {
        top: 0.84,
        bottom: 0
      },
      visible: false,
      borderVisible: false
    });
    const lineFormat = {
      type: "custom",
      minMove: 0.01,
      formatter: (value) => Number(value).toFixed(2)
    };
    const includeZero = (original) => {
      const res = original();
      if (!res?.priceRange) {
        return res;
      }
      return {
        ...res,
        priceRange: {
          minValue: Math.min(0, res.priceRange.minValue),
          maxValue: Math.max(0, res.priceRange.maxValue)
        }
      };
    };
    pnlSeries = chart.addBaselineSeries({
      baseValue: {
        type: "price",
        price: 0
      },
      topLineColor: RSI_TOUCH_FLIP_EQUITY_POS_COLOR,
      topFillColor1: POS_FILL,
      topFillColor2: POS_FILL,
      bottomLineColor: RSI_TOUCH_FLIP_EQUITY_NEG_COLOR,
      bottomFillColor1: NEG_FILL,
      bottomFillColor2: NEG_FILL,
      lineWidth: 2,
      priceScaleId: "right",
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: lineFormat,
      autoscaleInfoProvider: includeZero
    });
    pnlSeries.createPriceLine({
      price: 0,
      color: ZERO,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: false
    });
    ensureOverlay();
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      syncSplitOverlay();
    });
    if (typeof ResizeObserver === "function") {
      ro = new ResizeObserver(() => {
        resize();
      });
      ro.observe(host);
    }
    applyModel();
    resize();
  }

  return {
    async setModel(next) {
      model = next && typeof next === "object" ? next : emptyModel();
      await ensureChart();
      applyModel();
    },
    resize,
    destroy() {
      ro?.disconnect?.();
      ro = null;
      try {
        chart?.remove?.();
      } catch {
        /* ignore */
      }
      chart = null;
      pnlSeries = null;
      histSeries = null;
      lastW = 0;
      lastH = 0;
      vline?.remove?.();
      vline = null;
      trainLabel = null;
      testLabel = null;
      model = emptyModel();
    }
  };
}
