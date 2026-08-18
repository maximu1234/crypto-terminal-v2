/**
 * Книга per-ticker параметров для бота.
 *
 * Слои:
 * 1) Черновик optimize-universe (modal-results-storage) — можно перезаписывать.
 * 2) Published book (этот модуль) — «Применить к боту».
 * 3) Session snapshot — заморозка на старте бота (только runtime).
 */
import {
getActiveExchangeId
} from "../exchanges/context.js?v=1";

import {
normalizeAlgoOptimizeStrategyId
} from "./strategy-param-optimize.js?v=9";

import {
normalizeAlgoSupertrendFilterEnabled,
normalizeAlgoSupertrendTf,
clampAlgoSupertrendAtr,
clampAlgoSupertrendFactor
} from "./pattern-supertrend-filter.js?v=5";

export const ALGO_BOT_TICKER_BOOK_KEY =
"algo_trading_bot_ticker_book_v1";

export const ALGO_BOT_STAGED_BOOK_KEY =
"algo_trading_bot_staged_book_v1";

/**
 * @returns {string}
 */
function exchangeScope(){
  return String(getActiveExchangeId?.() || "bybit").toLowerCase() || "bybit";
}

/**
 * @param {string} symbol
 * @returns {string}
 */
export function normalizeBotBookSymbol(symbol){
  return String(symbol || "")
    .replace(/\.P$/i, "")
    .trim()
    .toUpperCase();
}

/**
 * @returns {Record<string, object>}
 */
