import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  normalizeRsiTouchFlipBook,
  normalizeRsiTouchFlipBookRow,
  sumRsiTouchFlipBookBudgets,
  rsiTouchFlipBookBudgetFits,
  rsiTouchFlipShareBudgetFits,
  rsiTouchFlipAllocatedUsdt,
  rsiTouchFlipEqualShareBudget,
  parseWalletAvailableUsdt
} from "../js/algo-trading/rsi-touch-flip-book.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

test("book row keeps chart tf and launch prefs per ticker", () => {
  const row = normalizeRsiTouchFlipBookRow({
    symbol: "ethusdt.p",
    tf: "5",
    prefs: { rsiLen: 20, osLevel: 35, obLevel: 78, budget: 250, rsiTf: "1" }
  });
  assert.equal(row.symbol, "ETHUSDT");
  assert.equal(row.tf, "5");
  assert.equal(row.prefs.rsiLen, 20);
  assert.equal(row.prefs.budget, 250);
  assert.equal(row.prefs.rsiTf, "1");
  assert.equal(row.prefs.cycleSlEnabled, false);
  assert.equal("marginMode" in row.prefs, false);
});

test("duplicate symbols collapse to the last row", () => {
  const book = normalizeRsiTouchFlipBook([
    { symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } },
    { symbol: "ethusdt.p", tf: "1", prefs: { budget: 400 } }
  ]);
  assert.equal(book.length, 1);
  assert.equal(book[0].tf, "1");
  assert.equal(book[0].prefs.budget, 400);
});

test("budget gate uses overwrite of the same ticker", () => {
  const rows = [
    { symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } },
    { symbol: "SOLUSDT", tf: "5", prefs: { budget: 100 } }
  ];
  const over = rsiTouchFlipBookBudgetFits({
    rows,
    available: 300,
    incoming: { symbol: "ETHUSDT", budget: 200 }
  });
  assert.equal(over.ok, true);
  assert.equal(over.sum, 300);
  const fail = rsiTouchFlipBookBudgetFits({
    rows,
    available: 250,
    incoming: { symbol: "BTCUSDT", budget: 80 }
  });
  assert.equal(fail.ok, false);
  assert.equal(fail.sum, 280);
});

test("start gate is sum of all book budgets vs available", () => {
  const rows = [
    { symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } },
    { symbol: "SOLUSDT", tf: "1", prefs: { budget: 50 } }
  ];
  assert.equal(sumRsiTouchFlipBookBudgets(rows), 150);
  assert.equal(rsiTouchFlipBookBudgetFits({ rows, available: 150 }).ok, true);
  assert.equal(rsiTouchFlipBookBudgetFits({ rows, available: 149 }).ok, false);
});

test("live share is equal parts of allocated percent, not row budgets", () => {
  assert.equal(rsiTouchFlipAllocatedUsdt(200, 50), 100);
  assert.equal(rsiTouchFlipEqualShareBudget(100, 1), 100);
  assert.equal(rsiTouchFlipEqualShareBudget(100, 3), 100 / 3);
  assert.equal(
    rsiTouchFlipShareBudgetFits({
      available: 200,
      balancePct: 50,
      tickerCount: 3
    }).ok,
    true
  );
  assert.equal(
    rsiTouchFlipShareBudgetFits({
      available: 200,
      balancePct: 50,
      tickerCount: 3
    }).share,
    100 / 3
  );
  assert.equal(
    rsiTouchFlipShareBudgetFits({
      available: 2,
      balancePct: 50,
      tickerCount: 3
    }).ok,
    false
  );
});

test("coin list symbols stay without .P so they match Bybit tickers and Pattern flags", () => {
  const book = normalizeRsiTouchFlipBook([
    { symbol: "ETHUSDT.P", tf: "5", prefs: { budget: 80 } },
    { symbol: "solusdt", tf: "1", prefs: { budget: 40 } }
  ]);
  assert.deepEqual(
    book.map((row) => row.symbol),
    ["ETHUSDT", "SOLUSDT"]
  );
});

