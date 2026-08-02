#!/usr/bin/env node
/**
 * Standalone Algo Bot — frozen site-bundle.
 *
 * Intentionally does NOT copy from Multichart `js/` / `css/` / HTML.
 * Engine fixes that must stay in sync: copy manually from desktop/trading/:
 *   algo-bot-store.cjs, algo-bot-order-executor.cjs, algo-trading-bot.cjs,
 *   algo-bot-pattern-engine.cjs (and related algo-*-rest/ws as needed).
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
console.log(
  "bundle-site: sync checklist — algo-bot-store / order-executor / algo-trading-bot from desktop/trading when engine changes"
);
