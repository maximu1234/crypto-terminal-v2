import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import Module from "node:module";

const require = createRequire(import.meta.url);

function loadSweep() {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "electron-log") {
      return {
        info() {},
        warn() {},
        error() {},
        debug() {}
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    delete require.cache[
      require.resolve("../desktop/trading/algo-bot-bar-close-sweep.cjs")
    ];
    return require("../desktop/trading/algo-bot-bar-close-sweep.cjs");
  } finally {
    Module._load = originalLoad;
  }
}

const {
  createBarCloseSweep
} = loadSweep();

test("bar close sweep scans seeded symbols and notes progress", async () => {
  const notes = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const expectClose = Math.floor(nowSec / 300) * 300 - 300;
  const states = new Map([
    [
      "AAAUSDT",
      {
        seeded: true,
        candles: [
          {
            time: expectClose - 300,
            open: 1,
            high: 1,
            low: 1,
            close: 1
          }
        ],
        forming: null,
        needsResync: false
      }
    ],
    [
      "BBBUSDT",
      {
        seeded: true,
        candles: [
          {
            time: expectClose,
            open: 2,
            high: 2,
            low: 2,
            close: 2
          }
        ],
        forming: null,
        needsResync: false
      }
    ]
  ]);

  let cfg = {
    tf: "5",
    timeoutBars: 300,
    onActivity() {}
  };
  let fetched = 0;
  let armed = 0;

  const sweep = createBarCloseSweep({
    getEngineConfig: () => cfg,
    getSymbolStates: () => states,
    getState: (s) => states.get(s),
    tfStepSeconds: () => 300,
    normalizeTf: (t) => String(t),
    getMaxHistory: () => 500,
    trimCandles: (c) => c,
    armAllPendingSetups: async () => {
      armed += 1;
    },
    processArmedOnBar: async () => {},
    fetchKlineHistory: async () => {
      fetched += 1;
      return {
        ok: true,
        candles: [
          {
            time: expectClose,
            open: 3,
            high: 3,
            low: 3,
            close: 3
          }
        ]
      };
    },
    appendNote: (t) => notes.push(t),
    concurrency: 2
  });

  await sweep._runNow();
  sweep.clear();
  cfg = null;

  assert.equal(armed, 2);
  assert.equal(fetched, 2);
  assert.match(notes[0], /прогон close tf=5 · старт · 2 тикеров/);
  assert.match(notes[1], /готово · сканировано 2\/2 · REST догрузка 2/);
});

test("bar close sweep notes pending seed when not all seeded", async () => {
  const notes = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const expectClose = Math.floor(nowSec / 300) * 300 - 300;
  const states = new Map([
    [
      "AAAUSDT",
      {
        seeded: true,
        candles: [{ time: expectClose, open: 1, high: 1, low: 1, close: 1 }],
        forming: null
      }
    ],
    [
      "BBBUSDT",
      {
        seeded: false,
        candles: [],
        forming: null
      }
    ]
  ]);

  let cfg = { tf: "5", timeoutBars: 300, onActivity() {} };
  const sweep = createBarCloseSweep({
    getEngineConfig: () => cfg,
    getSymbolStates: () => states,
    getState: (s) => states.get(s),
    tfStepSeconds: () => 300,
    normalizeTf: (t) => String(t),
    getMaxHistory: () => 500,
    trimCandles: (c) => c,
    armAllPendingSetups: async () => {},
    processArmedOnBar: async () => {},
    fetchKlineHistory: async () => ({ ok: true, candles: [] }),
    appendNote: (t) => notes.push(t),
    concurrency: 2
  });

  await sweep._runNow();
  sweep.clear();
  cfg = null;

  assert.match(notes[0], /старт · 1\/2 \(ещё seed 1\)/);
  assert.match(notes[1], /готово · сканировано 1\/1/);
});
