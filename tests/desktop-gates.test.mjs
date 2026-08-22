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

test("desktop-ui-gate always requires a trusted UI URL", () => {
  const source = read("desktop/trading/desktop-ui-gate.cjs");
  assert.doesNotMatch(source, /useBundle\s*&&\s*\n\s*!isTrustedDesktopUiUrl/);
  assert.match(source, /!isTrustedDesktopUiUrl/);
  assert.match(source, /handleTrustedDesktopUi/);
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

test("asset-manifest check skips bot-app", () => {
  const source = read("scripts/check-asset-manifest.cjs");
  assert.match(source, /"bot-app"/);
});
