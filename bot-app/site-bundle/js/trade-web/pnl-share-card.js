/**
 * Web Bybit PnL share card — canvas compositor using the same PNG
 * templates as desktop Python (scripts/generate-bybit-pnl-*.py).
 * Desktop .app keeps IPC + Pillow; this module is web-only.
 */

const POSITION_REF_W = 960;
const POSITION_REF_H = 1080;
const DIARY_REF_W = 1323;
const DIARY_REF_H = 720;

const FONT_STACK = "Arial, Helvetica, sans-serif";

const COLOR_WHITE = "#ffffff";
const COLOR_ROI_POS = "rgb(0, 192, 135)";
const COLOR_ROI_NEG = "rgb(246, 66, 75)";
const COLOR_LONG_TEXT = "rgb(32, 178, 108)";
const COLOR_SHORT_TEXT = "rgb(255, 94, 102)";
const COLOR_LONG_PILL = "rgba(0, 200, 120, 0.145)";
const COLOR_SHORT_PILL = "rgba(200, 60, 80, 0.145)";

const POSITION_LAYOUT = {
  ticker_font: 60.5,
  ticker_tracking: -4,
  ticker_bl_x: 64,
  ticker_bl_y: 300,
  badge_gap: 45,
  badge_pill_y: 246,
  badge_pill_h: 60,
  badge_pill_radius: 12,
  badge_pill_pad_x: 26,
  badge_text_pad_left: 14,
  badge_text_y: 266,
  badge_font: 30,
  roi_font: 102,
  roi_bl_x: 62,
  roi_bl_y: 520,
  entry_bl_x: 61,
  entry_bl_y: 706,
  market_bl_x: 61,
  market_bl_y: 850,
  price_font: 48.5,
  price_tracking: -2
};

const DIARY_LAYOUT = {
  ticker_font: 60.5,
  ticker_tracking: -4,
  ticker_bl_x: 61,
  ticker_bl_y: 249,
  badge_gap: 45,
  badge_pill_y_offset: -54,
  badge_pill_h: 60,
  badge_pill_radius: 12,
  badge_pill_pad_x: 26,
  badge_text_pad_left: 14,
  badge_text_y_offset: -34,
  badge_font: 30,
  roi_font: 102,
  roi_bl_x: 64,
  roi_bl_y: 443,
  entry_bl_x: 62,
  entry_bl_y: 593,
  filled_bl_x: 310,
  filled_bl_y: 593,
  price_font: 48.5,
  price_tracking: -2
};

const SX_KEYS = new Set([
  "badge_gap",
  "badge_pill_pad_x",
  "badge_pill_h",
  "badge_pill_radius",
  "badge_text_pad_left"
]);

const templateCache = new Map();
const cardStore = new Map();

export function formatPnlSharePrice(value, decimals) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return "0";
  }
  if (!Number.isInteger(decimals)) {
    const text = num.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    return text || "0";
  }
  return num.toFixed(decimals);
}