test("RSI list paints the book flag and clearing it removes the book row", () => {
  const list = fs.readFileSync(
    path.join(root, "js/algo-trading-list.js"),
    "utf8"
  );
  const flags = fs.readFileSync(
    path.join(root, "js/algo-trading/ticker-flags.js"),
    "utf8"
  );
  const css = fs.readFileSync(path.join(root, "css/algo-trading.css"), "utf8");
  assert.match(list, /removeRsiTouchFlipBookRow/);
  assert.match(list, /flag--algo-rsi-flip/);
  assert.match(flags, /algo-rsi-flip/);
  assert.match(css, /flag--algo-rsi-flip/);
});

test("wallet available 0 falls back to equity like the algo-profile label", () => {
  assert.equal(
    parseWalletAvailableUsdt({ ok: true, usdt: "86.53", available: 0 }),
    86.53
  );
  assert.equal(
    parseWalletAvailableUsdt({ ok: true, usdt: "86.53", available: 50 }),
    50
  );
  assert.equal(
    parseWalletAvailableUsdt({ ok: true, usdt: "0", available: 0 }),
    0
  );
  const gate = rsiTouchFlipBookBudgetFits({
    rows: [],
    available: { ok: true, usdt: "86.53", available: 0 },
    incoming: { symbol: "ETHUSDT", budget: 80 }
  });
  assert.equal(gate.ok, true);
  assert.equal(gate.available, 86.53);
});