function readRoot(){
  try{
    const raw = localStorage.getItem(ALGO_BOT_TICKER_BOOK_KEY);
    if(!raw){
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  }catch{
    return {};
  }
}

/**
 * @param {Record<string, object>} root
 */
function writeRoot(root){
  try{
    localStorage.setItem(ALGO_BOT_TICKER_BOOK_KEY, JSON.stringify(root));
  }catch(err){
    console.warn("[algo-trading] bot ticker book persist", err);
  }
}

/**
 * Optimize UI patch (slPctOfX / tp1X / …) → overlay полей bot-strategy-prefs.
 * @param {string} strategyId
 * @param {object} patch
 * @returns {object|null}
 */
export function optimizePatchToBotOverlay(strategyId, patch){
  const id = normalizeAlgoOptimizeStrategyId(strategyId);
  if(!patch || typeof patch !== "object"){
    return null;
  }

  const overlay = {
    slPct: Number(patch.slPctOfX),
    pullbackBeforeArm: !!patch.pullbackBeforeArm,
    pullbackBeforeArmPct: Number(patch.pullbackBeforeArmPct),
    supertrendLongFilter:
      normalizeAlgoSupertrendFilterEnabled(patch.supertrendLongFilter),
    supertrendLongAtr:
      clampAlgoSupertrendAtr(patch.supertrendLongAtr),
    supertrendLongFactor:
      clampAlgoSupertrendFactor(patch.supertrendLongFactor),
    supertrendLongTf:
      normalizeAlgoSupertrendTf(patch.supertrendLongTf),
    supertrendShortFilter:
      normalizeAlgoSupertrendFilterEnabled(patch.supertrendShortFilter),
    supertrendShortAtr:
      clampAlgoSupertrendAtr(patch.supertrendShortAtr),
    supertrendShortFactor:
      clampAlgoSupertrendFactor(patch.supertrendShortFactor),
    supertrendShortTf:
      normalizeAlgoSupertrendTf(patch.supertrendShortTf)
  };

  if(!Number.isFinite(overlay.slPct)){
    delete overlay.slPct;
  }
  if(!Number.isFinite(overlay.pullbackBeforeArmPct)){
    delete overlay.pullbackBeforeArmPct;
  }

  if(id === "st1"){
    const tpRr = Number(patch.tpRr);
    if(Number.isFinite(tpRr)){
      overlay.tpRr = tpRr;
    }
    return overlay;
  }

  if(id === "st3"){
    const tp1 = Number(patch.tp1Y);
    const tp2 = Number(patch.tp2Y);
    const tp3 = Number(patch.tp3Y);
    if(Number.isFinite(tp1)) overlay.tp1 = tp1;
    if(Number.isFinite(tp2)) overlay.tp2 = tp2;
    if(Number.isFinite(tp3)) overlay.tp3 = tp3;
    overlay.trailSl = !!patch.trailSlSt3;
    const x1 = Number(patch.trailSlX1St3);
    const x2 = Number(patch.trailSlX2St3);
    if(Number.isFinite(x1)) overlay.trailSlX1 = x1;
    if(Number.isFinite(x2)) overlay.trailSlX2 = x2;
    const s1 = Number(patch.share1Y);
    const s2 = Number(patch.share2Y);
    const s3 = Number(patch.share3Y);
    if(Number.isFinite(s1)) overlay.share1 = s1;
    if(Number.isFinite(s2)) overlay.share2 = s2;
    if(Number.isFinite(s3)) overlay.share3 = s3;
    return overlay;
  }

  const tp1 = Number(patch.tp1X);
  const tp2 = Number(patch.tp2X);
  const tp3 = Number(patch.tp3X);
  if(Number.isFinite(tp1)) overlay.tp1 = tp1;
  if(Number.isFinite(tp2)) overlay.tp2 = tp2;
  if(Number.isFinite(tp3)) overlay.tp3 = tp3;
  overlay.trailSl = !!patch.trailSlSt2;
  const x1 = Number(patch.trailSlX1St2);
  const x2 = Number(patch.trailSlX2St2);
  if(Number.isFinite(x1)) overlay.trailSlX1 = x1;
  if(Number.isFinite(x2)) overlay.trailSlX2 = x2;
  const s1 = Number(patch.share1X);
  const s2 = Number(patch.share2X);
  const s3 = Number(patch.share3X);
  if(Number.isFinite(s1)) overlay.share1 = s1;
  if(Number.isFinite(s2)) overlay.share2 = s2;
  if(Number.isFinite(s3)) overlay.share3 = s3;
  return overlay;
}

/**
 * @param {string} strategyId
 * @returns {object|null}
 */
export function loadBotTickerBook(strategyId){
  const id = normalizeAlgoOptimizeStrategyId(strategyId);
  const root = readRoot();
  const scopedEx = exchangeScope();
  const byEx = root[scopedEx];
  let book = byEx && typeof byEx === "object" ? byEx[id] : null;
  if(!book || typeof book !== "object"){
    for(const other of Object.values(root)){
      if(!other || typeof other !== "object"){
        continue;
      }
      const candidate = other[id];
      if(candidate && typeof candidate === "object" && candidate.tickers){
        book = candidate;
        break;
      }
    }
  }
  if(!book || typeof book !== "object"){
    return null;
  }
  const tickers =
    book.tickers && typeof book.tickers === "object" && !Array.isArray(book.tickers)
      ? book.tickers
      : {};
  const tickerCount = Number(book.tickerCount) || Object.keys(tickers).length;
  if(!tickerCount){
    return null;
  }
  return {
    strategyId: id,
    exchange: String(book.exchange || scopedEx),
    tf: String(book.tf || ""),
    statsMode: String(book.statsMode || ""),
    version: Number(book.version) || 1,
    publishedAt: Number(book.publishedAt) || 0,
    tickerCount,
    tickers
  };
}

/**
 * @param {object|null|undefined} book
 * @returns {{ ok: boolean, book?: object }}
 */
export function writePublishedBotTickerBook(book){
  if(!book || typeof book !== "object" || !book.tickers || typeof book.tickers !== "object"){
    return { ok: false };
  }
  const tickers = Array.isArray(book.tickers) ? {} : book.tickers;
  const tickerCount = Number(book.tickerCount) || Object.keys(tickers).length;
  if(!tickerCount){
    return { ok: false };
  }
  const id = normalizeAlgoOptimizeStrategyId(book.strategyId);
  const ex = String(book.exchange || exchangeScope()).trim().toLowerCase() || exchangeScope();
  const stored = {
    ...book,
    strategyId: id,
    exchange: ex,
    tickerCount,
    tickers
  };
  const root = readRoot();
  const byEx = root[ex] && typeof root[ex] === "object" ? { ...root[ex] } : {};
  byEx[id] = stored;
  root[ex] = byEx;
  writeRoot(root);
  return { ok: true, book: stored };
}

function bookHasTickers(book){
  return !!(
    book?.tickers &&
    typeof book.tickers === "object" &&
    Object.keys(book.tickers).length
  );
}

/**
 * Pull published book from main (LAN write / persist) into renderer localStorage.
 * @param {string} strategyId
 * @returns {Promise<object|null>}
 */
export async function hydrateBotTickerBookFromMain(strategyId){
  const existing = loadBotTickerBook(strategyId);
  if(bookHasTickers(existing)){
    return existing;
  }
  const api = globalThis.window?.cryptoTerminalDesktop?.algoTrading;
  if(typeof api?.getTickerBook !== "function"){
    return existing;
  }
  const id = normalizeAlgoOptimizeStrategyId(strategyId);
  try{
    let res = await api.getTickerBook({
      strategyId: id,
      exchangeId: exchangeScope()
    });
    let book = res?.book;
    if(!bookHasTickers(book)){
      res = await api.getTickerBook({ strategyId: id });
      book = res?.book;
    }
    if(!bookHasTickers(book)){
      return existing;
    }
    writePublishedBotTickerBook(book);
    return loadBotTickerBook(id);
  }catch(err){
    console.warn("[algo-trading] hydrate ticker book from main", err);
    return existing;
  }
}

/**
 * @param {string} strategyId
 * @param {{
 *   rows?: object[],
 *   tf?: string,
 *   statsMode?: string
 * }} source
 * @returns {{ ok: boolean, tickerCount: number, message?: string, book?: object }}
 */
export function publishBotTickerBookFromOptimizeRows(strategyId, source = {}){
  const id = normalizeAlgoOptimizeStrategyId(strategyId);
  const rows = Array.isArray(source.rows) ? source.rows : [];
  /** @type {Record<string, object>} */
  const tickers = {};
  const bookTfs = new Set();

  for(const row of rows){
    if(!row || row.skipped || row.include === false){
      continue;
    }
    const symbol = normalizeBotBookSymbol(row.symbol);
    if(!symbol){
      continue;
    }
    const overlay = optimizePatchToBotOverlay(id, row.patch);
    if(!overlay){
      continue;
    }
    const rowTf = String(row.tf || source.tf || "").trim();
    if(!rowTf){
      continue;
    }
    bookTfs.add(rowTf);
    tickers[symbol] = {
      ...overlay,
      tf: rowTf,
      paramsBrief: String(row.paramsBrief || ""),
      closed: Number.isFinite(Number(row.closed)) ? Number(row.closed) : null,
      netUsd: Number.isFinite(Number(row.netUsd)) ? Number(row.netUsd) : null,
      winRate: Number.isFinite(Number(row.winRate)) ? Number(row.winRate) : null
    };
  }

  const tickerCount = Object.keys(tickers).length;
  if(!tickerCount){
    const anyRows = rows.some(r => r && !r.skipped);
    return {
      ok: false,
      tickerCount: 0,
      message: anyRows
        ? "Нет отмеченных тикеров. Включите чекбоксы в таблице и снова «Применить к боту»."
        : "Нет строк с параметрами (нужен patch). Запустите подбор ещё раз."
    };
  }

  if(bookTfs.size !== 1){
    return {
      ok: false,
      tickerCount: 0,
      message:
        "Книга должна содержать один таймфрейм для всех тикеров. Запустите подбор заново на одном ТФ."
    };
  }

  const [bookTf] = bookTfs;
  const book = {
    strategyId: id,
    exchange: exchangeScope(),
    tf: bookTf,
    statsMode: String(source.statsMode || ""),
    version: 2,
    publishedAt: Date.now(),
    tickerCount,
    tickers
  };

  const root = readRoot();
  const ex = exchangeScope();
  const byEx = root[ex] && typeof root[ex] === "object" ? { ...root[ex] } : {};
  byEx[id] = book;
  root[ex] = byEx;
  writeRoot(root);

  return {
    ok: true,
    tickerCount,
    book
  };
}

/**
 * Снимок книги на старт сессии бота.
 * Только явно загруженная (staged) книга — после «Загрузить книгу параметров».
 * @param {string} strategyId
 * @returns {object|null}
 */
export function freezeBotTickerBookSnapshot(strategyId){
  const book = loadStagedBotTickerBook(strategyId);
  if(!book){
    return null;
  }
  try{
    return JSON.parse(JSON.stringify(book));
  }catch{
    return {
      ...book,
      tickers: {
        ...(book.tickers || {})
      }
    };
  }
}

/**
 * @param {string} strategyId
 * @returns {object|null}
 */
export function loadStagedBotTickerBook(strategyId){
  const id = normalizeAlgoOptimizeStrategyId(strategyId);
  try{
    const raw = localStorage.getItem(ALGO_BOT_STAGED_BOOK_KEY);
    if(!raw){
      return null;
    }
    const root = JSON.parse(raw);
    const byEx = root && typeof root === "object" ? root[exchangeScope()] : null;
    const book = byEx && typeof byEx === "object" ? byEx[id] : null;
    if(!book || typeof book !== "object" || !book.tickers){
      return null;
    }
    return book;
  }catch{
    return null;
  }
}

/**
 * Явная загрузка published-книги в staged (для UI «Загрузить книгу»).
 * @param {string} strategyId
 * @returns {{ ok: boolean, book?: object, message?: string }}
 */
export async function stageBotTickerBookFromPublished(strategyId){
  await hydrateBotTickerBookFromMain(strategyId);
  const book = loadBotTickerBook(strategyId);
  const count = book?.tickerCount || Object.keys(book?.tickers || {}).length;
  if(!book || !count){
    return {
      ok: false,
      message: "Книга пуста. Сначала «Подобрать для всех» → «Применить к боту»."
    };
  }
  let root = {};
  try{
    const raw = localStorage.getItem(ALGO_BOT_STAGED_BOOK_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === "object"){
        root = parsed;
      }
    }
  }catch{
    root = {};
  }
  const ex = exchangeScope();
  const byEx = root[ex] && typeof root[ex] === "object" ? { ...root[ex] } : {};
  const snap = JSON.parse(JSON.stringify(book));
  snap.stagedAt = Date.now();
  byEx[normalizeAlgoOptimizeStrategyId(strategyId)] = snap;
  root[ex] = byEx;
  try{
    localStorage.setItem(ALGO_BOT_STAGED_BOOK_KEY, JSON.stringify(root));
  }catch(err){
    console.warn("[algo-trading] stage bot ticker book", err);
    return {
      ok: false,
      message: "Не удалось сохранить книгу"
    };
  }
  return {
    ok: true,
    book: snap
  };
}