export function formatPnlShareRoi(value) {
  const num = Number(value) || 0;
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(2)}%`;
}

export function normalizeBybitPnlSharePayload(payload) {
  const raw = payload && typeof payload === "object" ? payload : {};
  const leverageNum = Number(raw.leverage);
  const decimals = raw.priceDecimals;
  return {
    variant: raw.variant === "diary" ? "diary" : "position",
    ticker: String(raw.ticker || "").trim().toUpperCase(),
    side: String(raw.side || "").toLowerCase() === "short" ? "short" : "long",
    leverage: Math.max(
      1,
      Number.isFinite(leverageNum) ? Math.round(leverageNum) : 1
    ),
    roiPct: Number(raw.roiPct) || 0,
    entryPrice: Number(raw.entryPrice) || 0,
    marketPrice: Number(raw.marketPrice) || 0,
    priceDecimals: Number.isInteger(decimals) ? decimals : null
  };
}

export function resolveBybitPnlTemplatePath(payload) {
  const card = normalizeBybitPnlSharePayload(payload);
  const tone = card.roiPct >= 0 ? "positive" : "negative";
  if (card.variant === "diary") {
    return `/assets/bybit-pnl-diary-template-${tone}.png`;
  }
  return `/assets/bybit-pnl-template-${tone}.png`;
}

export function getBybitPnlLayoutSpec(variant) {
  if (variant === "diary") {
    return {
      layout: DIARY_LAYOUT,
      refW: DIARY_REF_W,
      refH: DIARY_REF_H
    };
  }
  return {
    layout: POSITION_LAYOUT,
    refW: POSITION_REF_W,
    refH: POSITION_REF_H
  };
}

export function scaleBybitPnlLayout(layout, width, height, refW, refH) {
  const sx = width / refW;
  const sy = height / refH;
  const out = {};
  for (const [key, val] of Object.entries(layout)) {
    if (key.endsWith("_font")) {
      out[key] = Math.max(8, Number(val) * sx);
    } else if (key.endsWith("_tracking")) {
      out[key] = val;
    } else if (SX_KEYS.has(key)) {
      out[key] = Math.max(1, Math.round(val * sx));
    } else if (key.endsWith("_x") || key.endsWith("_bl_x")) {
      out[key] = Math.round(val * sx);
    } else {
      out[key] = Math.round(val * sy);
    }
  }
  return out;
}

export function buildBybitPnlShareTexts(payload) {
  const card = normalizeBybitPnlSharePayload(payload);
  return {
    variant: card.variant,
    ticker: card.ticker,
    side: card.side,
    leverage: card.leverage,
    badge: `${card.side === "long" ? "Long" : "Short"} ${card.leverage}x`,
    roi: formatPnlShareRoi(card.roiPct),
    roiPositive: card.roiPct >= 0,
    entry: formatPnlSharePrice(card.entryPrice, card.priceDecimals),
    market: formatPnlSharePrice(card.marketPrice, card.priceDecimals),
    templatePath: resolveBybitPnlTemplatePath(card)
  };
}

function setFont(ctx, size, bold) {
  ctx.font = `${bold ? "bold" : "normal"} ${size}px ${FONT_STACK}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function fontSizePx(ctx) {
  const match = String(ctx.font || "").match(/([\d.]+)px/);
  return match ? Number(match[1]) : 16;
}

function trackingGap(ctx, tracking) {
  return (Number(tracking) || 0) * fontSizePx(ctx) / 1000;
}

function glyphInk(metrics, size) {
  return {
    left: Number.isFinite(metrics.actualBoundingBoxLeft)
      ? metrics.actualBoundingBoxLeft
      : 0,
    right: Number.isFinite(metrics.actualBoundingBoxRight)
      ? metrics.actualBoundingBoxRight
      : metrics.width,
    ascent: Number.isFinite(metrics.actualBoundingBoxAscent)
      ? metrics.actualBoundingBoxAscent
      : size * 0.8,
    descent: Number.isFinite(metrics.actualBoundingBoxDescent)
      ? metrics.actualBoundingBoxDescent
      : size * 0.2,
    width: metrics.width
  };
}

function measureInk(ctx, text, tracking) {
  const size = fontSizePx(ctx);
  const gap = trackingGap(ctx, tracking);
  if (!text) {
    return { left: 0, right: 0, width: 0, ascent: 0, descent: 0 };
  }
  let x = 0;
  let minLeft = Infinity;
  let maxRight = -Infinity;
  let maxAscent = 0;
  let maxDescent = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ink = glyphInk(ctx.measureText(text[i]), size);
    minLeft = Math.min(minLeft, x - ink.left);
    maxRight = Math.max(maxRight, x + ink.right);
    maxAscent = Math.max(maxAscent, ink.ascent);
    maxDescent = Math.max(maxDescent, ink.descent);
    x += ink.width + (i < text.length - 1 ? gap : 0);
  }
  return {
    left: minLeft,
    right: maxRight,
    width: maxRight - minLeft,
    ascent: maxAscent,
    descent: maxDescent
  };
}

function drawTrackedText(ctx, originX, originY, text, tracking) {
  const gap = trackingGap(ctx, tracking);
  let x = originX;
  for (let i = 0; i < text.length; i += 1) {
    ctx.fillText(text[i], x, originY);
    x += ctx.measureText(text[i]).width + (i < text.length - 1 ? gap : 0);
  }
}

