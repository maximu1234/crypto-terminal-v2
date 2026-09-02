import test from "node:test";
import assert from "node:assert/strict";
import {
defaultChartDisplayStyle,
normalizeChartDisplayStyle,
mapDisplayCandlesToSeriesData,
mapBarToSeriesPoint,
sourcePriceFromBar,
seriesBarClose,
ohlcPriceRangeFromBars
} from "../js/chart/chart-display-style.js";
import {
createPriceSeriesHost
} from "../js/chart/price-series-host.js";

test("chart display style defaults to candles and close", () => {
  const style = defaultChartDisplayStyle();
  assert.equal(style.type, "candles");
  assert.equal(style.source, "close");
  assert.equal(style.lineStyle, "solid");
  assert.equal(style.lineWidth, 2);
});

test("normalizeChartDisplayStyle rejects unknown type and source", () => {
  const style = normalizeChartDisplayStyle({
    type: "heikin",
    source: "ohlc4",
    lineStyle: "wave",
    lineColor: "blue",
    lineWidth: 9
  });
  assert.equal(style.type, "candles");
  assert.equal(style.source, "close");
  assert.equal(style.lineStyle, "solid");
  assert.equal(style.lineColor, "#5b9cf6");
  assert.equal(style.lineWidth, 2);
});

test("normalizeChartDisplayStyle keeps line prefs", () => {
  const style = normalizeChartDisplayStyle({
    type: "line",
    source: "hl2",
    lineStyle: "dashed",
    lineColor: "#2962FF",
    lineWidth: 3
  });
  assert.equal(style.type, "line");
  assert.equal(style.source, "hl2");
  assert.equal(style.lineStyle, "dashed");
  assert.equal(style.lineColor, "#2962ff");
  assert.equal(style.lineWidth, 3);
});

const sample = {
  time: 1,
  open: 10,
  high: 16,
  low: 8,
  close: 14
};

test("sourcePriceFromBar uses close, high, and hl2", () => {
  assert.equal(sourcePriceFromBar(sample, "close"), 14);
  assert.equal(sourcePriceFromBar(sample, "high"), 16);
  assert.equal(sourcePriceFromBar(sample, "hl2"), 12);
});

test("mapDisplayCandlesToSeriesData keeps OHLC for candles", () => {
  const rows = mapDisplayCandlesToSeriesData(
    [sample, { time: 2 }],
    { type: "candles" }
  );
  assert.equal(rows[0], sample);
  assert.deepEqual(rows[1], { time: 2 });
});

test("mapDisplayCandlesToSeriesData maps close line and keeps whitespace", () => {
  const rows = mapDisplayCandlesToSeriesData(
    [sample, { time: 2 }],
    { type: "line", source: "close" }
  );
  assert.deepEqual(rows[0], { time: 1, value: 14 });
  assert.deepEqual(rows[1], { time: 2 });
});

test("mapBarToSeriesPoint uses high when source is high", () => {
  assert.deepEqual(
    mapBarToSeriesPoint(sample, { type: "line", source: "high" }),
    { time: 1, value: 16 }
  );
});

test("seriesBarClose reads close or line value", () => {
  assert.equal(seriesBarClose(sample), 14);
  assert.equal(seriesBarClose({ time: 1, value: 7 }), 7);
  assert.equal(seriesBarClose({ time: 1 }), null);
});

test("price series host calls inner methods with the series as this", () => {
  const inner = {
    setData() {},
    update() {},
    applyOptions(opts) {
      assert.equal(this, inner);
      this.lastFormat = opts;
    },
    priceToCoordinate(price) {
      assert.equal(this, inner);
      return price * 2;
    },
    coordinateToPrice(y) {
      assert.equal(this, inner);
      return y / 2;
    },
    priceScale() {
      assert.equal(this, inner);
      return { id: "right" };
    },
    options() {
      assert.equal(this, inner);
      return { priceLineVisible: true };
    },
    data() {
      assert.equal(this, inner);
      return [{ time: 1, close: 10 }];
    }
  };
  const host = createPriceSeriesHost(
    { removeSeries() {}, addLineSeries() { return inner; }, addCandlestickSeries() { return inner; } },
    inner,
    { type: "candles" }
  );
  assert.equal(host.priceToCoordinate(3), 6);
  assert.equal(host.coordinateToPrice(8), 4);
  assert.deepEqual(host.priceScale(), { id: "right" });
  host.applyOptions({ priceFormat: { precision: 2 } });
  assert.equal(inner.lastFormat.priceFormat.precision, 2);
});

test("ohlcPriceRangeFromBars uses wicks and skips whitespace", () => {
  assert.deepEqual(
    ohlcPriceRangeFromBars([
      sample,
      { time: 2 },
      { time: 3, open: 9, high: 20, low: 7, close: 11 }
    ]),
    { minValue: 7, maxValue: 20 }
  );
  assert.equal(ohlcPriceRangeFromBars([{ time: 1 }]), null);
});

function seriesStub(tag) {
  return {
    tag,
    visible: true,
    rows: null,
    setData(rows) {
      this.rows = rows;
    },
    update() {},
    applyOptions(opts) {
      if (Object.prototype.hasOwnProperty.call(opts, "visible")) {
        this.visible = opts.visible;
      }
      this.lastOpts = opts;
    },
    priceToCoordinate(price) {
      assert.equal(this.tag, "candle");
      return price * 2;
    },
    coordinateToPrice(y) {
      return y / 2;
    },
    priceScale() {
      return { id: "right" };
    },
    options() {
      return { visible: this.visible };
    },
    data() {
      return this.rows || [];
    },
    createPriceLine(opts) {
      return opts;
    }
  };
}

test("line mode adds a line series and never removes the candlestick", () => {
  const prevRaf =
    globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = (fn) => fn();
  try {
  const candle = seriesStub("candle");
  const line = seriesStub("line");
  let removed = 0;
  let lineOpts;
  const chart = {
    removeSeries() {
      removed += 1;
    },
    addLineSeries(opts) {
      lineOpts = opts;
      return line;
    },
    addCandlestickSeries() {
      return candle;
    },
    timeScale() {
      return {
        getVisibleLogicalRange() {
          return { from: 0, to: 1 };
        },
        setVisibleLogicalRange() {}
      };
    }
  };
  const host = createPriceSeriesHost(chart, candle, { type: "candles" });
  host.setData([sample, { time: 2 }]);
  const switched = host.applyDisplayStyle({ type: "line" });
  assert.equal(switched, true);
  assert.equal(removed, 0);
  assert.equal(candle.visible, false);
  assert.equal(line.visible, true);
  assert.equal(typeof lineOpts.autoscaleInfoProvider, "function");
  const auto = lineOpts.autoscaleInfoProvider(() => ({
    priceRange: { minValue: 0, maxValue: 14 }
  }));
  assert.equal(auto.priceRange.minValue, 8);
  assert.equal(auto.priceRange.maxValue, 16);
  assert.equal(Array.isArray(line.rows), true);
  assert.equal(line.rows[0].value, 14);

  const back = host.applyDisplayStyle({ type: "candles" });
  assert.equal(back, true);
  assert.equal(removed, 0);
  assert.equal(candle.visible, true);
  assert.equal(line.visible, false);
  assert.deepEqual(line.rows, []);
  } finally {
    if (prevRaf) {
      globalThis.requestAnimationFrame = prevRaf;
    } else {
      delete globalThis.requestAnimationFrame;
    }
  }
});

