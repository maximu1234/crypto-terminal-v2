import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function listJs(relativeDir) {
  const out = [];
  const absoluteDir = path.join(ROOT, relativeDir);
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...listJs(relativePath));
    } else if (entry.name.endsWith(".js")) {
      out.push(relativePath);
    }
  }
  return out;
}

test("renderer exchange modules do not import each other", () => {
  for (const file of listJs("js/trade/bybit")) {
    const source = read(file).toLowerCase();
    assert.doesNotMatch(source, /trade\/bingx|\/bingx\//, file);
  }

  for (const file of listJs("js/trade/bingx")) {
    const source = read(file).toLowerCase();
    assert.doesNotMatch(source, /trade\/bybit|\/bybit\//, file);
  }
});

test("main-process exchange adapters do not import each other", () => {
  for (const file of [
    "desktop/trading/bybit-rest.cjs",
    "desktop/trading/bybit-private-ws.cjs",
    "desktop/trading/bybit-trading-stream.cjs"
  ]) {
    assert.doesNotMatch(read(file), /require\([^)]*bingx/i, file);
  }

  for (const file of [
    "desktop/trading/bingx-rest.cjs",
    "desktop/trading/bingx-rest-diary.cjs",
    "desktop/trading/bingx-rest-settings.cjs",
    "desktop/trading/bingx-private-ws.cjs",
    "desktop/trading/bingx-trading-stream.cjs"
  ]) {
    assert.doesNotMatch(read(file), /require\([^)]*bybit/i, file);
  }
});

test("shared renderer trade entrypoints are thin facades", () => {
  const facades = [
    "js/trade-positions-cache.js",
    "js/trade-stream-bridge.js",
    "js/trade-chart-overlay.js",
    "js/trade-auto-stops.js",
    "js/trade-market-entry.js",
    "js/trade-book-panel.js"
  ];

  for (const file of facades) {
    const source = read(file);
    assert.match(source, /trade\/module-router\.js/, file);
    assert.doesNotMatch(
      source,
      /getActiveExchangeId|recentlyClosedMs|streamMissClearsCache|forceRefresh/,
      file
    );
    assert.doesNotMatch(source, /throw new Error/, `${file} should soft-fail`);
    assert.ok(source.split("\n").length < 140, `${file} is not a thin facade`);
  }
});

test("exchange switch stops old module before router reset", () => {
  const source = read("js/exchange-trading-gate.js");
  const restart = source.slice(source.indexOf("async function restartExchangeTrading"));
  const stopAt = restart.indexOf("await suspendExchangeTrading");
  const resetAt = restart.indexOf("resetTradeExchangeModules");

  assert.ok(stopAt >= 0, "old exchange is stopped");
  assert.ok(resetAt > stopAt, "router reset happens after stopping old exchange");
});

test("desktop extraResources destinations are unique", () => {
  const pkg = JSON.parse(read("desktop/package.json"));
  const destinations = (pkg.build?.extraResources || []).map((row) => row.to);
  assert.equal(
    new Set(destinations).size,
    destinations.length,
    "duplicate extraResources destination"
  );
});

test("BingX request scheduler stays BingX-only", () => {
  const scheduler = read("desktop/trading/bingx-request-scheduler.cjs");
  assert.doesNotMatch(scheduler, /require\([^)]*bybit/i);
  assert.match(scheduler, /createBingxRequestScheduler/);

  for (const file of [
    "desktop/trading/bybit-rest.cjs",
    "desktop/trading/bybit-trading-stream.cjs",
    "desktop/trading/bybit-private-ws.cjs"
  ]) {
    assert.doesNotMatch(
      read(file),
      /bingx-request-scheduler|enqueueBingxRequest/i,
      file
    );
  }

  assert.match(
    read("desktop/trading/bingx-rest.cjs"),
    /bingx-request-scheduler/
  );
});

test("BingX renderer stream bridge has no periodic REST poll", () => {
  const source = read("js/trade/bingx/stream-bridge.js");
  assert.doesNotMatch(source, /setInterval/);
  assert.doesNotMatch(source, /syncTradeStreamFromRest/);
  assert.match(source, /getStreamSnapshot/);
});

test("BingX diary list resolves collapsed rows before returning", () => {
  const rest = read("desktop/trading/bingx-rest.cjs");
  assert.match(rest, /bingx-rest-diary\.cjs/);
  assert.match(rest, /bindBingxDiaryDeps/);
  const source = read("desktop/trading/bingx-rest-diary.cjs");
  const fnStart = source.indexOf("async function getClosedPnlHistory");
  assert.ok(fnStart >= 0);
  const nextFn = source.indexOf("\nasync function ", fnStart + 1);
  const body = source.slice(fnStart, nextFn > fnStart ? nextFn : undefined);
  assert.match(body, /REALIZED_PNL/);
  assert.match(body, /await enrichClosedPnlTrades/);
  assert.match(body, /income\+closed-resolver/);
  assert.match(
    body,
    /diaryListReq|cancelable:\s*false/,
    "diary list must not be cancelable background (dropped for critical trade)"
  );
  assert.match(
    body,
    /fetchBingxIncomeRows\(\{[\s\S]*cancelable:\s*false|\.\.\.diaryListReq/,
    "income fetch for diary must pass cancelable:false"
  );
  assert.doesNotMatch(
    body,
    /for \(let i = 0; i < symbols\.length/,
    "must not loop all symbols for positionHistory on list load"
  );
  assert.match(body, /if \(symbolFilter\)/);
  assert.match(
    body,
    /position-side-fills-v6|markerSchema:\s*6/,
    "single-symbol Terminal history must use explicit position-side schema"
  );
  assert.match(body, /fetchBingxPositionHistoryPages/);
  assert.match(body, /buildBingxRoundTripsFromPositionFills/);
  assert.match(body, /executionsFromBingxClosedTrades/);
  assert.doesNotMatch(
    body,
    /paired-fills-v[0-9]|enrichBingxTradeFromFills|pairChronologicalRoundTrip|pairBingxRoundTripFromFills/,
    "Terminal markers must not invent side/open from fill chronology"
  );
});

test("BingX diary uses unified closed-trade resolver", () => {
  const source = read("desktop/trading/bingx-rest-diary.cjs");
  assert.match(source, /async function resolveBingxClosedTrade/);
  assert.match(source, /fetchBingxAllFillOrdersPaged|allFillOrders/);
  assert.match(source, /DIARY_FILL_LOOKBACK_MS/);

  const detailStart = source.indexOf("async function getTradeDiaryDetail");
  assert.ok(detailStart >= 0);
  const detailNext = source.indexOf("\nasync function ", detailStart + 1);
  const detailBody = source.slice(
    detailStart,
    detailNext > detailStart ? detailNext : undefined
  );
  assert.match(detailBody, /resolveBingxClosedTrade/);
  assert.match(detailBody, /resolved:\s*false/);
  assert.doesNotMatch(
    detailBody,
    /ok:\s*true[\s\S]*executions:\s*\[\]/,
    "detail must not soft-succeed with empty executions"
  );

  const enrichStart = source.indexOf("async function enrichClosedPnlTrades");
  assert.ok(enrichStart >= 0);
  const enrichNext = source.indexOf("\nasync function ", enrichStart + 1);
  const enrichBody = source.slice(
    enrichStart,
    enrichNext > enrichStart ? enrichNext : undefined
  );
  assert.match(enrichBody, /PRIORITY\.normal/);
  assert.match(enrichBody, /cancelable:\s*false/);
  assert.match(enrichBody, /fetchBingxFillRowsPaged/);
  assert.match(enrichBody, /MAX_LIST_SYMBOLS/);
  assert.match(enrichBody, /rateLimited/);
  assert.match(enrichBody, /pnlPct/);
  assert.match(enrichBody, /executionFees/);
  assert.doesNotMatch(
    enrichBody,
    /PRIORITY\.background/,
    "diary enrich must not use cancelable background priority"
  );
  assert.doesNotMatch(
    enrichBody,
    /await resolveBingxClosedTrade/,
    "list enrich must not N× resolveBingxClosedTrade (hangs diary load)"
  );
  assert.doesNotMatch(
    enrichBody,
    /fetchBingxAllFillRowsForRange/,
    "list enrich must not dump account-wide fills without symbol"
  );

  const facade = read("js/trade-diary-page.js");
  assert.match(
    facade,
    /isDesktopTradeDiaryContext/,
    "shared diary page must gate desktop before boot"
  );
  assert.match(
    facade,
    /bootTradeDiaryPage/,
    "shared diary page is a thin boot facade"
  );
  assert.doesNotMatch(
    facade,
    /getClosedPnl|readDiaryDayTrades|writeDiaryDayTrades|clearDiaryDayTrades/,
    "shared diary host must not own exchange fetch/cache logic"
  );
  assert.doesNotMatch(
    facade,
    /exchangeId\s*===\s*["']bingx["']/,
    "shared diary host must not branch on bingx"
  );
  assert.doesNotMatch(
    facade,
    /Загружаем сделки BingX/,
    "loading status must not hardcode BingX when Bybit diary is active"
  );

  const bingxPage = read("js/trade/bingx/diary/page.js");
  assert.match(
    bingxPage,
    /diaryLoadPeriod/,
    "period loading must come from BingX diary module"
  );
  assert.match(
    bingxPage,
    /diaryAfterListPaint|maybeEnrichDiaryDurations/,
    "list post-paint hook remains for BingX residual enrich"
  );

  const bybitPolicy = read("js/trade/bybit/diary/policy.js");
  assert.match(
    bybitPolicy,
    /hit\s*!==\s*null/,
    "Bybit accepts any day-cache hit including empty []"
  );
  assert.doesNotMatch(
    bybitPolicy,
    /isCompleteDiaryListTrade/,
    "Bybit must not require BingX completeness for day-cache"
  );

  const bingxPolicy = read("js/trade/bingx/diary/policy.js");
  assert.match(
    bingxPolicy,
    /isCompleteDiaryListTrade/,
    "BingX day-cache requires complete list rows"
  );
});

test("shared trade-history fetch is a thin exchange-module facade", () => {
  const source = read("js/trade-markers-sandbox/trade-fetch.js");
  assert.match(source, /getLoadedTradeExchangeModules/);
  assert.match(source, /fetchTradeHistoryForSymbol/);
  assert.doesNotMatch(
    source,
    /skipExecutions|closedPnlForceRefresh|closedPnlEnrichOnFetch/
  );
  assert.doesNotMatch(
    source,
    /["']bingx["']|["']bybit["']/
  );

  const bybit = read("js/trade/bybit/history/fetch.js");
  assert.match(bybit, /getTradeDiaryDetail/);
  assert.match(bybit, /skipExecutions:\s*true/);
  assert.doesNotMatch(bybit, /trade\/bingx|exchangeId:\s*["']bingx["']/);

  const bingx = read("js/trade/bingx/history/fetch.js");
  assert.match(bingx, /skipExecutions:\s*true/);
  assert.match(bingx, /enrich:\s*true/);
  assert.doesNotMatch(bingx, /trade\/bybit|exchangeId:\s*["']bybit["']/);
});

test("BingX diary bind deps are complete", () => {
  const diary = read("desktop/trading/bingx-rest-diary.cjs");
  const rest = read("desktop/trading/bingx-rest.cjs");
  const required = [
    "signedRequest",
    "stripSymbolSuffix",
    "toBingxSymbol",
    "toCanonicalSymbol",
    "peekRateLimitBlock",
    "extractBingxList"
  ];
  for (const name of required) {
    assert.match(diary, new RegExp(`let ${name}\\s*=\\s*null`));
    assert.match(
      rest,
      new RegExp(`bindBingxDiaryDeps\\(\\{[\\s\\S]*\\b${name}\\b`)
    );
  }
  assert.match(diary, /\bpeekRateLimitBlock\s*\(/);
  assert.match(diary, /\bextractBingxList\s*\(/);
});

test("Bybit and BingX bundles export facade-required APIs", () => {
  const required = [
    "bootTradeDiaryPage",
    "mountTradeDiaryPeriodPicker",
    "initTradeVolumePresets",
    "getActiveTradeVolumeUsdt",
    "mountTradeLeverageControl",
    "initTradeLeverageSettings",
    "createTradeChartOrders",
    "mountTradeChartMarkersToggle",
    "initTradeChartExecutionMarkers",
    "openPnlShareModal",
    "applyPositionColumnLayout",
    "wirePositionColumnResize"
  ];
  for (const exchange of ["bybit", "bingx"]) {
    const source = read(`js/trade/${exchange}/bundle.js`);
    for (const name of required) {
      assert.match(
        source,
        new RegExp(`\\b${name}\\b`),
        `${exchange}/bundle.js must export ${name}`
      );
    }
  }
});

test("diary chart markers use detail open/close and side", () => {
  const source = read("js/trade-diary-chart.js");
  assert.match(source, /DIARY_CHART_BARS_EACH_SIDE\s*=\s*200/);
  assert.match(source, /candleAlignSec\(\s*entryMs/);
  assert.match(source, /candleAlignSec\(\s*exitMs/);
  assert.match(source, /markerTimesFromDetail/);
  assert.doesNotMatch(
    source,
    /markerTimesFromDetailFills|buys\[0\]\.execTimeMs\s*<=\s*sells/
  );
  assert.match(source, /detail\?\.side|trade\?\.side/);
  assert.match(source, /detail\?\.openTimeMs/);
});
