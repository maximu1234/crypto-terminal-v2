/**
 * Trade diary journal — per-exchange trade snapshots + comments.
 * Desktop: file via IPC. Web: localStorage (after upload / for comments).
 */
import {
  formatDiaryDateTime,
  formatDiaryPct,
  formatDiaryUsd,
  sideLabel
} from "./trade-diary-format.js?v=6";

export const DIARY_JOURNAL_KIND = "multichart-trade-diary";
export const DIARY_JOURNAL_VERSION = 1;
export const DIARY_COMMENT_MAX_LEN = 120;

const STORAGE_KEY = "trade_diary_journal_v1";

/** @type {Map<string, { kind: string, version: number, exchangeId: string, updatedAt: string, trades: Record<string, object> }>} */
const memory = new Map();

/** @type {Set<string>} */
const loaded = new Set();

function normalizeExchangeId(exchangeId) {
  return exchangeId === "bingx" ? "bingx" : "bybit";
}

function desktopApi() {
  return window.cryptoTerminalDesktop?.diaryJournal;
}

function isDesktopJournal() {
  const api = desktopApi();
  return !!(api && typeof api.read === "function" && typeof api.write === "function");
}

function emptyDoc(exchangeId) {
  return {
    kind: DIARY_JOURNAL_KIND,
    version: DIARY_JOURNAL_VERSION,
    exchangeId: normalizeExchangeId(exchangeId),
    updatedAt: new Date().toISOString(),
    trades: {}
  };
}

function safeParse(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readWebRoot() {
  try {
    return safeParse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeWebRoot(root) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
  } catch {
    /* quota */
  }
}

function normalizeComment(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, DIARY_COMMENT_MAX_LEN);
}

export function diaryTradeIdentityKey(trade) {
  const sym = String(trade?.symbol || "").toUpperCase();
  const oid = String(trade?.orderId || "").trim();
  if (sym && oid) {
    return `id:${sym}:${oid}`;
  }
  const closeMs = trade?.listCloseTimeMs ?? trade?.closeTimeMs;
  return `t:${trade?.symbol || ""}-${closeMs || 0}-${trade?.orderId || ""}`;
}

function parseTradeId(tradeId) {
  const id = String(tradeId || "");
  if (id.startsWith("id:")) {
    const rest = id.slice(3);
    const colon = rest.indexOf(":");
    if (colon > 0) {
      return {
        symbol: rest.slice(0, colon).toUpperCase(),
        orderId: rest.slice(colon + 1)
      };
    }
  }
  if (id.startsWith("t:")) {
    const body = id.slice(2);
    const lastDash = body.lastIndexOf("-");
    const midDash = body.lastIndexOf("-", lastDash - 1);
    if (midDash > 0 && lastDash > midDash) {
      return {
        symbol: body.slice(0, midDash).toUpperCase(),
        orderId: body.slice(lastDash + 1)
      };
    }
  }
  return { symbol: "", orderId: "" };
}

function snapshotFromTrade(trade, prevComment = "") {
  const tradeId = diaryTradeIdentityKey(trade);
  const closeTimeMs = Number(trade?.listCloseTimeMs ?? trade?.closeTimeMs) || 0;
  return {
    tradeId,
    symbol: String(trade?.symbol || "").toUpperCase(),
    orderId: String(trade?.orderId || "").trim(),
    closeTimeMs,
    dateTime: formatDiaryDateTime(closeTimeMs),
    pnlUsd: Number(trade?.pnlUsd) || 0,
    pnlPct: Number(trade?.pnlPct) || 0,
    commissionUsd: Number(trade?.commissionUsd) || 0,
    side: String(trade?.side || ""),
    sideLabel: sideLabel(trade?.side),
    comment: normalizeComment(prevComment)
  };
}

function coerceDoc(raw, exchangeId) {
  const ex = normalizeExchangeId(exchangeId);
  if (!raw || typeof raw !== "object") {
    return emptyDoc(ex);
  }
  const trades = {};
  const src = raw.trades;
  if (src && typeof src === "object" && !Array.isArray(src)) {
    for (const [key, row] of Object.entries(src)) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const tradeId = String(row.tradeId || key || "").trim();
      if (!tradeId) {
        continue;
      }
      trades[tradeId] = {
        tradeId,
        symbol: String(row.symbol || "").toUpperCase(),
        orderId: String(row.orderId || "").trim(),
        closeTimeMs: Number(row.closeTimeMs) || 0,
        dateTime: String(row.dateTime || ""),
        pnlUsd: Number(row.pnlUsd) || 0,
        pnlPct: Number(row.pnlPct) || 0,
        commissionUsd: Number(row.commissionUsd) || 0,
        side: String(row.side || ""),
        sideLabel: String(row.sideLabel || sideLabel(row.side)),
        comment: normalizeComment(row.comment)
      };
    }
  } else if (Array.isArray(src)) {
    for (const row of src) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const tradeId = String(row.tradeId || "").trim();
      if (!tradeId) {
        continue;
      }
      trades[tradeId] = {
        tradeId,
        symbol: String(row.symbol || "").toUpperCase(),
        orderId: String(row.orderId || "").trim(),
        closeTimeMs: Number(row.closeTimeMs) || 0,
        dateTime: String(row.dateTime || ""),
        pnlUsd: Number(row.pnlUsd) || 0,
        pnlPct: Number(row.pnlPct) || 0,
        commissionUsd: Number(row.commissionUsd) || 0,
        side: String(row.side || ""),
        sideLabel: String(row.sideLabel || sideLabel(row.side)),
        comment: normalizeComment(row.comment)
      };
    }
  }
  return {
    kind: DIARY_JOURNAL_KIND,
    version: DIARY_JOURNAL_VERSION,
    exchangeId: ex,
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    trades
  };
}