/**
 * Persist published/staged book to main so LAN start and remote parse share it.
 * @param {string} strategyId
 * @param {object|null|undefined} book
 * @returns {Promise<{ ok: boolean, skipped?: boolean, message?: string }>}
 */
export async function persistBotTickerBookToMain(strategyId, book){
  const api = globalThis.window?.cryptoTerminalDesktop?.algoTrading;
  if(typeof api?.setTickerBook !== "function"){
    return {
      ok: true,
      skipped: true
    };
  }
  if(!book || typeof book !== "object" || !book.tickers){
    return {
      ok: false,
      message: "Нет книги параметров"
    };
  }
  try{
    const res = await api.setTickerBook({
      strategyId,
      book,
      exchangeId: book.exchange
    });
    return res && typeof res === "object"
      ? res
      : {
        ok: true
      };
  }catch(err){
    return {
      ok: false,
      message: String(err?.message || err || "Не удалось записать книгу")
    };
  }
}

/**
 * @param {object|null|undefined} snapshot
 * @param {string} symbol
 * @returns {object|null}
 */
export function lookupBotTickerBookEntry(snapshot, symbol){
  const tickers = snapshot?.tickers;
  if(!tickers || typeof tickers !== "object"){
    return null;
  }
  const sym = normalizeBotBookSymbol(symbol);
  if(!sym){
    return null;
  }
  const row = tickers[sym];
  return row && typeof row === "object" ? row : null;
}
