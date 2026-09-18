/**
 * Trade diary journal files in userData — one JSON per exchange.
 * Names: trade-diary-journal-bybit.json, trade-diary-journal-bingx.json
 */
const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function normalizeExchangeId(exchangeId) {
  const id = String(exchangeId || "")
    .trim()
    .toLowerCase();
  return id === "bingx" ? "bingx" : "bybit";
}

function fileNameForExchange(exchangeId) {
  return `trade-diary-journal-${normalizeExchangeId(exchangeId)}.json`;
}

function storePath(exchangeId) {
  return path.join(app.getPath("userData"), fileNameForExchange(exchangeId));
}

function readText(exchangeId) {
  const ex = normalizeExchangeId(exchangeId);
  const filePath = storePath(ex);

  try {
    if (!fs.existsSync(filePath)) {
      return {
        ok: true,
        exists: false,
        exchangeId: ex,
        fileName: fileNameForExchange(ex),
        filePath,
        text: ""
      };
    }
    const text = fs.readFileSync(filePath, "utf8");
    return {
      ok: true,
      exists: true,
      exchangeId: ex,
      fileName: fileNameForExchange(ex),
      filePath,
      text: String(text || "")
    };
  } catch (err) {
    return {
      ok: false,
      exists: false,
      exchangeId: ex,
      fileName: fileNameForExchange(ex),
      filePath,
      text: "",
      message: err?.message || String(err)
    };
  }
}

function writeText(exchangeId, text) {
  const ex = normalizeExchangeId(exchangeId);
  const filePath = storePath(ex);

  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, String(text || ""), "utf8");
    return {
      ok: true,
      exchangeId: ex,
      fileName: fileNameForExchange(ex),
      filePath
    };
  } catch (err) {
    return {
      ok: false,
      exchangeId: ex,
      fileName: fileNameForExchange(ex),
      filePath,
      message: err?.message || String(err)
    };
  }
}

module.exports = {
  normalizeExchangeId,
  fileNameForExchange,
  storePath,
  readText,
  writeText
};