async function persistDoc(exchangeId, doc) {
  const ex = normalizeExchangeId(exchangeId);
  doc.updatedAt = new Date().toISOString();
  memory.set(ex, doc);

  const exportable = {
    kind: doc.kind,
    version: doc.version,
    exchangeId: doc.exchangeId,
    updatedAt: doc.updatedAt,
    trades: Object.values(doc.trades).sort(
      (a, b) => Number(b.closeTimeMs) - Number(a.closeTimeMs)
    )
  };
  const text = `${JSON.stringify(exportable, null, 2)}\n`;

  if (isDesktopJournal()) {
    try {
      await desktopApi().write(ex, text);
    } catch {
      /* ignore */
    }
    return;
  }

  const root = readWebRoot();
  root[ex] = exportable;
  writeWebRoot(root);
}

export async function ensureDiaryJournalLoaded(exchangeId) {
  const ex = normalizeExchangeId(exchangeId);
  if (loaded.has(ex) && memory.has(ex)) {
    return memory.get(ex);
  }

  if (isDesktopJournal()) {
    try {
      const result = await desktopApi().read(ex);
      if (result?.ok && result.text) {
        const parsed = safeParse(result.text);
        const doc = coerceDoc(parsed, ex);
        memory.set(ex, doc);
        loaded.add(ex);
        return doc;
      }
    } catch {
      /* fall through */
    }
    const doc = emptyDoc(ex);
    memory.set(ex, doc);
    loaded.add(ex);
    return doc;
  }

  const root = readWebRoot();
  const doc = coerceDoc(root[ex], ex);
  memory.set(ex, doc);
  loaded.add(ex);
  return doc;
}

function getDocSync(exchangeId) {
  const ex = normalizeExchangeId(exchangeId);
  return memory.get(ex) || emptyDoc(ex);
}

export function getDiaryJournalComment(exchangeId, tradeOrId) {
  const ex = normalizeExchangeId(exchangeId);
  const doc = getDocSync(ex);
  const tradeId =
    typeof tradeOrId === "string"
      ? tradeOrId
      : diaryTradeIdentityKey(tradeOrId);
  return normalizeComment(doc.trades[tradeId]?.comment);
}

export async function setDiaryJournalComment(exchangeId, tradeOrId, text) {
  const ex = normalizeExchangeId(exchangeId);
  await ensureDiaryJournalLoaded(ex);
  const doc = getDocSync(ex);
  const tradeId =
    typeof tradeOrId === "string"
      ? tradeOrId
      : diaryTradeIdentityKey(tradeOrId);
  const prev = doc.trades[tradeId];
  const comment = normalizeComment(text);
  if (prev) {
    doc.trades[tradeId] = { ...prev, comment };
  } else if (typeof tradeOrId === "object" && tradeOrId) {
    doc.trades[tradeId] = snapshotFromTrade(tradeOrId, comment);
  } else {
    const parsed = parseTradeId(tradeId);
    doc.trades[tradeId] = {
      tradeId,
      symbol: parsed.symbol,
      orderId: parsed.orderId,
      closeTimeMs: 0,
      dateTime: "",
      pnlUsd: 0,
      pnlPct: 0,
      commissionUsd: 0,
      side: "",
      sideLabel: "",
      comment
    };
  }
  await persistDoc(ex, doc);
}

/**
 * Append / refresh trade snapshots from exchange load without wiping comments.
 */
export async function upsertDiaryJournalTrades(exchangeId, trades) {
  const ex = normalizeExchangeId(exchangeId);
  await ensureDiaryJournalLoaded(ex);
  const doc = getDocSync(ex);
  let changed = false;

  for (const trade of trades || []) {
    const tradeId = diaryTradeIdentityKey(trade);
    if (!tradeId || tradeId === "t:--0-" || tradeId === "t:-0-") {
      continue;
    }
    const prev = doc.trades[tradeId];
    const next = snapshotFromTrade(trade, prev?.comment || "");
    if (!prev) {
      doc.trades[tradeId] = next;
      changed = true;
      continue;
    }
    const same =
      prev.symbol === next.symbol &&
      prev.closeTimeMs === next.closeTimeMs &&
      prev.pnlUsd === next.pnlUsd &&
      prev.pnlPct === next.pnlPct &&
      prev.commissionUsd === next.commissionUsd &&
      prev.side === next.side;
    if (!same) {
      doc.trades[tradeId] = { ...next, comment: prev.comment || "" };
      changed = true;
    }
  }

  if (changed) {
    await persistDoc(ex, doc);
  }
  return doc;
}

