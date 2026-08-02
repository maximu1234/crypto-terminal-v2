import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  checkMinOrderNotional,
  BYBIT_MIN_ORDER_NOTIONAL_USDT
} = (() => {
  const Module = require("module");
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        net: {
          fetch: async () => {
            throw new Error("net.fetch stub — offline test");
          }
        },
        app: {
          getPath: () => "/tmp"
        }
      };
    }
    if (request === "electron-log") {
      return {
        info() {},
        warn() {},
        error() {},
        debug() {}
      };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return require("../desktop/trading/algo-bot-order-executor.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

test(
  "checkMinOrderNotional rejects volume below Bybit $5 minimum",
  () => {
    const result = checkMinOrderNotional(
      3.42,
      BYBIT_MIN_ORDER_NOTIONAL_USDT
    );

    assert.equal(result.ok, false);
    assert.match(
      result.message || "",
      /объём \$3\.42 < минимум Bybit \$5 — ордер не выставлен/
    );
  }
);

test(
  "checkMinOrderNotional accepts volume at or above minimum",
  () => {
    assert.equal(checkMinOrderNotional(5, 5).ok, true);
    assert.equal(checkMinOrderNotional(12.5, 5).ok, true);
  }
);

test(
  "checkMinOrderNotional falls back to $5 when min is invalid",
  () => {
    const result = checkMinOrderNotional(4.99, NaN);

    assert.equal(result.ok, false);
    assert.equal(result.minNotional, 5);
  }
);
