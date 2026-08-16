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
  const client = read("desktop/trading/algo-bot-session-log-remote-client.cjs");
  assert.doesNotMatch(client, /\?token=/);
  assert.match(client, /Authorization/);
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
