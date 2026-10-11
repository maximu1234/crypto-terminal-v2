import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { computeContentHashes } = require("../scripts/asset-content-hash.cjs");

function hashes(entries) {
  return computeContentHashes(entries);
}

test("leaf token stays put when an unrelated file changes", () => {
  const leaf = { key: "leaf.js", body: "export const n = 1;\n" };
  const other = { key: "other.js", body: "export const n = 2;\n" };
  const first = hashes([leaf, other]);
  const second = hashes([
    leaf,
    { key: "other.js", body: "export const n = 3;\n" }
  ]);
  assert.equal(first["leaf.js"], second["leaf.js"]);
  assert.notEqual(first["other.js"], second["other.js"]);
});

test("importer token follows the imported file", () => {
  const leaf = { key: "leaf.js", body: "export const n = 1;\n" };
  const parent = {
    key: "parent.js",
    body: 'import { n } from "./leaf.js?v=1";\nexport const x = n;\n'
  };
  const first = hashes([leaf, parent]);
  const second = hashes([
    { key: "leaf.js", body: "export const n = 9;\n" },
    parent
  ]);
  assert.notEqual(first["leaf.js"], second["leaf.js"]);
  assert.notEqual(first["parent.js"], second["parent.js"]);
  assert.equal(hashes([leaf, parent])["parent.js"], first["parent.js"]);
});

test("a cycle moves together when one side changes", () => {
  const a = {
    key: "a.js",
    body: 'import { b } from "./b.js?v=1";\nexport const a = 1;\n'
  };
  const b = {
    key: "b.js",
    body: 'import { a } from "./a.js?v=1";\nexport const b = 1;\n'
  };
  const first = hashes([a, b]);
  const second = hashes([
    a,
    {
      key: "b.js",
      body: 'import { a } from "./a.js?v=1";\nexport const b = 2;\n'
    }
  ]);
  assert.notEqual(first["a.js"], second["a.js"]);
  assert.notEqual(first["b.js"], second["b.js"]);
});

test("manifest importers move when any other file changes", () => {
  const leaf = { key: "leaf.js", body: "export const n = 1;\n" };
  const boot = {
    key: "boot.js",
    body: 'import { ASSETS } from "./asset-manifest.js?v=1";\nexport const n = 1;\n'
  };
  const first = hashes([leaf, boot]);
  const second = hashes([
    { key: "leaf.js", body: "export const n = 2;\n" },
    boot
  ]);
  assert.notEqual(first["asset-manifest.js"], second["asset-manifest.js"]);
  assert.notEqual(first["boot.js"], second["boot.js"]);
  assert.equal(hashes([leaf, boot])["boot.js"], first["boot.js"]);
});