function drawTextVisualBl(ctx, blX, blY, text, tracking, fill) {
  if (!text) {
    return measureInk(ctx, "", 0);
  }
  ctx.fillStyle = fill;
  const ink = measureInk(ctx, text, tracking);
  const originX = blX - ink.left;
  const originY = blY - ink.descent;
  drawTrackedText(ctx, originX, originY, text, tracking);
  return ink;
}

function fillRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
  ctx.fill();
}

function drawBadge(ctx, textLeft, side, leverage, lay, pillTop, textTop) {
  const isLong = side === "long";
  const label = `${isLong ? "Long" : "Short"} ${leverage}x`;
  setFont(ctx, lay.badge_font, false);
  const ink = measureInk(ctx, label, 0);
  const pillLeft = textLeft - lay.badge_text_pad_left;
  const pillW = ink.width + lay.badge_pill_pad_x;
  const pillH = lay.badge_pill_h;
  ctx.fillStyle = isLong ? COLOR_LONG_PILL : COLOR_SHORT_PILL;
  fillRoundRect(
    ctx,
    pillLeft,
    pillTop,
    pillW,
    pillH,
    lay.badge_pill_radius
  );
  ctx.fillStyle = isLong ? COLOR_LONG_TEXT : COLOR_SHORT_TEXT;
  drawTrackedText(
    ctx,
    textLeft - ink.left,
    textTop + ink.ascent,
    label,
    0
  );
}

async function ensureFonts() {
  const fonts = globalThis.document?.fonts;
  if (!fonts?.load) {
    return;
  }
  try {
    await Promise.race([
      Promise.all([
        fonts.load(`bold 60px ${FONT_STACK}`),
        fonts.load(`normal 30px ${FONT_STACK}`),
        fonts.load(`bold 102px ${FONT_STACK}`),
        fonts.load(`bold 48px ${FONT_STACK}`)
      ]),
      new Promise((resolve) => {
        setTimeout(resolve, 400);
      })
    ]);
  } catch {
    /* system fallback */
  }
}

function loadTemplateImage(src) {
  const hit = templateCache.get(src);
  if (hit) {
    return Promise.resolve(hit);
  }
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("Не удалось сгенерировать бейдж"));
      return;
    }
    const img = new Image();
    const fail = () => {
      reject(new Error("Не удалось загрузить шаблон бейджа"));
    };
    img.onload = () => {
      const finish = () => {
        templateCache.set(src, img);
        resolve(img);
      };
      if (typeof img.decode === "function") {
        img.decode().then(finish).catch(finish);
        return;
      }
      finish();
    };
    img.onerror = fail;
    img.src = src;
  });
}

export async function renderBybitPnlShareCardDataUrl(payload) {
  const card = normalizeBybitPnlSharePayload(payload);
  await ensureFonts();
  const img = await loadTemplateImage(resolveBybitPnlTemplatePath(card));
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) {
    throw new Error("Не удалось загрузить шаблон бейджа");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Не удалось сгенерировать бейдж");
  }
  ctx.drawImage(img, 0, 0, width, height);

  const spec = getBybitPnlLayoutSpec(card.variant);
  const lay = scaleBybitPnlLayout(
    spec.layout,
    width,
    height,
    spec.refW,
    spec.refH
  );

  setFont(ctx, lay.ticker_font, true);
  const tickerInk = drawTextVisualBl(
    ctx,
    lay.ticker_bl_x,
    lay.ticker_bl_y,
    card.ticker,
    lay.ticker_tracking,
    COLOR_WHITE
  );
  const badgeTextLeft = lay.ticker_bl_x + tickerInk.width + lay.badge_gap;
  const pillTop =
    card.variant === "diary"
      ? lay.ticker_bl_y + lay.badge_pill_y_offset
      : lay.badge_pill_y;
  const badgeTextTop =
    card.variant === "diary"
      ? lay.ticker_bl_y + lay.badge_text_y_offset
      : lay.badge_text_y;
  drawBadge(
    ctx,
    badgeTextLeft,
    card.side,
    card.leverage,
    lay,
    pillTop,
    badgeTextTop
  );

  setFont(ctx, lay.roi_font, true);
  drawTextVisualBl(
    ctx,
    lay.roi_bl_x,
    lay.roi_bl_y,
    formatPnlShareRoi(card.roiPct),
    0,
    card.roiPct >= 0 ? COLOR_ROI_POS : COLOR_ROI_NEG
  );

  setFont(ctx, lay.price_font, true);
  drawTextVisualBl(
    ctx,
    lay.entry_bl_x,
    lay.entry_bl_y,
    formatPnlSharePrice(card.entryPrice, card.priceDecimals),
    lay.price_tracking,
    COLOR_WHITE
  );
  const marketX =
    card.variant === "diary" ? lay.filled_bl_x : lay.market_bl_x;
  const marketY =
    card.variant === "diary" ? lay.filled_bl_y : lay.market_bl_y;
  drawTextVisualBl(
    ctx,
    marketX,
    marketY,
    formatPnlSharePrice(card.marketPrice, card.priceDecimals),
    lay.price_tracking,
    COLOR_WHITE
  );

  try {
    return canvas.toDataURL("image/png");
  } catch {
    throw new Error("Не удалось сгенерировать бейдж");
  }
}

