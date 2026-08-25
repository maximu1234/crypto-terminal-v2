#!/usr/bin/env node
/**
 * Sync standalone Algo Bot from Multichart plugin + engine.
 *
 * Source of truth:
 *   js/algo-trading/**, js/algo-trading.js, css/algo-trading*.css,
 *   algo-trading.html (panels/modals), desktop/trading/algo-*.cjs
 *
 * Frozen in bot-app:
 *   lite chrome (nav), bot-session-logs-viewer.js stub,
 *   Electron shell (main/preload/platform).
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DESKTOP_TRADING = path.join(ROOT, "desktop/trading");
const BOT_TRADING = path.join(ROOT, "bot-app/trading");
const SRC_CSS = path.join(ROOT, "css");
const BOT_CSS = path.join(ROOT, "bot-app/site-bundle/css");
const SRC_HTML = path.join(ROOT, "algo-trading.html");
const BOT_HTML = path.join(ROOT, "bot-app/site-bundle/algo-trading.html");

const PROXY_FILES = [
  "app-proxy.cjs",
  "app-proxy-config.cjs",
  "app-proxy-socks-relay.cjs"
];

const LITE_HEADER = `<header id="header" class="app-page-header">

<a href="/algo-trading.html?botLite=1" id="logo" aria-label="Multichart Algo Bot"><img src="/icons/brand-logo.png" alt="" width="32" height="32" class="site-logo-img" decoding="async"></a>

<nav class="menu app-header-nav" id="app-header-nav">
<a href="/algo-trading.html?botLite=1">АлгоБот</a>
<div class="header-settings-wrap" id="header-settings-wrap">
<button type="button" class="header-settings-btn" id="header-settings-btn" title="Вход и синхронизация" aria-label="Настройки" aria-expanded="false" aria-haspopup="true">
<svg class="header-settings-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.75"/><path fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0 1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l-.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
</button>
<div class="header-settings-dropdown hidden" id="header-settings-dropdown" role="menu">
<p class="header-settings-section-title">Аккаунт</p>
<div id="cloud-settings-mount"></div>
<div id="algo-session-log-server-mount" class="algo-session-log-server-mount" hidden></div>
</div>
</div>
</nav>

</header>`;

function copyFileIfChanged(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    try {
      if (fs.readFileSync(src).equals(fs.readFileSync(dest))) return false;
    } catch {
      /* copy */
    }
  }
  fs.copyFileSync(src, dest);
  return true;
}

function syncEngines() {
  const names = fs.readdirSync(DESKTOP_TRADING).filter(
    (name) => name.startsWith("algo-") && name.endsWith(".cjs")
  );
  let n = 0;
  for (const name of names) {
    if (copyFileIfChanged(
      path.join(DESKTOP_TRADING, name),
      path.join(BOT_TRADING, name)
    )) {
      n += 1;
      console.log(`  ~ trading/${name}`);
    }
  }
  console.log(`sync-bot-lite: engine ${n} file(s)`);
}

function syncProxyHelpers() {
  let n = 0;
  for (const name of PROXY_FILES) {
    const src = path.join(ROOT, "desktop", name);
    const dest = path.join(ROOT, "bot-app", name);
    if (!fs.existsSync(src)) continue;
    if (copyFileIfChanged(src, dest)) {
      n += 1;
      console.log(`  ~ ${name}`);
    }
  }
  console.log(`sync-bot-lite: proxy helpers ${n} file(s)`);
}

function syncCssFromHtml(html) {
  fs.mkdirSync(BOT_CSS, { recursive: true });
  const re = /href="\/css\/([^"?]+)(?:\?v=\d+)?"/g;
  let n = 0;
  let m;
  while ((m = re.exec(html))) {
    const name = m[1];
    const src = path.join(SRC_CSS, name);
    const dest = path.join(BOT_CSS, name);
    if (!fs.existsSync(src)) continue;
    if (copyFileIfChanged(src, dest)) {
      n += 1;
      console.log(`  ~ css/${name}`);
    }
  }
  console.log(`sync-bot-lite: css ${n} file(s)`);
}

function syncHtml() {
  let html = fs.readFileSync(SRC_HTML, "utf8");
  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    "<title>АлгоБот — Multichart</title>"
  );
  html = html.replace(
    /<body class="terminal-page algo-trading-page"/,
    '<body class="terminal-page algo-trading-page algo-bot-lite-layout"'
  );
  html = html.replace(
    /<header id="header" class="app-page-header">[\s\S]*?<\/header>/,
    LITE_HEADER
  );
  html = html.replace(
    /\n?<link rel="preconnect" href="https:\/\/cdn\.jsdelivr\.net"[^>]*>\n?/g,
    "\n"
  );
  html = html.replace(
    /\n?<link rel="preload" href="\/vendor\/lightweight-charts[^>]*>\n?/g,
    "\n"
  );
  html = html.replace(
    /\n?<link rel="modulepreload" href="\/js\/charts-lib-boot\.js[^>]*>\n?/g,
    "\n"
  );
  if (!html.includes("algo-bot-lite-layout")) {
    throw new Error("lite body class missing after HTML transform");
  }
  if (/href="\/screener\.html">Скринер</.test(html)) {
    throw new Error("HTML transform left Multichart nav");
  }
  fs.mkdirSync(path.dirname(BOT_HTML), { recursive: true });
  fs.writeFileSync(BOT_HTML, html);
  console.log("sync-bot-lite: wrote lite algo-trading.html");
  return html;
}

function runGraphSync() {
  execFileSync(
    process.execPath,
    [path.join(__dirname, "sync-bot-lite-js-graph.cjs")],
    { cwd: ROOT, stdio: "inherit" }
  );
}

const html = syncHtml();
syncCssFromHtml(html);
syncEngines();
syncProxyHelpers();
runGraphSync();
console.log("sync-bot-lite: done");
