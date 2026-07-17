import test from "node:test";
import assert from "node:assert/strict";

const {
  hasAuthCallbackInUrl,
  isCloudAuthError
} = await import("../js/cloud-sync.js");

test("hasAuthCallbackInUrl detects hash/search auth payloads", () => {
  assert.equal(
    hasAuthCallbackInUrl("https://app.local/#access_token=abc&type=recovery"),
    true
  );
  assert.equal(
    hasAuthCallbackInUrl("https://app.local/#error=access_denied"),
    true
  );
  assert.equal(
    hasAuthCallbackInUrl("https://app.local/?code=oauth-code"),
    true
  );
  assert.equal(hasAuthCallbackInUrl("https://app.local/screener"), false);
  assert.equal(hasAuthCallbackInUrl("not a url"), false);
});

test("isCloudAuthError matches JWT / session failures", () => {
  assert.equal(isCloudAuthError("JWT expired"), true);
  assert.equal(isCloudAuthError("PGRST301"), true);
  assert.equal(isCloudAuthError("Auth session missing"), true);
  assert.equal(isCloudAuthError("network timeout"), false);
  assert.equal(isCloudAuthError(null, "invalid jwt"), true);
});
