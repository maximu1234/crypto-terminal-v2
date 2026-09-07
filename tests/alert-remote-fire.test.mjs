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
