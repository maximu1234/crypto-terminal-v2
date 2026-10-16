import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("canonical release marker is js/release-marker.js (no desktop duplicate)", () => {
  assert.equal(
    existsSync(join(root, "desktop/release-marker.js")),
    false,
    "desktop/release-marker.js must not exist — use js/release-marker.js only"
  );
  const marker = readFileSync(join(root, "js/release-marker.js"), "utf8");
  assert.match(marker, /export const METKA_NUMBER/);
  assert.match(marker, /export const DESKTOP_APP_VERSION/);
});

test("desktop package.json version matches DESKTOP_APP_VERSION", async () => {
  const pkg = JSON.parse(
    readFileSync(join(root, "desktop/package.json"), "utf8")
  );
  const { DESKTOP_APP_VERSION } = await import(
    "../js/release-marker.js"
  );
  assert.equal(pkg.version, DESKTOP_APP_VERSION);
});
