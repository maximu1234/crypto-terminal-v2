import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Module } from "node:module";

const require = createRequire(import.meta.url);

const { formatPriceToTick } = (() => {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron") {
      return {
        net: {
          fetch: async () => {
            throw new Error("net unused in unit test");
          }
        }
      };
    }
    return originalLoad(request, parent, isMain);
  };
  try {
    return require("../desktop/trading/bybit-rest.cjs");
  } finally {
    Module._load = originalLoad;
  }
})();

test("stop price follows the instrument tick, not the average-price decimals", () => {
  assert.equal(formatPriceToTick(0.08523, "0.0001", 0.085), "0.0852");
  assert.equal(formatPriceToTick(0.08526, "0.0001", 0.085), "0.0853");
  assert.equal(formatPriceToTick(1.20344, "0.0001", 1.2), "1.2034");
  assert.equal(formatPriceToTick(1.2034, null, 1.2), "1.20");
});
