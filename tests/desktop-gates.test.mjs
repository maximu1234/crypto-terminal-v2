import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("desktop-ui-gate always requires a trusted UI URL", () => {
  const source = read("desktop/trading/desktop-ui-gate.cjs");
  assert.doesNotMatch(source, /useBundle\s*&&\s*\n\s*!isTrustedDesktopUiUrl/);
  assert.match(source, /!isTrustedDesktopUiUrl/);
  assert.match(source, /handleTrustedDesktopUi/);
  assert.match(source, /pageOrigin ===\s*\nlocalOrigin/);
  assert.match(source, /!localOrigin &&\s*\nisLoopbackHttpOrigin/);
});

test("trusted UI URL matches configured origin, not any localhost", () => {
  const requireGate = createRequire(
    path.join(ROOT, "desktop/trading/desktop-ui-gate.cjs")
  );
  const Module = requireGate("module");
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
    return originalLoad.apply(this, arguments);
  };
  let gate;
  try {
    gate = requireGate("./desktop-ui-gate.cjs");
  } finally {
    Module._load = originalLoad;
  }

  gate.configureDesktopUiGate({
    getLocalSiteOrigin: () => "http://127.0.0.1:47391"
  });
  assert.equal(
    gate.isTrustedDesktopUiUrl("http://127.0.0.1:47391/terminal.html"),
    true
  );
  assert.equal(
    gate.isTrustedDesktopUiUrl("http://127.0.0.1:9999/pwn.html"),
    false
  );
  assert.equal(
    gate.isTrustedDesktopUiUrl("http://localhost:47391/terminal.html"),
    false
  );
  assert.equal(
    gate.isTrustedDesktopUiUrl("https://example.com/"),
    false
  );
  assert.equal(
    gate.isTrustedDesktopUiUrl("multichart://ui/terminal.html"),
    true
  );

  gate.configureDesktopUiGate({
    getLocalSiteOrigin: () => null
  });
  assert.equal(
    gate.isTrustedDesktopUiUrl("http://127.0.0.1:9999/boot.html"),
    true
  );
  assert.equal(
    gate.isTrustedDesktopUiUrl("https://example.com/"),
    false
  );
});

test("auth-session IPC is gated like trading IPC", () => {
  const source = read("desktop/main.js");
  assert.match(source, /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"desktop:loadAuthSession"/);
  assert.match(source, /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"desktop:saveAuthSession"/);
  assert.match(source, /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"desktop:clearAuthSession"/);
});

