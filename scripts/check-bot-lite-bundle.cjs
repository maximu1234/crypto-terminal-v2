#!/usr/bin/env node
/**
 * Guard: Algo Bot site-bundle must keep lite layout (not Multichart chrome).
 * Catches accidental Multichart→bot overwrites of CSS / HTML / algo-trading.js.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const cssPath = path.join(ROOT, "bot-app/site-bundle/css/algo-trading.css");
const htmlPath = path.join(ROOT, "bot-app/site-bundle/algo-trading.html");
const jsPath = path.join(ROOT, "bot-app/site-bundle/js/algo-trading.js");

const REQUIRED_CSS_SELECTORS = [
  "body.algo-trading-page.algo-bot-lite-layout #algo-bot-main-grid",
  "body.algo-trading-page.algo-bot-lite-layout .algo-bot-grid-top",
  "body.algo-trading-page.algo-bot-lite-layout .algo-bot-lite-indicators",
  "body.algo-trading-page.algo-bot-lite-layout .algo-bot-lite-global-col",
  "body.algo-trading-page.algo-bot-lite-layout #charts-stack"
];

function fail(message) {
  console.error(`✗ bot-lite bundle check: ${message}`);
  process.exit(1);
}

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`missing file ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

const css = read(cssPath);
for (const selector of REQUIRED_CSS_SELECTORS) {
  if (!css.includes(selector)) {
    fail(`missing selector ${selector} in bot-app/site-bundle/css/algo-trading.css`);
  }
}

const html = read(htmlPath);
if (!/class="[^"]*algo-bot-lite-layout[^"]*"/.test(html)) {
  fail(
    "bot-app/site-bundle/algo-trading.html body missing algo-bot-lite-layout (Multichart overwrite?)"
  );
}
if (/href="\/screener\.html">Скринер</.test(html)) {
  fail(
    "bot HTML has full Multichart nav (Скринер…) — restore Algo Bot lite nav"
  );
}

const js = read(jsPath);
if (!js.includes("function mountAlgoBotLiteLayout(")) {
  fail(
    "bot-app/site-bundle/js/algo-trading.js missing mountAlgoBotLiteLayout (Multichart overwrite?)"
  );
}
if (!js.includes("mountAlgoBotLiteLayout();")) {
  fail("mountAlgoTradingPage must call mountAlgoBotLiteLayout()");
}
if (!js.includes("function isAlgoBotLiteMode(")) {
  fail("bot-app/site-bundle/js/algo-trading.js missing isAlgoBotLiteMode");
}

const logsViewerPath = path.join(
  ROOT,
  "bot-app/site-bundle/js/algo-trading/bot-session-logs-viewer.js"
);
const logsViewer = read(logsViewerPath);
if (/from\s+["'].*bot-remote-client/.test(logsViewer) || /import\s*\{[^}]*fetchLanBotStatus/.test(logsViewer)) {
  fail(
    "bot-session-logs-viewer.js looks like Multichart LAN viewer — restore Algo Bot stub (boot would fail)"
  );
}
if (!logsViewer.includes("Algo Bot stub")) {
  fail(
    "bot-app/site-bundle/js/algo-trading/bot-session-logs-viewer.js missing Algo Bot stub marker"
  );
}

const sceneCachePath = path.join(
  ROOT,
  "bot-app/site-bundle/js/algo-trading/pattern-12-scene-cache.js"
);
if (!fs.existsSync(sceneCachePath)) {
  fail("missing bot-app/site-bundle/js/algo-trading/pattern-12-scene-cache.js");
}

const jsDir = path.join(ROOT, "bot-app/site-bundle/js");
const importRe = /from\s+["'](\.[^"'?]+)(?:\?v=\d+)?["']/g;
let importMatch;
while ((importMatch = importRe.exec(js))) {
  const target = path.normalize(path.join(jsDir, importMatch[1]));
  if (!fs.existsSync(target)) {
    fail(`algo-trading.js imports missing ${importMatch[1]}`);
  }
}

console.log("✓ bot-lite bundle check OK");
