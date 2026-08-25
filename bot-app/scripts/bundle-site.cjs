#!/usr/bin/env node
/**
 * Standalone Algo Bot — frozen site-bundle.
 *
 * Overwrites plugin JS / CSS / HTML panels and desktop/trading/algo-*.cjs
 * from Multichart (scripts/sync-bot-lite-from-multichart.cjs).
 * Frozen: lite nav, bot-session-logs-viewer.js stub, Electron shell.
 * Terminal trading IPC is disabled in bot-app/main.js + preload stubs.
 */
const fs =
require("fs");
const path =
require("path");

const OUT =
path.join(__dirname, "..", "site-bundle");

if(!fs.existsSync(OUT)){
  console.error("site-bundle is missing:", OUT);
  process.exit(1);
}

console.log("bundle-site: standalone bundle kept", OUT);
try {
  require("child_process").execFileSync(
    process.execPath,
    [path.join(__dirname, "..", "..", "scripts", "sync-bot-lite-from-multichart.cjs")],
    { cwd: path.join(__dirname, "..", ".."), stdio: "inherit" }
  );
} catch (err) {
  process.exit(err.status || 1);
}
console.log(
  "bundle-site: plugin+engine synced from Multichart (lite nav + logs stub kept)"
);
