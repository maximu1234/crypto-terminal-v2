import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(root, "js", "mobile");

function listJsFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => path.join(dir, name));
}

test("mobile modules do not import heavy terminal/screener/drawings/tablet", () => {
  const forbidden = [
    /from\s+["'].*\/terminal\.js/,
    /from\s+["'].*\/screener\.js/,
    /from\s+["'].*\/drawings\//,
    /from\s+["'].*drawings\.js/,
    /from\s+["'].*chart-tablet-gestures/,
    /from\s+["'].*tablet-widget-chart/,
    /from\s+["'].*trade-book-panel/,
    /from\s+["'].*trade-chart-overlay/
  ];
  for (const file of listJsFiles(mobileDir)) {
    const src = fs.readFileSync(file, "utf8");
    for (const re of forbidden) {
      assert.equal(
        re.test(src),
        false,
        `${path.basename(file)} must not match ${re}`
      );
    }
  }
});

test("mobile HTML pages exist", () => {
  assert.equal(fs.existsSync(path.join(root, "m-screener.html")), true);
  assert.equal(fs.existsSync(path.join(root, "m-terminal.html")), true);
});