function safeDownloadName(name) {
  const raw = String(name || "pnl-share.png")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .trim();
  const base = raw || "pnl-share.png";
  return /\.png$/i.test(base) ? base : `${base}.png`;
}

function dataUrlToBlob(dataUrl) {
  const parts = String(dataUrl || "").split(",");
  const mime =
    (/data:([^;]+)/.exec(parts[0] || "") || [])[1] || "image/png";
  const binary = atob(parts[1] || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 4000);
}

function canShareFiles(file) {
  try {
    return Boolean(
      typeof navigator !== "undefined" &&
        navigator.canShare?.({ files: [file] })
    );
  } catch {
    return false;
  }
}

function prefersNativeShareSheet() {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  return (
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && Number(navigator.maxTouchPoints) > 1)
  );
}

function makeShareFile(blob, fileName) {
  try {
    return new File([blob], fileName, { type: "image/png" });
  } catch {
    return null;
  }
}

async function shareOrDownload(blob, fileName) {
  const file = makeShareFile(blob, fileName);
  const shouldShare =
    file &&
    typeof navigator.share === "function" &&
    (canShareFiles(file) || prefersNativeShareSheet());
  if (shouldShare) {
    try {
      await navigator.share({
        files: [file],
        title: fileName
      });
      return { ok: true };
    } catch (err) {
      if (err?.name === "AbortError") {
        return { ok: false, canceled: true };
      }
    }
  }
  triggerDownload(blob, fileName);
  return { ok: true };
}

export function createWebPnlShareCardApi() {
  return {
    async generatePnlShareCard(payload) {
      try {
        const dataUrl = await renderBybitPnlShareCardDataUrl(payload);
        const tempPath = `web-pnl-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;
        cardStore.set(tempPath, { dataUrl });
        return {
          ok: true,
          tempPath,
          dataUrl
        };
      } catch (err) {
        return {
          ok: false,
          error: String(err?.message || err || "Не удалось сгенерировать бейдж")
        };
      }
    },

    async savePnlShareCard(payload) {
      const tempPath =
        typeof payload === "string" ? payload : payload?.tempPath;
      const fileName = safeDownloadName(
        typeof payload === "object" ? payload?.defaultName : ""
      );
      const rec = cardStore.get(tempPath);
      if (!rec?.dataUrl) {
        return {
          ok: false,
          error: "Временный файл не найден"
        };
      }
      try {
        const blob = dataUrlToBlob(rec.dataUrl);
        const result = await shareOrDownload(blob, fileName);
        if (result?.ok) {
          cardStore.delete(tempPath);
        }
        return result;
      } catch (err) {
        return {
          ok: false,
          error: String(err?.message || err || "Не удалось сохранить")
        };
      }
    },

    async discardPnlShareCard(tempPath) {
      const key =
        typeof tempPath === "string" ? tempPath : tempPath?.tempPath;
      if (key) {
        cardStore.delete(key);
      }
      return { ok: true };
    }
  };
}
