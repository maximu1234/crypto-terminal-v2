#!/usr/bin/env node
/**
 * Fill holes in Algo Bot site-bundle JS from Multichart `js/`.
 *
 * Copies ONLY missing files (never overwrites lite patches).
 * Never replaces bot-session-logs-viewer.js stub.
 *
 * Walks HTML script tags + static/dynamic ESM imports from the algo boot graph.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC_JS = path.join(ROOT, "js");
const OUT_JS = path.join(ROOT, "bot-app/site-bundle/js");
const HTML = path.join(ROOT, "bot-app/site-bundle/algo-trading.html");
const STUB = path.join(OUT_JS, "algo-trading/bot-session-logs-viewer.js");

const NEVER_OVERWRITE = new Set([STUB]);

function stripQuery(spec) {
  return String(spec || "").replace(/[?#].*$/, "");
}

function resolveSpec(fromFile, spec) {
  return path.normalize(path.join(path.dirname(fromFile), stripQuery(spec)));
}

function collectSpecs(src) {
  const specs = [];
  const res = [
    /(?:import|export)\s*\{[^}]*\}\s*from\s*["'](\.[^"']+)["']/g,
    /export\s*\*\s*from\s*["'](\.[^"']+)["']/g,
    /(?:import|export)\s+[^'"\n]*from\s*["'](\.[^"']+)["']/g,
    /import\s*\(\s*["'](\.[^"']+)["']\s*\)/g
  ];
  for (const re of res) {
    let m;
    while ((m = re.exec(src))) specs.push(m[1]);
  }
  return specs;
}

function htmlScriptFiles() {
  if (!fs.existsSync(HTML)) return [];
  const html = fs.readFileSync(HTML, "utf8");
  const files = [];
  const re = /(?:src|href)="\/js\/([^"?]+)(?:\?v=\d+)?"/g;
  let m;
  while ((m = re.exec(html))) {
    files.push(path.join(OUT_JS, m[1]));
  }
  return files;
}

function srcTwin(outFile) {
  return path.join(SRC_JS, path.relative(OUT_JS, outFile));
}

const copied = [];
const missingSrc = [];
const queue = [
  path.join(OUT_JS, "algo-trading-page-boot.js"),
  path.join(OUT_JS, "algo-trading.js"),
  ...htmlScriptFiles()
];
const seen = new Set();

while (queue.length) {
  const filePath = queue.pop();
  if (seen.has(filePath)) continue;
  seen.add(filePath);
  if (!filePath.startsWith(OUT_JS)) continue;

  if (!fs.existsSync(filePath)) {
    if (NEVER_OVERWRITE.has(filePath)) continue;
    const src = srcTwin(filePath);
    if (fs.existsSync(src) && fs.statSync(src).isFile()) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.copyFileSync(src, filePath);
      copied.push(path.relative(OUT_JS, filePath));
    } else {
      missingSrc.push(path.relative(OUT_JS, filePath));
      continue;
    }
  }

  if (!fs.statSync(filePath).isFile()) continue;
  if (!/\.(js|mjs|cjs)$/.test(filePath)) continue;

  const src = fs.readFileSync(filePath, "utf8");
  for (const spec of collectSpecs(src)) {
    queue.push(resolveSpec(filePath, spec));
  }
}

if (copied.length) {
  console.log(`sync-bot-lite-js-graph: copied ${copied.length} missing file(s)`);
  for (const rel of copied.sort()) console.log(`  + ${rel}`);
} else {
  console.log("sync-bot-lite-js-graph: no missing JS files");
}

if (missingSrc.length) {
  console.error("sync-bot-lite-js-graph: not in Multichart js/:\n" + missingSrc.join("\n"));
  process.exit(1);
}
