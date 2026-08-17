#!/usr/bin/env node
/**
 * Standalone Algo Bot — frozen site-bundle.
 *
 * Does NOT auto-copy from Multichart `js/` / `css/` / HTML (frozen lite chrome).
 * Data panel / Supertrend / «Подобрать для всех» / setup-search copies must stay
 * in sync with Multichart — copy manually, keep lite nav + bot-session-logs stub.
 * Engine fixes that must stay in sync: copy manually from desktop/trading/:
 *   algo-bot-store.cjs, algo-bot-order-executor.cjs, algo-bot-session-log.cjs, algo-bot-session-log-server.cjs, algo-bot-session-log-remote-client.cjs, algo-bot-auth-transfer.cjs, algo-trading-bot.cjs,
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
try {
  require("child_process").execFileSync(
    process.execPath,
    [path.join(__dirname, "..", "..", "scripts", "sync-bot-lite-js-graph.cjs")],
    { cwd: path.join(__dirname, "..", ".."), stdio: "inherit" }
  );
} catch (err) {
  process.exit(err.status || 1);
}
console.log(
  "bundle-site: sync checklist — algo-bot-store / order-executor / session-log / algo-trading-bot from desktop/trading when engine changes"
);