export function buildDiaryJournalExportDoc(exchangeId) {
  const ex = normalizeExchangeId(exchangeId);
  const doc = getDocSync(ex);
  return {
    kind: DIARY_JOURNAL_KIND,
    version: DIARY_JOURNAL_VERSION,
    exchangeId: ex,
    exportedAt: new Date().toISOString(),
    trades: Object.values(doc.trades).sort(
      (a, b) => Number(b.closeTimeMs) - Number(a.closeTimeMs)
    )
  };
}

export function serializeDiaryJournalJson(exchangeId) {
  return `${JSON.stringify(buildDiaryJournalExportDoc(exchangeId), null, 2)}\n`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serializeDiaryJournalExcelXml(exchangeId) {
  const doc = buildDiaryJournalExportDoc(exchangeId);
  const headers = [
    "Тикер",
    "Дата/Время",
    "PnL $",
    "PnL %",
    "Com. $",
    "Long/Short",
    "Комментарий"
  ];
  const rows = doc.trades.map((row) => [
    row.symbol,
    row.dateTime || formatDiaryDateTime(row.closeTimeMs),
    formatDiaryUsd(row.pnlUsd),
    formatDiaryPct(row.pnlPct),
    formatDiaryUsd(row.commissionUsd),
    row.sideLabel || sideLabel(row.side),
    row.comment || ""
  ]);

  const sheetRows = [headers, ...rows]
    .map(
      (cells) =>
        `<Row>${cells
          .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell)}</Data></Cell>`)
          .join("")}</Row>`
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Diary">
<Table>
${sheetRows}
</Table>
</Worksheet>
</Workbook>
`;
}

/**
 * Validate import payload. Does not mutate store.
 * @returns {{ ok: true, doc: object } | { ok: false, message: string }}
 */
export function validateDiaryJournalImport(raw, expectedExchangeId) {
  const expected = normalizeExchangeId(expectedExchangeId);
  const parsed = typeof raw === "string" ? safeParse(raw) : raw;

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "Файл дневника повреждён или пуст" };
  }
  if (parsed.kind !== DIARY_JOURNAL_KIND) {
    return {
      ok: false,
      message: "Это не файл дневника Multichart"
    };
  }
  const version = Number(parsed.version);
  if (!Number.isFinite(version) || version < 1 || version > DIARY_JOURNAL_VERSION) {
    return { ok: false, message: "Неподдерживаемая версия файла дневника" };
  }
  const fileExchange = normalizeExchangeId(parsed.exchangeId);
  if (fileExchange !== expected) {
    return {
      ok: false,
      message: `Файл от биржи ${fileExchange}, сейчас открыта ${expected}`
    };
  }
  if (!Array.isArray(parsed.trades) && !(parsed.trades && typeof parsed.trades === "object")) {
    return { ok: false, message: "В файле нет списка сделок" };
  }

  return { ok: true, doc: coerceDoc(parsed, expected) };
}

export async function replaceDiaryJournalFromImport(exchangeId, raw) {
  const ex = normalizeExchangeId(exchangeId);
  const check = validateDiaryJournalImport(raw, ex);
  if (!check.ok) {
    return check;
  }
  loaded.add(ex);
  await persistDoc(ex, check.doc);
  return { ok: true, doc: check.doc, count: Object.keys(check.doc.trades).length };
}

export function listDiaryJournalTradesInPeriod(exchangeId, startMs, endMs) {
  const ex = normalizeExchangeId(exchangeId);
  const doc = getDocSync(ex);
  const start = Number(startMs) || 0;
  const end = Number(endMs) || Number.MAX_SAFE_INTEGER;
  return Object.values(doc.trades)
    .filter((row) => {
      const t = Number(row.closeTimeMs) || 0;
      return t >= start && t <= end;
    })
    .sort((a, b) => Number(b.closeTimeMs) - Number(a.closeTimeMs));
}

/** Convert journal row → diary trade shape for list paint. */
export function diaryJournalRowToTrade(row) {
  const parsed = parseTradeId(row.tradeId);
  return {
    symbol: row.symbol || parsed.symbol,
    orderId: row.orderId || parsed.orderId,
    closeTimeMs: Number(row.closeTimeMs) || 0,
    listCloseTimeMs: Number(row.closeTimeMs) || 0,
    openTimeMs: Number(row.closeTimeMs) || 0,
    durationMs: 0,
    pnlUsd: Number(row.pnlUsd) || 0,
    pnlPct: Number(row.pnlPct) || 0,
    commissionUsd: Number(row.commissionUsd) || 0,
    side: row.side || "",
    fromJournal: true
  };
}

/** Test helper — clear in-memory cache. */
export function _resetDiaryJournalMemoryForTests() {
  memory.clear();
  loaded.clear();
}