test("algo session-log server defaults to loopback and header auth", () => {
  const source = read("desktop/trading/algo-bot-session-log-server.cjs");
  assert.match(source, /bindHost:\s*\n"127\.0\.0\.1"/);
  assert.doesNotMatch(source, /searchParams\.get\(\s*\n"token"/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin":\s*\n"\*"/);
  const corsFn = source.slice(
    source.indexOf("function corsHeaders"),
    source.indexOf("function sendJson")
  );
  assert.doesNotMatch(corsFn, /bindHost/);
  assert.match(corsFn, /127\\.0\\.0\\.1\|localhost\|\\\[::1\\\]/);
  const client = read("desktop/trading/algo-bot-session-log-remote-client.cjs");
  assert.doesNotMatch(client, /\?token=/);
  assert.match(client, /Authorization/);
});

test("chart snapshot IPC is gated and defaultName is basename-only", () => {
  const source = read("desktop/chart-snapshot.cjs");
  assert.match(source, /handleTrustedDesktopUi/);
  assert.match(source, /function safeSnapshotFileName/);
  assert.match(source, /path\.basename/);
  assert.doesNotMatch(source, /ipcMain\.handle\(\s*\n\s*"desktop:chartSnapshot/);
});

test("chart snapshot logo IPC is gated like snapshot IPC", () => {
  const source = read("desktop/chart-snapshot-logo.cjs");
  assert.match(source, /handleTrustedDesktopUi/);
  assert.match(
    source,
    /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"desktop:chartSnapshotLogoGet"/
  );
  assert.match(
    source,
    /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"desktop:chartSnapshotLogoPick"/
  );
  assert.doesNotMatch(source, /ipcMain\.handle\(\s*\n\s*"desktop:chartSnapshotLogo/);
  const main = read("desktop/main.js");
  assert.match(main, /registerChartSnapshotLogoIpc\(\{\s*\nhandleTrustedDesktopUi/);
});

test("site-protocol resolveBundleFile requires a path separator after root", () => {
  const source = read("desktop/site-protocol.cjs");
  assert.match(source, /rootWithSep/);
  assert.match(source, /normalized\.startsWith\(\s*\nrootWithSep/);
});

test("feature-nav off stops algo runtime resume", () => {
  const runtime = read("desktop/trading/algo-trading-runtime.cjs");
  assert.match(runtime, /feature-nav-prefs-store/);
  assert.match(runtime, /algoTradingNavEnabled/);
  const bot = read("desktop/trading/algo-trading-bot.cjs");
  assert.match(bot, /algo nav disabled/);
  const main = read("desktop/main.js");
  assert.match(main, /stopAlgoModulesForFeatureNavOff/);
  assert.match(main, /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"desktop:setFeatureNavPrefs"/);
});

test("screener overlay does not statically import Early T3 math", () => {
  const source = read("js/screener-pattern-overlay.js");
  assert.doesNotMatch(source, /from\s+"\.\/indicators\/pattern-12-early-t3-math/);
  assert.doesNotMatch(source, /pattern-12-scanner\.js/);
  assert.match(source, /import\(\s*\n"\.\/indicators\/pattern-12-early-t3-math\.js/);
});

test("public proxy settings omit the proxy password", () => {
  const source = read("desktop/app-proxy.cjs");
  assert.match(source, /hasPassword:/);
  assert.match(source, /password:\s*\n""/);
});

test("Bybit public WS IPC is gated like trading IPC", () => {
  const source = read("desktop/trading/bybit-public-ws.cjs");
  assert.match(source, /handleTrustedDesktopUi/);
  assert.match(
    source,
    /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"bybitPublic:setTopics"/
  );
  assert.match(
    source,
    /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"bybitPublic:probe"/
  );
  assert.match(
    source,
    /handleTrustedDesktopUi\(\s*\n\s*ipcMain,\s*\n\s*"bybitPublic:getTickers"/
  );
});

test("Vercel redirects diary index HTML to screener", () => {
  const vercel = JSON.parse(read("vercel.json"));
  const sources = (vercel.redirects || []).map((row) => row.source);
  assert.ok(sources.includes("/diary"));
  assert.ok(sources.includes("/diary/"));
  assert.ok(sources.includes("/diary/index.html"));
  assert.ok(sources.includes("/algo-trading.html"));
  const diaryHtml = read("diary/index.html");
  assert.doesNotMatch(diaryHtml, /href="\/script\.html"/);
});

test("asset-manifest check skips bot-app and requires files to exist", () => {
  const source = read("scripts/check-asset-manifest.cjs");
  assert.match(source, /"bot-app"/);
  assert.match(source, /manifest missing file/);
  assert.match(source, /supabase-env\.js/);
});

test("watchlist widget HTML escapes the symbol", () => {
  const source = read("js/watchlist.js");
  assert.match(source, /function escapeHtml\(/);
  assert.match(
    source,
    /screener-symbol">\$\{escapeHtml\(\s*fixedSymbol\s*\)\}/
  );
});

test("tray, launch-agent and script-favorites IPC is gated", () => {
  const main = read("desktop/main.js");
  for (const channel of [
    "desktop:updateMenuBarTray",
    "desktop:setMenuBarTrayVisible",
    "desktop:setMenuBarTrayPnlHidden",
    "desktop:getMenuBarAgentPrefs",
    "desktop:setLaunchAgentAtLogin",
    "desktop:importScriptFavorites",
    "desktop:loadScriptFavorites",
    "desktop:clearScriptFavorites"
  ]) {
    assert.match(
      main,
      new RegExp(
        `handleTrustedDesktopUi\\(\\s*\\n\\s*ipcMain,\\s*\\n\\s*"${channel}"`
      )
    );
    assert.doesNotMatch(
      main,
      new RegExp(`ipcMain\\.handle\\(\\s*\\n\\s*"${channel}"`)
    );
  }
});

test("site-header does not statically import script-terminal-status", () => {
  const source = read("js/site-header.js");
  assert.doesNotMatch(source, /from\s+"\.\/script-terminal-status/);
  assert.match(source, /import\(\s*\n"\.\/script-terminal-status\.js/);
  assert.match(source, /cryptoTerminalDesktop\?\.isDesktop/);
});

test("terminal Early T3 list and script status require desktop shell", () => {
  const source = read("js/terminal.js");
  const earlyT3 = source.slice(
    source.indexOf("async function syncTerminalAlgoEarlyT3List")
  );
  assert.match(earlyT3, /cryptoTerminalDesktop\?\.isDesktop/);
  assert.match(earlyT3, /isAlgoTradingNavEnabled/);
  assert.match(source, /algo-trading\/terminal-early-t3-list\.js/);
  assert.doesNotMatch(source, /from\s+"\.\/script-terminal-status/);
  assert.match(source, /import\(\s*\n"\.\/script-terminal-status\.js/);
});

test("algo bot shell UI requires desktop", () => {
  const source = read("js/auth-ui.js");
  const fn = source.slice(
    source.indexOf("function isAlgoBotShell"),
    source.indexOf("const ALGO_BOT_SYNC_OK_KEY")
  );
  assert.match(fn, /!isDesktopShell\(\)/);
});

