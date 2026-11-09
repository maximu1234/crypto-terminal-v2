#!/usr/bin/env node
/**
 * Sync Algo Bot site-bundle JS from Multichart `js/`.
 *
 * Overwrites files so the remote app tracks plugin architecture.
 * Never replaces bot-session-logs-viewer.js (Algo Bot stub).
 *
 * Walks HTML script tags + static/dynamic ESM imports from the algo boot graph.
 * Deletes bundle JS the walk no longer reaches. The logs-viewer stub stays.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC_JS = path.join(ROOT, "js");
const OUT_JS = path.join(ROOT, "bot-app/site-bundle/js");
const HTML = path.join(ROOT, "bot-app/site-bundle/algo-trading.html");
const STUB = path.join(OUT_JS, "algo-trading/bot-session-logs-viewer.js");

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

function collectJsImportNames(src) {
  const names = [];
  const re = /jsImport\s*\(\s*["']([^"']+)["']\s*\)/g;
  let m;
  while ((m = re.exec(src))) {
    const name = stripQuery(m[1]).replace(/^\.\//, "");
    if (name) names.push(name);
  }
  return names;
}

function htmlScriptFiles() {
  if (!fs.existsSync(HTML)) return [];
  const html = fs.readFileSync(HTML, "utf8");
  const files = [];
  const re = /(?:src|href)="\/js\/([^"?]+)(?:\?v=[0-9a-f]+)?"/g;
  let m;
  while ((m = re.exec(html))) {
    files.push(path.join(OUT_JS, m[1]));
  }
  return files;
}

function srcTwin(outFile) {
  return path.join(SRC_JS, path.relative(OUT_JS, outFile));
}

function sameFile(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.size !== sb.size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

const BUNDLE_ROOT = path.resolve(OUT_JS);
const STUB_RESOLVED = path.resolve(STUB);

function insideBundle(filePath) {
  const resolved = path.resolve(filePath);
  return resolved === BUNDLE_ROOT || resolved.startsWith(BUNDLE_ROOT + path.sep);
}

function seedFiles() {
  return [
    path.join(OUT_JS, "algo-trading-page-boot.js"),
    path.join(OUT_JS, "algo-trading.js"),
    ...htmlScriptFiles()
  ];
}

function listBundleJs(dir = OUT_JS, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) listBundleJs(full, acc);
    else if (/\.(js|mjs|cjs)$/.test(ent.name)) acc.push(path.resolve(full));
  }
  return acc;
}

function enqueueImports(filePath, queue) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const spec of collectSpecs(text)) {
    queue.push(resolveSpec(filePath, spec));
  }
  for (const name of collectJsImportNames(text)) {
    queue.push(path.join(OUT_JS, name));
  }
}

/**
 * Files the algo boot graph reaches. With copy:true, refresh them from js/
 * before reading imports. The logs-viewer stub is never overwritten.
 * @param {{ copy?: boolean }} [options]
 * @returns {{ seen: Set<string>, copied: string[], missingSrc: string[] }}
 */
function walkBundleGraph(options = {}) {
  const copy = !!options.copy;
  const copied = [];
  const missingSrc = [];
  const queue = seedFiles();
  const seen = new Set();

  while (queue.length) {
    const filePath = path.resolve(queue.pop());
    if (seen.has(filePath)) continue;
    seen.add(filePath);
    if (!insideBundle(filePath)) continue;

    const frozen = filePath === STUB_RESOLVED;
    const src = srcTwin(filePath);

    if (copy && !frozen && fs.existsSync(src) && fs.statSync(src).isFile()) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (!sameFile(src, filePath)) {
        fs.copyFileSync(src, filePath);
        copied.push(path.relative(OUT_JS, filePath));
      }
    } else if (!fs.existsSync(filePath)) {
      if (!frozen) missingSrc.push(path.relative(OUT_JS, filePath));
      continue;
    }

    if (!fs.statSync(filePath).isFile()) continue;
    if (!/\.(js|mjs|cjs)$/.test(filePath)) continue;
    enqueueImports(filePath, queue);
  }

  return { seen, copied, missingSrc };
}

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) pruneEmptyDirs(path.join(dir, ent.name));
  }
  if (path.resolve(dir) !== BUNDLE_ROOT && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
  }
}

function pruneUnreachable(seen) {
  const keep = new Set(seen);
  keep.add(STUB_RESOLVED);
  const removed = [];
  for (const file of listBundleJs()) {
    if (keep.has(file)) continue;
    fs.unlinkSync(file);
    removed.push(path.relative(OUT_JS, file));
  }
  pruneEmptyDirs(OUT_JS);
  return removed;
}

function reachableBundleJs() {
  return walkBundleGraph({ copy: false }).seen;
}

function syncBundleJs() {
  const { seen, copied, missingSrc } = walkBundleGraph({ copy: true });
  const removed = pruneUnreachable(seen);
  if (copied.length) {
    console.log(`sync-bot-lite-js-graph: synced ${copied.length} file(s)`);
    for (const rel of copied.sort()) console.log(`  ~ ${rel}`);
  } else {
    console.log("sync-bot-lite-js-graph: JS already in sync");
  }
  if (removed.length) {
    console.log(`sync-bot-lite-js-graph: removed ${removed.length} unreachable file(s)`);
    for (const rel of removed.sort()) console.log(`  - ${rel}`);
  }
  if (missingSrc.length) {
    console.error("sync-bot-lite-js-graph: not in Multichart js/:\n" + missingSrc.join("\n"));
    process.exit(1);
  }
}

module.exports = {
  reachableBundleJs,
  listBundleJs,
  STUB_RESOLVED
};

if (require.main === module) {
  syncBundleJs();
}
