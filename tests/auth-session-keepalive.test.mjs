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

test("auth refresh treats 429 as rate-limit not fatal strip", () => {
  const src = fs.readFileSync(
    path.join(root, "js/auth-storage.js"),
    "utf8"
  );
  assert.ok(src.includes("isRateLimitedAuthRefreshError"));
  assert.ok(src.includes("isLocalAuthRefreshBlockError"));
  const fatalStart = src.indexOf(
    "export function isFatalAuthRefreshError("
  );
  const fatalBody = src.slice(fatalStart, fatalStart + 1200);
  assert.ok(
    fatalBody.includes("isRateLimitedAuthRefreshError"),
    "fatal must exclude rate-limit"
  );
  assert.ok(
    fatalBody.includes("isLocalAuthRefreshBlockError"),
    "fatal must exclude local soft-block fake 401"
  );
  assert.ok(
    !/status ===\s*\n?400/.test(fatalBody) &&
      !fatalBody.includes("status ===\n400") &&
      !fatalBody.includes("status === 400"),
    "bare HTTP 400 must not be fatal (rotation race / cloak)"
  );
});

test("noteAuthRefreshHttpStatus never clears refresh_token", () => {
  const src = fs.readFileSync(
    path.join(root, "js/auth-storage.js"),
    "utf8"
  );
  const start = src.indexOf(
    "export function noteAuthRefreshHttpStatus("
  );
  assert.ok(start >= 0);
  const body = src.slice(start, start + 900);
  assert.ok(body.includes("clearRefreshToken"));
  assert.ok(
    body.includes("clearRefreshToken:\nfalse") ||
      body.includes("clearRefreshToken: false") ||
      /clearRefreshToken:\s*\nfalse/.test(body),
    "HTTP wrapper must not wipe refresh_token"
  );
  assert.ok(
    !body.includes("clearRefreshToken:\ntrue") &&
      !body.includes("clearRefreshToken: true"),
    "HTTP 400/401 must not clear token at fetch layer"
  );
});

test("cloud-sync circuit-breaks auth refresh and surfaces problem UI", () => {
  const src = fs.readFileSync(
    path.join(root, "js/cloud-sync.js"),
    "utf8"
  );
  assert.ok(src.includes("classifyAndBlockAuthRefreshFailure"));
  assert.ok(src.includes("mountCloudAuthProblemBanner"));
  assert.ok(src.includes("bindAlgoBotLiteAuthWatch"));
  assert.ok(src.includes("rateLimited"));
  assert.ok(src.includes("cloud-auth-problem-banner"));
  assert.ok(src.includes("isLocalAuthRefreshBlockError"));
  const classify = src.indexOf(
    "function classifyAndBlockAuthRefreshFailure("
  );
  const classifyBody = src.slice(classify, classify + 1800);
  assert.ok(
    classifyBody.includes("hasPersistedRefreshToken"),
    "fatal path must race-guard against rotated refresh"
  );
  const sync = src.indexOf("function syncCloudLoginFromStorage(");
  const syncBody = src.slice(sync, sync + 1200);
  assert.ok(syncBody.includes("isAlgoBotLiteShell()"));
  assert.ok(syncBody.includes("isAuthRefreshBlockedNow()"));
});

test("auth storage cloaks session while refresh blocked", () => {
  const src = fs.readFileSync(
    path.join(root, "js/auth-storage.js"),
    "utf8"
  );
  assert.ok(src.includes("cloakAuthSessionRawForRefreshBlock"));
  assert.ok(src.includes("noteAuthRefreshHttpStatus"));
});

test("supabase-client skips Auth client on Algo Bot lite", () => {
  const src = fs.readFileSync(
    path.join(root, "js/supabase-client.js"),
    "utf8"
  );
  assert.ok(src.includes("isAlgoBotLiteShell"));
  assert.ok(src.includes("ensureSupabaseSdk"));
  assert.ok(src.includes("authAwareFetch"));
  assert.ok(src.includes("noteAuthRefreshHttpStatus"));
});

test("cloud-auth problem banner is Algo Bot lite only", () => {
  const src = fs.readFileSync(
    path.join(root, "js/cloud-sync.js"),
    "utf8"
  );
  const start = src.indexOf("export function mountCloudAuthProblemBanner(");
  const body = src.slice(start, start + 700);
  assert.ok(body.includes("isAlgoBotLiteShell"));
  assert.ok(!src.includes("Бот не долбит Supabase Auth сам"));
});
