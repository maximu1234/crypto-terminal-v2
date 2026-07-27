#!/usr/bin/env node
/**
 * Standalone bot app uses its own checked-in site-bundle.
 * We intentionally do not pull files from the main Multichart app.
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
