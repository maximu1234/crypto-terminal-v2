import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("realtime DELETE of a worker claim is a fire, not a silent remove", () => {
  const realtime = src("js/alerts-cloud/polling-realtime.js");
  const delFn = realtime.slice(
    realtime.indexOf("async function handleAlertsRealtimeDelete"),
    realtime.indexOf("function handleAlertsRealtimeUpsert")
  );

  assert.match(delFn, /applyRemoteAlertFired/);
  assert.doesNotMatch(delFn, /applyRemoteAlertRemoved/);
  assert.doesNotMatch(delFn, /triggered_at/);

  const histFn = realtime.slice(
    realtime.indexOf("function handleAlertsRealtimeHistoryInsert"),
    realtime.indexOf("async function setupAlertsRealtime")
  );
  assert.match(histFn, /applyRemoteAlertFired/);
  assert.doesNotMatch(histFn, /applyRemoteAlertHistoryFromCloud/);
});

test("cloud pull does not treat a vanished row as a fire (manual delete vs worker)", () => {
  const sync = src("js/alerts-cloud/registry-sync.js");
  const chunk = sync.slice(
    sync.indexOf("if(removedRows.length)"),
    sync.indexOf("const local =")
  );
  assert.match(chunk, /applyRemoteAlertRemoved/);
  assert.doesNotMatch(chunk, /applyRemoteAlertFired/);
});

test("hydrate backfills price_alert_events history before registry reconcile", () => {
  const realtime = src("js/alerts-cloud/polling-realtime.js");
  const fn = realtime.slice(
    realtime.indexOf("export async function hydrateAlertsAfterAuth"),
    realtime.indexOf("export function initAlertsCloudSync")
  );
  const histAt = fn.indexOf("pullAlertHistoryFromCloud");
  const regAt = fn.indexOf("pullRegistryFromCloudNow");
  assert.ok(histAt >= 0, "history pull present");
  assert.ok(regAt >= 0, "registry pull present");
  assert.ok(
    histAt < regAt,
    "history must load before reconcile removes fired locals"
  );
  assert.doesNotMatch(
    fn.slice(0, histAt),
    /isAlertsPage\(\)\s*\{/
  );
});

test("algo reduced cloud still pulls alert history (no Active reconcile)", () => {
  const realtime = src("js/alerts-cloud/polling-realtime.js");
  const fn = realtime.slice(
    realtime.indexOf("export async function hydrateAlertsAfterAuth"),
    realtime.indexOf("export function initAlertsCloudSync")
  );
  const algoAt = fn.indexOf("isAlgoReducedCloudClient");
  assert.ok(algoAt >= 0);
  const afterAlgo = fn.slice(algoAt, algoAt + 900);
  assert.match(afterAlgo, /pullAlertHistoryFromCloud/);
  assert.doesNotMatch(afterAlgo, /pullRegistryFromCloudNow/);
});

test("worker history insert persists exchange_id from claimed alert", () => {
  const exec = src("alert-worker/lib/execute-trigger.js");
  const rowAt = exec.indexOf("const eventRow");
  assert.ok(rowAt >= 0, "eventRow present");
  const chunk = exec.slice(rowAt, rowAt + 900);
  assert.match(chunk, /exchange_id/);
  assert.match(chunk, /claimed\.exchange_id/);
  assert.match(chunk, /legacyRow/);
});

test("worker /delete-alert soft-deletes before any hard DELETE", () => {
  const api = src("alert-worker/lib/client-api.js");
  const fn = api.slice(
    api.indexOf("async function handleClientDeleteAlert"),
    api.indexOf("async function handleClientAdminPurgeAlertGarbage")
  );
  const body = fn.slice(fn.indexOf("let deleted"));
  const patchAt = body.indexOf("restPatchReturning");
  const deleteAt = body.indexOf("restDeleteReturning");
  assert.ok(patchAt >= 0, "soft PATCH present");
  assert.ok(deleteAt > patchAt, "hard DELETE is only a fallback after PATCH");
  assert.match(body, /deleted_at/);
});
