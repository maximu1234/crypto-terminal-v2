import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "algo-ticker-books-"));
const origLoad = Module._load;

Module._load = function mockElectron(request, parent, isMain){
  if(request === "electron"){
    return {
      app: {
        getPath(){
          return tmp;
        }
      }
    };
  }
  return origLoad.call(this, request, parent, isMain);
};

const store = require("../desktop/trading/algo-bot-store.cjs");

test.after(() => {
  Module._load = origLoad;
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("writeTickerBook rejects empty tickers", () => {
  const res = store.writeTickerBook("st1", { tf: "5", tickers: {} });
  assert.equal(res.ok, false);
});

test("writeTickerBook then readTickerBook round-trips selected strategy", () => {
  const book = {
    strategyId: "st1",
    tf: "5",
    tickers: {
      BTCUSDT: { slPctOfX: 40, tpRr: 2, tf: "5" },
      ETHUSDT: { slPctOfX: 55, tpRr: 1.5, tf: "5" }
    }
  };
  const written = store.writeTickerBook("st1", book, "bybit");
  assert.equal(written.ok, true);
  assert.equal(written.tickerCount, 2);
  const loaded = store.readTickerBook("st1", "bybit");
  assert.equal(loaded.tf, "5");
  assert.equal(loaded.tickers.BTCUSDT.tpRr, 2);
  assert.equal(store.readTickerBook("st2", "bybit"), null);
});
