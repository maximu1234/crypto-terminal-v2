import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  qtyFromVolumeUsdt
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
    return require("../desktop/trading/algo-bybit-rest.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

test(
  "qtyFromVolumeUsdt bumps qty to meet Bybit minNotionalValue",
  () => {
    const qty = qtyFromVolumeUsdt(1.6, 0.05338, {
      qtyStep: "1",
      minOrderQty: "1",
      minNotionalValue: "5"
    });

    assert.ok(qty);
    const n = Number(qty);
    assert.ok(
      n * 0.05338 >= 5 - 1e-9,
      `notional ${n * 0.05338} should be >= 5 (qty=${n})`
    );
  }
);

test(
  "qtyFromVolumeUsdt keeps risk-sized qty when already above min notional",
  () => {
    const qty = qtyFromVolumeUsdt(50, 1.66, {
      qtyStep: "0.1",
      minOrderQty: "0.1",
      minNotionalValue: "5"
    });

    assert.equal(qty, "30.1");
  }
);
