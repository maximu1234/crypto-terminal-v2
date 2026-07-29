#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const cssPath = path.join(ROOT, "bot-app/site-bundle/css/algo-trading.css");

const REQUIRED_SELECTORS = [
  "body.algo-trading-page.algo-bot-lite-layout #algo-bot-main-grid",
  "body.algo-trading-page.algo-bot-lite-layout .algo-bot-grid-top",
  "body.algo-trading-page.algo-bot-lite-layout .algo-bot-lite-indicators",
  "body.algo-trading-page.algo-bot-lite-layout .algo-bot-lite-global-col"
];

function fail(message) {
  console.error(`✗ bot-lite bundle check: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(cssPath)) {
  fail(`missing file ${cssPath}`);
}

const css = fs.readFileSync(cssPath, "utf8");

for (const selector of REQUIRED_SELECTORS) {
  if (!css.includes(selector)) {
    fail(`missing selector ${selector} in bot-app/site-bundle/css/algo-trading.css`);
  }
}

console.log("✓ bot-lite bundle check OK");