test("live engine and LAN accept a full RSI book replace without restart", () => {
  const engine = fs.readFileSync(
    path.join(root, "desktop/trading/algo-bot-rsi-touch-flip-engine.cjs"),
    "utf8"
  );
  const bot = fs.readFileSync(
    path.join(root, "desktop/trading/algo-trading-bot.cjs"),
    "utf8"
  );
  const viewer = fs.readFileSync(
    path.join(root, "js/algo-trading/bot-session-logs-viewer.js"),
    "utf8"
  );
  const book = fs.readFileSync(
    path.join(root, "js/algo-trading/rsi-touch-flip-book.js"),
    "utf8"
  );
  const client = fs.readFileSync(
    path.join(root, "desktop/trading/algo-bot-session-log-remote-client.cjs"),
    "utf8"
  );
  const server = fs.readFileSync(
    path.join(root, "desktop/trading/algo-bot-session-log-server.cjs"),
    "utf8"
  );
  assert.match(engine, /syncRsiTouchFlipBook/);
  assert.match(engine, /убрали из книги/);
  assert.match(engine, /refreshShareBudgets/);
  assert.match(engine, /entryBudget/);
  assert.match(engine, /queuedBalancePct/);
  assert.match(engine, /live книгу не менял/);
  assert.match(engine, /budget: 0/);
  assert.match(engine, /CYCLE SL/);
  assert.match(engine, /slBlockLong/);
  assert.match(engine, /rsiTouchFlipCycleSlHit/);
  assert.match(engine, /позиция на бирже исчезла, сбрасываем/);
  assert.match(engine, /rsiTouchFlipOpenLooksFilled/);
  const applyIdx = engine.indexOf("async function applyBookDiff");
  const applyEnd = engine.indexOf("async function startRsiTouchFlipEngine");
  const applyFn = engine.slice(applyIdx, applyEnd);
  const walletIdx = applyFn.indexOf("await refreshWalletAllocated()");
  const seedIdx = applyFn.indexOf("await seedTicker(row)");
  assert.ok(applyIdx >= 0 && applyEnd > applyIdx);
  assert.ok(walletIdx >= 0 && seedIdx > walletIdx);
  assert.match(applyFn, /return shareGateFailResult/);
  assert.match(engine, /function shareGateFailResult/);
  assert.match(
    engine.slice(
      engine.indexOf("function shareGateFailResult"),
      applyIdx
    ),
    /ok:\s*false/
  );
  const syncBot = bot.slice(
    bot.indexOf("async function syncRsiTouchFlipBookNow"),
    bot.indexOf("let rsiTouchFlipBookSyncChain")
  );
  const liveSyncIdx = syncBot.indexOf("rsiTouchFlipEngine.syncRsiTouchFlipBook");
  const writeIdx = syncBot.indexOf("writeRsiTouchFlipBook");
  assert.ok(liveSyncIdx >= 0 && writeIdx > liveSyncIdx);
  assert.match(syncBot, /rows.length/);
  assert.match(bot, /source ===\s*"lan"/);
  assert.match(viewer, /strategyId ===\s*"rsi-touch-flip"/);
  assert.match(viewer, /Отправка книги RSI Flip/);
  assert.match(viewer, /loadRsiTouchFlipBalancePct/);
  assert.match(viewer, /!!st\?\.starting/);
  assert.doesNotMatch(viewer, /sessionStorage\.setItem\(\s*TOKEN_SESSION_KEY/);
  assert.match(viewer, /algo_remote_lan_channel_token_v1/);
  assert.match(viewer, /writePersistedToken/);
  assert.match(bot, /storedBook\?\.rows/);
  assert.match(bot, /requestRsiTouchFlipStartCancel/);
  assert.match(bot, /starting:\s*!!startInflight/);
  assert.match(engine, /function requestRsiTouchFlipStartCancel/);
  assert.match(engine, /throwIfRsiTouchFlipStartCancelled/);
  assert.match(client, /payload\.balancePct/);
  assert.match(client, /180000/);
  assert.match(server, /body\.balancePct/);
  assert.match(server, /starting:\s*!!st\.starting/);
  assert.match(book, /Live подхватывает/);
  assert.match(book, /replaceRsiTouchFlipBook/);
  assert.match(book, /rsiTouchFlipShareBudgetFits/);
  assert.match(client, /parseRsiTouchFlipBookPayload/);
  assert.match(server, /parseRsiTouchFlipBookPayload/);
  assert.match(server, /source:\s*"lan"/);
  const html = fs.readFileSync(path.join(root, "algo-trading.html"), "utf8");
  assert.match(html, /algo-bot-rsi-flip-balance-pct/);
  assert.match(html, /algo-bot-rsi-flip-isolated/);
  assert.match(html, /Размер баланса/);
  for (const rel of ["desktop/preload.js", "bot-app/preload.js"]) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(src, /syncRsiTouchFlipBook:/);
    assert.match(src, /desktop:algoTradingSyncRsiTouchFlipBook/);
    assert.match(src, /desktop:algoTradingGetRsiTouchFlipBook/);
  }
});

test("changing live % gates share and reverts a rejected book apply", () => {
  const ui = fs.readFileSync(
    path.join(root, "js/algo-trading/bot-strategy-ui.js"),
    "utf8"
  );
  const id = '"algo-bot-rsi-flip-balance-pct"';
  const first = ui.indexOf(id);
  const second = ui.indexOf(id, first + 1);
  const changeIdx = ui.indexOf(id, second + 1);
  const hydrateIdx = ui.indexOf("void hydrateRsiTouchFlipBookFromMain();", changeIdx);
  const chunk = ui.slice(
    changeIdx,
    hydrateIdx > changeIdx ? hydrateIdx : changeIdx + 2500
  );
  assert.ok(first >= 0 && second > first && changeIdx > second);
  assert.match(chunk, /rsiTouchFlipShareBudgetFits/);
  assert.match(chunk, /rsiTouchFlipRunning/);
  assert.match(chunk, /rsiBookLiveSyncChain/);
  assert.match(chunk, /saveRsiTouchFlipBalancePct\(\s*previous/);
});
