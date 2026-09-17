import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildBybitPnlShareTexts,
  createWebPnlShareCardApi,
  formatPnlSharePrice,
  formatPnlShareRoi,
  getBybitPnlLayoutSpec,
  normalizeBybitPnlSharePayload,
  resolveBybitPnlTemplatePath,
  scaleBybitPnlLayout
} from "../js/trade-web/pnl-share-card.js";
import {
  buildDiaryPayload
} from "../js/trade/bybit/pnl-share-modal.js";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("web PnL share formats match desktop Python cards", () => {
  assert.equal(formatPnlShareRoi(87.25), "+87.25%");
  assert.equal(formatPnlShareRoi(-12.88), "-12.88%");
  assert.equal(formatPnlShareRoi(0), "0.00%");
  assert.equal(formatPnlSharePrice(142.35, 2), "142.35");
  assert.equal(formatPnlSharePrice(0.06217, 5), "0.06217");
  assert.equal(formatPnlSharePrice(1.23, null), "1.23");
  assert.equal(formatPnlSharePrice(10, null), "10");
  assert.equal(formatPnlSharePrice(1, null), "1");
});

test("web PnL share Bybit templates exist in assets", () => {
  for (const name of [
    "bybit-pnl-template-positive.png",
    "bybit-pnl-template-negative.png",
    "bybit-pnl-diary-template-positive.png",
    "bybit-pnl-diary-template-negative.png"
  ]) {
    assert.equal(
      fs.existsSync(path.join(ROOT, "assets", name)),
      true,
      name
    );
  }
});

test("web PnL share picks Bybit templates by variant and ROI sign", () => {
  assert.equal(
    resolveBybitPnlTemplatePath({ variant: "position", roiPct: 1 }),
    "/assets/bybit-pnl-template-positive.png"
  );
  assert.equal(
    resolveBybitPnlTemplatePath({ variant: "position", roiPct: 0 }),
    "/assets/bybit-pnl-template-positive.png"
  );
  assert.equal(
    resolveBybitPnlTemplatePath({ variant: "position", roiPct: -0.01 }),
    "/assets/bybit-pnl-template-negative.png"
  );
  assert.equal(
    resolveBybitPnlTemplatePath({ variant: "diary", roiPct: -3 }),
    "/assets/bybit-pnl-diary-template-negative.png"
  );
});

test("web PnL share layout scales like desktop Python", () => {
  const spec = getBybitPnlLayoutSpec("position");
  const native = scaleBybitPnlLayout(
    spec.layout,
    960,
    1080,
    spec.refW,
    spec.refH
  );
  assert.equal(native.ticker_bl_x, 64);
  assert.equal(native.roi_bl_y, 520);
  assert.equal(native.roi_font, 102);
  const half = scaleBybitPnlLayout(
    spec.layout,
    480,
    540,
    spec.refW,
    spec.refH
  );
  assert.equal(half.ticker_bl_x, 32);
  assert.equal(half.badge_gap, 23);
});

test("web PnL share maps position payload to badge texts", () => {
  const texts = buildBybitPnlShareTexts({
    variant: "position",
    ticker: "solusdt",
    side: "long",
    leverage: 25,
    roiPct: 87.25,
    entryPrice: 142.35,
    marketPrice: 268.12,
    priceDecimals: 2
  });
  assert.equal(texts.ticker, "SOLUSDT");
  assert.equal(texts.badge, "Long 25x");
  assert.equal(texts.roi, "+87.25%");
  assert.equal(texts.entry, "142.35");
  assert.equal(texts.market, "268.12");
  assert.equal(texts.roiPositive, true);
});

test("web PnL share maps diary payload from Bybit modal", () => {
  const payload = buildDiaryPayload({
    symbol: "ETHUSDT",
    side: "Sell",
    avgEntryPrice: 3421.5,
    avgExitPrice: 3465.8,
    pnlPct: -12.88,
    leverage: 15
  });
  assert.equal(payload.variant, "diary");
  const texts = buildBybitPnlShareTexts(payload);
  assert.equal(texts.ticker, "ETHUSDT");
  assert.equal(texts.side, "short");
  assert.equal(texts.badge, "Short 15x");
  assert.equal(texts.roi, "-12.88%");
  assert.equal(texts.entry, "3421.50");
  assert.equal(texts.market, "3465.80");
  assert.match(texts.templatePath, /bybit-pnl-diary-template-negative/);
});

test("web PnL share normalizes short side and leverage floor", () => {
  const card = normalizeBybitPnlSharePayload({
    ticker: " btcusdt ",
    side: "short",
    leverage: 0,
    roiPct: "4.5",
    entryPrice: "1",
    marketPrice: "2"
  });
  assert.equal(card.ticker, "BTCUSDT");
  assert.equal(card.side, "short");
  assert.equal(card.leverage, 1);
  assert.equal(card.roiPct, 4.5);
});

test("web trading client generates PnL cards locally, not via Railway", () => {
  const client = read("js/trade-web/client.js");
  assert.match(client, /createWebPnlShareCardApi/);
  assert.match(client, /pnlShare\.generatePnlShareCard/);
  assert.doesNotMatch(client, /rpc\(\s*"generatePnlShareCard"/);
  assert.doesNotMatch(
    client,
    /generatePnlShareCard:\s*\(\)\s*=>\s*\n?\s*Promise\.resolve/
  );
  const rpc = read("alert-worker/lib/trade/rpc.js");
  assert.match(rpc, /case "generatePnlShareCard":/);
  assert.match(rpc, /desktopOnly\(\)/);
});

test("web trading shell stays isDesktop false", () => {
  const client = read("js/trade-web/client.js");
  assert.match(client, /isDesktop:\s*false/);
  assert.match(client, /webTrading:\s*true/);
  assert.doesNotMatch(client, /isDesktop:\s*true/);
});

test("web PnL share diary layout matches Python ref size", () => {
  const spec = getBybitPnlLayoutSpec("diary");
  assert.equal(spec.refW, 1323);
  assert.equal(spec.refH, 720);
  const native = scaleBybitPnlLayout(
    spec.layout,
    1323,
    720,
    spec.refW,
    spec.refH
  );
  assert.equal(native.ticker_bl_y, 249);
  assert.equal(native.filled_bl_x, 310);
  assert.equal(native.roi_bl_y, 443);
});

test("web PnL share save/discard without a generated card", async () => {
  const api = createWebPnlShareCardApi();
  const miss = await api.savePnlShareCard({
    tempPath: "missing-card",
    defaultName: "Share SOLUSDT.png"
  });
  assert.equal(miss.ok, false);
  assert.match(String(miss.error), /не найден/i);
  const drop = await api.discardPnlShareCard("missing-card");
  assert.equal(drop.ok, true);
});

test("web PnL compositor stays in trade-web and Bybit-only", () => {
  const src = read("js/trade-web/pnl-share-card.js");
  assert.match(src, /const cardStore = new Map/);
  assert.match(src, /canShareFiles/);
  assert.match(src, /prefersNativeShareSheet/);
  assert.doesNotMatch(src, /bingx/i);
  assert.doesNotMatch(src, /rpc\(/);
  const client = read("js/trade-web/client.js");
  assert.match(client, /WEB_PNL_SHARE_MARK/);
  assert.match(client, /existing\?\.trading\?\.\[WEB_PNL_SHARE_MARK\]/);
});
