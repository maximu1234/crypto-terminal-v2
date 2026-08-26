import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("session status log: one file per session with signals", () => {
  for (const rel of [
    "desktop/trading/algo-bot-session-log.cjs",
    "bot-app/trading/algo-bot-session-log.cjs"
  ]) {
    const sessionLog = require(path.join(root, rel));
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "algo-bot-sessions-")
    );
    sessionLog.setSessionsDirForTests(dir);

    const startedAt = Date.UTC(2026, 7, 3, 6, 48, 12);
    const began = sessionLog.beginSession({
      sessionId: 7,
      strategyId: "st1",
      startedAt,
      tradingMode: "live",
      watchlistCount: 12
    });
    assert.equal(began.ok, true);
    assert.ok(began.path?.includes("_s7_st1.log"));
    assert.equal(fs.readdirSync(dir).length, 1);

    sessionLog.appendNote("Запуск st1");
    sessionLog.appendSignal({
      ts: startedAt + 1000,
      symbol: "BTCUSDT",
      side: "long",
      price: 65000,
      text: "BTCUSDT long: armed pt4=65000"
    });
    sessionLog.appendSignal({
      ts: startedAt + 2000,
      symbol: "ETHUSDT",
      side: "short",
      text: "ETHUSDT short: pt4 до отката — не вооружаем"
    });
    sessionLog.endSession({ message: "stopped by user" });

    const body = fs.readFileSync(began.path, "utf8");
    assert.match(body, /sessionId: 7/);
    assert.match(body, /BTCUSDT \| long/);
    assert.match(body, /armed pt4/);
    assert.match(body, /pt4 до отката/);
    assert.match(body, /endedAt:/);
    assert.match(body, /stopMessage: stopped by user/);
    assert.equal(sessionLog.getActiveSessionLogPath(), null);

    const listed = sessionLog.listSessionFiles();
    assert.equal(listed.ok, true);
    assert.equal(listed.files.length, 1);
    const read = sessionLog.readSessionFile(listed.files[0].name);
    assert.equal(read.ok, true);
    assert.match(read.text, /armed pt4/);
    assert.equal(
      sessionLog.readSessionFile("../secret.log").ok,
      false
    );

    sessionLog.setSessionsDirForTests(null);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("remote session log client builds direct http urls without query token", () => {
  const desktop = require(
    path.join(root, "desktop/trading/algo-bot-session-log-remote-client.cjs")
  );
  assert.equal(
    desktop.buildUrl({
      host: "https://203.0.113.10/extra",
      port: 17865,
      token: "abc",
      path: "/sessions"
    }),
    "http://203.0.113.10:17865/sessions"
  );

  const botApp = require(
    path.join(root, "bot-app/trading/algo-bot-session-log-remote-client.cjs")
  );
  assert.equal(
    botApp.buildUrl({
      host: "https://203.0.113.10/extra",
      port: 17865,
      token: "abc",
      path: "/sessions"
    }),
    "http://203.0.113.10:17865/sessions"
  );
});

test("session log server and viewer modules are wired", () => {
  for (const rel of [
    "desktop/trading/algo-bot-session-log-server.cjs",
    "bot-app/trading/algo-bot-session-log-server.cjs",
    "js/algo-trading/bot-session-log-server-ui.js",
    "js/algo-trading/bot-session-logs-viewer.js"
  ]) {
    assert.ok(
      fs.existsSync(path.join(root, rel)),
      rel
    );
  }
  const strategyUi = fs.readFileSync(
    path.join(root, "js/algo-trading/bot-strategy-ui.js"),
    "utf8"
  );
  assert.ok(strategyUi.includes("mountRemoteSessionLogsEntry"));
  assert.ok(
    fs.readFileSync(path.join(root, "algo-trading.html"), "utf8").includes(
      "algo-bot-remote-logs"
    )
  );
  assert.ok(
    fs.readFileSync(
      path.join(root, "js/algo-trading/bot-session-logs-viewer.js"),
      "utf8"
    ).includes("Отдать сессию")
  );
  assert.ok(
    fs.readFileSync(
      path.join(root, "desktop/trading/algo-bot-session-log-server.cjs"),
      "utf8"
    ).includes("__importAuthSessionTransferString")
  );
  assert.ok(
    fs.readFileSync(path.join(root, "js/auth-ui.js"), "utf8").includes(
      "body > #header-settings-dropdown"
    )
  );
});

test("LAN auth session push sends the channel Bearer token", () => {
  for (const rel of [
    "desktop/trading/algo-bot-session-log-remote-client.cjs",
    "bot-app/trading/algo-bot-session-log-remote-client.cjs"
  ]) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    const push = src.slice(src.indexOf("function pushRemoteAuthSession"));
    assert.match(push, /fetchJsonPost\(/, rel);
    assert.match(
      push,
      /payload\.token/,
      `${rel}: auth push must send channel token`
    );
  }
});

test("pattern engine pushSignal writes through session log module", () => {
  for (const rel of [
    "desktop/trading/algo-bot-pattern-engine.cjs",
    "bot-app/trading/algo-bot-pattern-engine.cjs",
    "desktop/trading/algo-trading-bot.cjs",
    "bot-app/trading/algo-trading-bot.cjs"
  ]) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    assert.ok(
      src.includes('"./algo-bot-session-log.cjs"'),
      `${rel}: must require session log`
    );
  }
  const engine = fs.readFileSync(
    path.join(root, "desktop/trading/algo-bot-pattern-engine.cjs"),
    "utf8"
  );
  assert.ok(engine.includes("sessionLog.appendSignal"));
});

test("LAN bot command accepts the three live bots", () => {
  for (const rel of [
    "desktop/trading/algo-bot-session-log-server.cjs",
    "desktop/trading/algo-bot-session-log-remote-client.cjs",
    "desktop/trading/algo-bot-remote-control.cjs",
    "js/algo-trading/bot-remote-client.js",
    "js/algo-trading/bot-session-logs-viewer.js"
  ]) {
    const src = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(src, /early-t3/, rel);
    assert.match(src, /rsi-touch-flip/, rel);
  }
});

test("LAN ticker-book payload parser splits RSI Flip from Pattern 1-2", () => {
  const {
    parseRsiTouchFlipBookPayload
  } = require(
    path.join(root, "desktop/trading/algo-bot-rsi-touch-flip-book-payload.cjs")
  );
  const rsi = parseRsiTouchFlipBookPayload({
    strategyId: "rsi-touch-flip",
    rows: [{ symbol: "ETHUSDT", tf: "5", prefs: { budget: 100 } }]
  });
  assert.equal(rsi.isRsiTouchFlip, true);
  assert.equal(rsi.rows.length, 1);
  const nested = parseRsiTouchFlipBookPayload({
    book: {
      strategyId: "rsi-touch-flip",
      rows: [{ symbol: "SOLUSDT", tf: "1" }]
    }
  });
  assert.equal(nested.isRsiTouchFlip, true);
  assert.equal(nested.rows[0].symbol, "SOLUSDT");
  const pattern = parseRsiTouchFlipBookPayload({
    strategyId: "st1",
    book: { strategyId: "st1", tickers: { ETHUSDT: {} } }
  });
  assert.equal(pattern.isRsiTouchFlip, false);
  assert.equal(pattern.rows.length, 0);
});
