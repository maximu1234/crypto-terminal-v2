import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("Algo Bot lite loads candle history for RSI overview / fit", () => {
  const page = read("js/algo-trading.js");
  assert.match(page, /loadAlgoBotLiteHistory/);
  assert.match(page, /\[algo-trading\] lite history/);
  const helper = read("js/algo-trading/lite-history.js");
  assert.match(helper, /fetchKlineHistoryDeep/);
  assert.match(helper, /loadMarketHistory/);
  const botPage = read("bot-app/site-bundle/js/algo-trading.js");
  assert.match(botPage, /loadAlgoBotLiteHistory/);
});

test("Algo Bot lite exposes analysis timeframe without a chart", () => {
  const layout = read("js/algo-trading/lite-layout.js");
  assert.doesNotMatch(layout, /tfBar\.hidden\s*=\s*true/);
  const css = read("css/algo-trading.css");
  assert.doesNotMatch(
    css.replace(/\s+/g, ""),
    /#algo-tf-bar\{[^}]*display:none/
  );
  const html = read("algo-trading.html");
  assert.match(html, /id="algo-rsi-flip-chart-tf"/);
  const page = read("js/algo-trading.js");
  assert.match(page, /algo-rsi-flip-chart-tf/);
});

test("Algo Bot kline history IPC is exposed like linear symbols", () => {
  for (const rel of [
    "desktop/trading/algo-trading-ipc.cjs",
    "bot-app/trading/algo-trading-ipc.cjs"
  ]) {
    const src = read(rel);
    assert.match(src, /desktop:algoTradingFetchKlineHistory/);
    assert.match(src, /fetchKlineHistoryDeep/);
  }
  for (const rel of ["desktop/preload.js", "bot-app/preload.js"]) {
    const src = read(rel);
    assert.match(src, /fetchKlineHistoryDeep:\s*\(/);
    assert.match(src, /desktop:algoTradingFetchKlineHistory/);
  }
});
