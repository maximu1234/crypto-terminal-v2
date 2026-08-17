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
if (!html.includes('id="algo-bots-btn"') || !html.includes('id="algo-bot-run"')) {
  fail("bot HTML missing new topbar (Боты / Запустить) — copy from Multichart");
}
if (html.includes('id="algo-bot-st1-run"')) {
  fail("bot HTML still has old per-strategy Запустить buttons");
}
if (!html.includes('id="algo-bot-settings-modal"')) {
  fail("bot HTML missing algo-bot-settings-modal");
}
if (!html.includes("algo-stats-supertrend-filter")) {
  fail("bot HTML missing Supertrend Data panel — copy #algo-stats-panel from Multichart");
}
if (!html.includes("Подобрать для всех") || !html.includes("data-algo-optimize-universe")) {
  fail("bot HTML missing «Подобрать для всех» — copy optimize-universe buttons from Multichart");
}
if (!html.includes('id="algo-optimize-universe-modal"') || !html.includes('id="algo-optimize-modal"')) {
  fail("bot HTML missing optimize modals — copy from Multichart");
}
if (html.includes('id="algo-tp-ema"')) {
  fail("bot HTML still has old TP→EMA Data panel");
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

const botChartIndicators = read(
  path.join(ROOT, "bot-app/site-bundle/js/chart-indicators.js")
);
if (!botChartIndicators.includes("function renderIndicatorSettingsInline(")) {
  fail(
    "bot chart-indicators.js missing renderIndicatorSettingsInline (lite Pattern 1-2 settings pane)"
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

function namedFromRe() {
  return /(?:import|export)\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g;
}

function starFromRe() {
  return /export\s*\*\s*from\s*["'](\.[^"']+)["']/g;
}

function localExportRe() {
  return /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)/g;
}

function stripQuery(spec) {
  return spec.replace(/\?v=\d+$/, "");
}

function resolveSpec(fromFile, spec) {
  return path.normalize(path.join(path.dirname(fromFile), stripQuery(spec)));
}

function parseExportList(inner) {
  return inner
    .split(",")
    .map((part) => part.replace(/\/\/.*$/, "").trim())
    .filter(Boolean)
    .map((part) => {
      const bits = part.split(/\s+as\s+/);
      return {
        source: bits[0].trim(),
        exported: (bits[1] || bits[0]).trim()
      };
    });
}

const exportCache = new Map();

function collectModuleExports(filePath, stack = []) {
  const cached = exportCache.get(filePath);
  if (cached) return cached;
  if (stack.includes(filePath)) return new Set();
  if (!fs.existsSync(filePath)) return new Set();

  const src = fs.readFileSync(filePath, "utf8");
  const names = new Set();
  exportCache.set(filePath, names);
  const nextStack = stack.concat(filePath);

  let m;
  const localRe = localExportRe();
  while ((m = localRe.exec(src))) names.add(m[1]);

  const namedRe = namedFromRe();
  while ((m = namedRe.exec(src))) {
    if (!m[0].trim().startsWith("export")) continue;
    const target = resolveSpec(filePath, m[2]);
    const targetExports = collectModuleExports(target, nextStack);
    for (const item of parseExportList(m[1])) {
      if (targetExports.has(item.source)) names.add(item.exported);
    }
  }

  const starRe = starFromRe();
  while ((m = starRe.exec(src))) {
    const target = resolveSpec(filePath, m[1]);
    for (const name of collectModuleExports(target, nextStack)) {
      names.add(name);
    }
  }

  const localExportBlock = /export\s*\{([^}]+)\}\s*;/g;
  while ((m = localExportBlock.exec(src))) {
    for (const item of parseExportList(m[1])) names.add(item.exported);
  }

  return names;
}

function checkBootGraphNamedExports() {
  const bootFiles = [
    path.join(jsDir, "algo-trading-page-boot.js"),
    path.join(jsDir, "algo-trading.js")
  ];
  const htmlPath = path.join(ROOT, "bot-app/site-bundle/algo-trading.html");
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const htmlJs = /(?:src|href)="\/js\/([^"?]+)(?:\?v=\d+)?"/g;
    let hm;
    while ((hm = htmlJs.exec(html))) {
      bootFiles.push(path.join(jsDir, hm[1]));
    }
  }
  const queue = [...bootFiles];
  const seen = new Set();
  const missing = [];

  while (queue.length) {
    const filePath = queue.pop();
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    if (!fs.existsSync(filePath)) {
      missing.push(`missing ${path.relative(jsDir, filePath)}`);
      continue;
    }
    const src = fs.readFileSync(filePath, "utf8");
    let m;
    const namedRe = namedFromRe();
    while ((m = namedRe.exec(src))) {
      const target = resolveSpec(filePath, m[2]);
      queue.push(target);
      const exp = collectModuleExports(target);
      const rel = path.relative(jsDir, filePath);
      for (const item of parseExportList(m[1])) {
        if (!exp.has(item.source)) {
          missing.push(`${rel} needs ${item.source} from ${stripQuery(m[2])}`);
        }
      }
    }
    const starRe = starFromRe();
    while ((m = starRe.exec(src))) {
      queue.push(resolveSpec(filePath, m[1]));
    }
    const sideRe = /(?:import|export)\s+[^'"\n]*from\s+["'](\.[^"']+)["']/g;
    while ((m = sideRe.exec(src))) {
      queue.push(resolveSpec(filePath, m[1]));
    }
    const dynRe = /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g;
    while ((m = dynRe.exec(src))) {
      queue.push(resolveSpec(filePath, m[1]));
    }
  }

  if (missing.length) {
    fail(`boot graph export mismatch:\n${missing.join("\n")}`);
  }
}

checkBootGraphNamedExports();

console.log("✓ bot-lite bundle check OK");
