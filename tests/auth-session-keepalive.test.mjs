import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

test("auth refresh block does not strip refresh_token unless fatal", () => {
  const src = fs.readFileSync(
    path.join(root, "js/auth-storage.js"),
    "utf8"
  );
  const start = src.indexOf(
    "export function blockAuthRefreshUntil("
  );
  assert.ok(start >= 0);
  const body = src.slice(start, start + 900);
  assert.ok(
    body.includes("clearRefreshToken"),
    "must gate clearPersistedRefreshToken"
  );
  assert.ok(
    body.includes("options.clearRefreshToken ===\ntrue") ||
      body.includes("options.clearRefreshToken === true"),
    "clear only when explicitly requested"
  );
});

test("cloud-sync refreshes near expiry and keeps Multichart keepalive", () => {
  const src = fs.readFileSync(
    path.join(root, "js/cloud-sync.js"),
    "utf8"
  );
  assert.ok(src.includes("isAccessTokenNearExpiry"));
  assert.ok(src.includes("Standalone Algo Bot lite only"));
  assert.ok(
    !src.includes(
      "Algo Bot / Multichart Algo page: no Auth keepalive"
    )
  );
  const ka = src.indexOf("function bindAuthSessionKeepalive(");
  const kaBody = src.slice(ka, ka + 500);
  assert.ok(kaBody.includes("isAlgoBotLiteShell()"));
  assert.ok(!kaBody.includes("isAlgoReducedCloudClient()"));
  assert.ok(src.includes('fatal:\ntrue') || src.includes("fatal: true"));
  assert.ok(src.includes('fatal:\nfalse') || src.includes("fatal: false"));
  assert.ok(src.includes('"visibilitychange"'));
});

test("desktop auth restore heals primary without refresh_token", () => {
  const src = fs.readFileSync(
    path.join(root, "js/auth-storage.js"),
    "utf8"
  );
  const start = src.indexOf(
    "export async function restoreDesktopAuthSession("
  );
  const body = src.slice(start, start + 1600);
  assert.ok(body.includes("hasRefresh"));
  assert.ok(body.includes("primaryRaw"));
});
