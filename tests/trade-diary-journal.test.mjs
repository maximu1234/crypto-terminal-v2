import assert from "node:assert/strict";
import test from "node:test";

import {
  DIARY_JOURNAL_KIND,
  _resetDiaryJournalMemoryForTests,
  buildDiaryJournalExportDoc,
  diaryTradeIdentityKey,
  ensureDiaryJournalLoaded,
  getDiaryJournalComment,
  replaceDiaryJournalFromImport,
  serializeDiaryJournalExcelXml,
  setDiaryJournalComment,
  upsertDiaryJournalTrades,
  validateDiaryJournalImport
} from "../js/trade-diary-journal.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function trade(overrides = {}) {
  return {
    symbol: "BTCUSDT",
    orderId: "ord-1",
    closeTimeMs: Date.parse("2026-09-01T12:00:00Z"),
    pnlUsd: 12.5,
    pnlPct: 1.2,
    commissionUsd: 0.4,
    side: "Buy",
    ...overrides
  };
}

test("diary journal identity key prefers symbol+orderId", () => {
  assert.equal(diaryTradeIdentityKey(trade()), "id:BTCUSDT:ord-1");
});

test("diary journal upsert keeps comments and isolates exchanges", async () => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const storage = memoryStorage();
  globalThis.localStorage = storage;
  globalThis.window = { localStorage: storage };
  _resetDiaryJournalMemoryForTests();

  try {
    await ensureDiaryJournalLoaded("bybit");
    await upsertDiaryJournalTrades("bybit", [trade()]);
    await setDiaryJournalComment("bybit", "id:BTCUSDT:ord-1", "good entry");

    await ensureDiaryJournalLoaded("bingx");
    await upsertDiaryJournalTrades("bingx", [
      trade({ orderId: "bx-1", symbol: "ETHUSDT" })
    ]);

    assert.equal(getDiaryJournalComment("bybit", "id:BTCUSDT:ord-1"), "good entry");
    assert.equal(getDiaryJournalComment("bingx", "id:ETHUSDT:bx-1"), "");

    await upsertDiaryJournalTrades("bybit", [
      trade({ pnlUsd: 20 })
    ]);
    assert.equal(
      getDiaryJournalComment("bybit", "id:BTCUSDT:ord-1"),
      "good entry",
      "comment survives snapshot refresh"
    );

    const exported = buildDiaryJournalExportDoc("bybit");
    assert.equal(exported.kind, DIARY_JOURNAL_KIND);
    assert.equal(exported.exchangeId, "bybit");
    assert.equal(exported.trades.length, 1);
    assert.equal(exported.trades[0].comment, "good entry");
    assert.equal(exported.trades[0].pnlUsd, 20);
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    _resetDiaryJournalMemoryForTests();
  }
});

test("diary journal import validates kind and exchange", async () => {
  const previousWindow = globalThis.window;
  const previousLocalStorage = globalThis.localStorage;
  const storage = memoryStorage();
  globalThis.localStorage = storage;
  globalThis.window = { localStorage: storage };
  _resetDiaryJournalMemoryForTests();

  try {
    assert.equal(
      validateDiaryJournalImport({ hello: 1 }, "bybit").ok,
      false
    );
    assert.equal(
      validateDiaryJournalImport(
        {
          kind: DIARY_JOURNAL_KIND,
          version: 1,
          exchangeId: "bingx",
          trades: []
        },
        "bybit"
      ).ok,
      false
    );

    const ok = await replaceDiaryJournalFromImport("bybit", {
      kind: DIARY_JOURNAL_KIND,
      version: 1,
      exchangeId: "bybit",
      trades: [
        {
          tradeId: "id:BTCUSDT:ord-9",
          symbol: "BTCUSDT",
          orderId: "ord-9",
          closeTimeMs: 1,
          pnlUsd: 1,
          pnlPct: 1,
          commissionUsd: 0,
          side: "Sell",
          comment: "from file"
        }
      ]
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.count, 1);
    assert.equal(getDiaryJournalComment("bybit", "id:BTCUSDT:ord-9"), "from file");

    const xls = serializeDiaryJournalExcelXml("bybit");
    assert.match(xls, /Excel\.Sheet/);
    assert.match(xls, /from file/);
  } finally {
    globalThis.window = previousWindow;
    globalThis.localStorage = previousLocalStorage;
    _resetDiaryJournalMemoryForTests();
  }
});
