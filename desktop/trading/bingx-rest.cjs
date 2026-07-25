/**
 * BingX Swap REST — clean rebuild (hedge + multi-asset defaults).
 * Return shapes mimic bybit-rest.cjs for the shared renderer.
 * Do not import or modify bybit-rest.cjs.
 */
const zlib = require("zlib");
const { net } = require("electron");
const { getCredentials } = require("./exchange-credentials.cjs");
const {
  validateParams,
  buildCanonical,
  signPayload
} = require("./bingx-sign.cjs");
const {
  PRIORITY,
  enqueueBingxRequest,
  noteBingxRateLimit,
  noteBingxSuccess,
  getBingxRateLimitBackoffMs,
  peekBingxRateLimitBlock,
  getBingxSchedulerStats
} = require("./bingx-request-scheduler.cjs");
const {
  stopPricesMatch
} = require("./bingx-position-stops.cjs");
const {
  beginStopAmend,
  updateStopAmend,
  clearStopAmend,
  clearStopAmendForPosition,
  getStopAmend
} = require("./bingx-stop-amend-state.cjs");

function clearStopAmendForPositionSafe(pos, tgt) {
  try {
    clearStopAmendForPosition(pos, tgt);
  } catch {
    /* ignore */
  }
}

const EXCHANGE_ID = "bingx";
const RECV_WINDOW = "5000";
const REQUEST_TIMEOUT_MS = 12000;
const SOURCE_KEY = "Multichart";
const INSTRUMENT_CACHE_MS = 3600000;
const MODE_CACHE_MS = 300000;
const OPEN_ORDERS_CACHE_MS = 2000;
const POSITION_LIST_CACHE_MS = 2000;

const instrumentRulesCache = new Map();

let hedgeModeCache = null;
let hedgeModeCacheAt = 0;
let assetModeCache = null;
let assetModeCacheAt = 0;
let accountDefaultsCredKey = "";
let accountDefaultsPromise = null;
let accountDefaultsDoneKey = "";

/** Diary closed-PnL cache — avoids re-hitting BingX when revisiting Дневник. */

let openOrderRowsCache = {
  rows: [],
  at: 0,
  inflight: null
};

let positionListCache = {
  rows: null,
  at: 0,
  inflight: null
};

function invalidatePositionListCache() {
  positionListCache = {
    rows: null,
    at: 0,
    inflight: null
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Mirror renderer calcStopPriceFromUsd — used for post-open auto SL/TP in main. */
function calcStopPriceFromUsd({ side, entryPrice, size, usd, kind }) {
  const entry = Number(entryPrice);
  const qty = Number(size);
  const lossUsd = Number(usd);
  if (
    !Number.isFinite(entry) ||
    entry <= 0 ||
    !Number.isFinite(qty) ||
    qty <= 0 ||
    !Number.isFinite(lossUsd) ||
    lossUsd <= 0
  ) {
    return 0;
  }
  const isLong = side === "Buy";
  if (kind === "sl") {
    return isLong ? entry - lossUsd / qty : entry + lossUsd / qty;
  }
  return isLong ? entry + lossUsd / qty : entry - lossUsd / qty;
}

async function runAttachAutoStopsAfterOpen(position, options = {}) {
  const autoSl = Number(options.autoSlUsd) || 0;
  const autoTp = Number(options.autoTpUsd) || 0;
  const attached = { sl: false, tp: false };
  if (!position || (autoSl <= 0 && autoTp <= 0)) {
    return { position, stopsAttached: attached };
  }

  /* Fill lag: BingX rejects STOP until the position is visible server-side. */
  await sleep(250);

  let next = { ...position };
  const side = next.side === "Sell" ? "Sell" : "Buy";
  const entry = Number(next.avgPrice) || 0;
  const size = Math.abs(Number(next.size) || 0);

  async function placeWithRetry(target, price) {
    let last = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await sleep(attempt === 1 ? 250 : 400);
      }
      last = await setPositionStop(next.symbol, target, price, {
        position: next,
        freshAttach: true
      });
      if (last?.ok !== false) {
        return last;
      }
      const msg = String(last?.message || "").toLowerCase();
      const retryable =
        last?.rateLimited ||
        /no open position|нет открытой|not exist|does not exist|not found/.test(
          msg
        );
      if (!retryable) {
        break;
      }
    }
    return last;
  }

  if (autoSl > 0 && entry > 0 && size > 0) {
    const slPrice = calcStopPriceFromUsd({
      side,
      entryPrice: entry,
      size,
      usd: autoSl,
      kind: "sl"
    });
    if (slPrice > 0) {
      const slResult = await placeWithRetry("sl", slPrice);
      if (slResult?.ok !== false && slResult?.position) {
        next = { ...next, ...slResult.position };
        attached.sl = true;
      }
    }
  }

  if (autoTp > 0 && entry > 0 && size > 0) {
    await sleep(150);
    const tpPrice = calcStopPriceFromUsd({
      side,
      entryPrice: entry,
      size,
      usd: autoTp,
      kind: "tp"
    });
    if (tpPrice > 0) {
      const tpResult = await placeWithRetry("tp", tpPrice);
      if (tpResult?.ok !== false && tpResult?.position) {
        next = { ...next, ...tpResult.position };
        attached.tp = true;
      }
    }
  }

  return { position: next, stopsAttached: attached };
}

/**
 * BingX attach is slow (place + openOrders). Default: return immediately with
 * pending + attachPromise so openPosition IPC is not blocked 2–5s.
 * Pass { sync: true } to await placement (tests / rare callers).
 */
async function attachAutoStopsAfterOpen(position, options = {}) {
  const autoSl = Number(options.autoSlUsd) || 0;
  const autoTp = Number(options.autoTpUsd) || 0;
  if (!position || (autoSl <= 0 && autoTp <= 0)) {
    return { position, stopsAttached: { sl: false, tp: false } };
  }
  /* Market reduce of opposite position — keep existing stops, do not re-open. */
  if (position._reduced) {
    return { position, stopsAttached: { sl: false, tp: false } };
  }
  if (options.sync === true) {
    return runAttachAutoStopsAfterOpen(position, options);
  }
  const attachPromise = runAttachAutoStopsAfterOpen(position, options);
  return {
    position,
    stopsAttached: { sl: false, tp: false, pending: true },
    attachPromise
  };
}

function apiBases(testnet) {
  if (testnet) {
    return [
      "https://open-api-vst.bingx.com",
      "https://open-api-vst.bingx.pro"
    ];
  }
  return [
    "https://open-api.bingx.com",
    "https://open-api.bingx.pro"
  ];
}

function parseBingxJson(text) {
  if (!text?.trim()) {
    return null;
  }
  const safe = text.replace(
    /:(\s*)(-?\d{16,})(\s*[,\]}])/g,
    ':$1"$2"$3'
  );
  try {
    return JSON.parse(safe);
  } catch {
    return null;
  }
}

function isRateLimitError(data) {
  const code = String(data?.code ?? "");
  const msg = String(data?.msg || data?.message || "").toLowerCase();
  return (
    code === "100410" ||
    code === "100418" ||
    msg.includes("rate limit") ||
    msg.includes("too many request")
  );
}

function noteRateLimitFromResponse(data) {
  if (!isRateLimitError(data)) {
    return;
  }
  noteBingxRateLimit();
}

function getRateLimitBackoffMs() {
  return getBingxRateLimitBackoffMs();
}

function peekRateLimitBlock() {
  return peekBingxRateLimitBlock();
}

function inferSignedPriority(method, path, options = {}) {
  if (options.priority != null) {
    return options.priority;
  }
  const m = String(method || "").toUpperCase();
  const p = String(path || "");
  if (m === "POST" || m === "DELETE") {
    if (p.includes("/userDataStream")) {
      return PRIORITY.realtime;
    }
    return PRIORITY.critical;
  }
  if (
    p.includes("/user/income") ||
    p.includes("/positionHistory") ||
    p.includes("/fillHistory") ||
    p.includes("/allFillOrders")
  ) {
    return PRIORITY.background;
  }
  if (
    p.includes("/user/positions") ||
    p.includes("/trade/openOrders")
  ) {
    return PRIORITY.realtime;
  }
  if (
    p.includes("/user/balance") ||
    p.includes("/trade/leverage") ||
    p.includes("/trade/marginType") ||
    p.includes("/positionSide/dual") ||
    p.includes("/trade/assetMode")
  ) {
    return PRIORITY.normal;
  }
  if (p.includes("/userDataStream")) {
    return PRIORITY.realtime;
  }
  return PRIORITY.normal;
}

function inferCoalesceKey(method, path, params = {}, options = {}) {
  if (options.coalesceKey != null) {
    return options.coalesceKey;
  }
  const m = String(method || "").toUpperCase();
  if (m !== "GET") {
    return null;
  }
  const p = String(path || "");
  const symbol = params?.symbol ? String(params.symbol) : "";
  if (p.includes("/user/positions")) {
    return "GET:positions";
  }
  if (p.includes("/trade/openOrders")) {
    return symbol ? `GET:openOrders:${symbol}` : "GET:openOrders";
  }
  if (p.includes("/user/balance")) {
    return "GET:balance";
  }
  if (p.includes("/user/income")) {
    return `GET:income:${params.startTime || ""}:${params.endTime || ""}:${
      params.incomeType || ""
    }:${symbol}`;
  }
  if (p.includes("/positionHistory")) {
    return `GET:positionHistory:${symbol}:${params.startTs || ""}:${
      params.endTs || ""
    }:${params.pageIndex || "1"}`;
  }
  if (p.includes("/trade/leverage")) {
    return `GET:leverage:${symbol}`;
  }
  if (p.includes("/trade/marginType")) {
    return `GET:marginType:${symbol}`;
  }
  if (p.includes("/positionSide/dual")) {
    return "GET:hedgeMode";
  }
  if (p.includes("/trade/assetMode")) {
    return "GET:assetMode";
  }
  return `GET:${p}:${symbol}`;
}

function mapApiError(data) {
  if (isRateLimitError(data)) {
    return "Превышен лимит запросов BingX. Подождите немного.";
  }
  const msg = String(data?.msg || data?.message || "").trim();
  const code = data?.code;
  if (msg) {
    return code != null ? `${msg} (${code})` : msg;
  }
  return `BingX error ${code ?? "?"}`;
}

function formatFetchError(err, testnet) {
  const msg = String(err?.message || err || "");
  if (err?.code === "timeout" || /timeout/i.test(msg)) {
    return testnet
      ? "VST API не отвечает (таймаут)"
      : "BingX API не отвечает (таймаут)";
  }
  return testnet
    ? "VST API недоступен (сеть)"
    : "BingX API недоступен (сеть)";
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    return await net.fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeoutErr = new Error("timeout");
      timeoutErr.code = "timeout";
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function toCanonicalSymbol(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "");
}

function stripSymbolSuffix(raw) {
  return toCanonicalSymbol(raw);
}

function toBingxSymbol(canonical) {
  const sym = toCanonicalSymbol(canonical);
  if (!sym) {
    return "";
  }
  if (sym.includes("-")) {
    return sym;
  }
  if (sym.endsWith("USDT")) {
    return `${sym.slice(0, -4)}-USDT`;
  }
  if (sym.endsWith("USDC")) {
    return `${sym.slice(0, -4)}-USDC`;
  }
  return sym;
}

function displayTicker(raw) {
  const sym = toCanonicalSymbol(raw);
  if (sym.endsWith("USDT")) {
    return sym.slice(0, -4);
  }
  if (sym.endsWith("USDC")) {
    return sym.slice(0, -4);
  }
  return sym;
}

function extractBingxList(apiResponse, keys = ["orders", "list", "positions"]) {
  const root = apiResponse?.data;
  if (!root) {
    return [];
  }
  const inner = root.data ?? root;
  if (Array.isArray(inner)) {
    return inner;
  }
  for (const key of keys) {
    if (Array.isArray(inner?.[key])) {
      return inner[key];
    }
    if (Array.isArray(root?.[key])) {
      return root[key];
    }
  }
  return [];
}

function signedRequest(method, path, params = {}, options = {}) {
  const creds = getCredentials(EXCHANGE_ID);
  if (!creds) {
    return Promise.resolve({
      ok: false,
      message: "API keys not configured"
    });
  }

  const priority = inferSignedPriority(method, path, options);
  const coalesceKey = inferCoalesceKey(method, path, params, options);
  const m = String(method || "").toUpperCase();
  /* Explicit cancelable:false wins (diary resolve must not be dropped). */
  const cancelable =
    options.cancelable === false
      ? false
      : options.cancelable === true ||
        (m === "GET" && priority >= PRIORITY.background);

  return enqueueBingxRequest({
    priority,
    coalesceKey,
    allowDuringRateLimit:
      options.allowDuringRateLimit === true || priority === PRIORITY.critical,
    cancelable,
    run: async () => {
      const all = {
        ...params,
        timestamp: Date.now(),
        recvWindow: RECV_WINDOW
      };

      try {
        validateParams(all);
      } catch (err) {
        return {
          ok: false,
          message: err.message
        };
      }

      const signature = signPayload(creds.apiSecret, all);
      const signed = `${buildCanonical(all)}&signature=${signature}`;
      const headers = {
        "X-BX-APIKEY": creds.apiKey,
        "X-SOURCE-KEY": SOURCE_KEY
      };
      /* POST: body. GET/DELETE: query string (BingX does not read DELETE body). */
      if (m === "POST") {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      return fetchSignedLoop(creds, m, path, signed, headers, {
        ...options,
        /* Scheduler already applied cooldown policy. */
        allowDuringRateLimit: true
      });
    }
  });
}

async function fetchSignedLoop(creds, method, path, signed, headers, options = {}) {
  let lastNetworkError = null;
  let lastApiError = null;
  const useQuery = method === "GET" || method === "DELETE";

  for (const base of apiBases(creds.testnet)) {
    const url = useQuery
      ? `${base}${path}?${signed}`
      : `${base}${path}`;
    try {
      const response = await fetchWithTimeout(url, {
        method,
        headers,
        body: useQuery ? undefined : signed
      });
      const data = parseBingxJson(await response.text());
      if (!data) {
        return { ok: false, message: "Invalid API response" };
      }
      if (data.code !== 0 && data.code !== "0") {
        if (isRateLimitError(data)) {
          noteRateLimitFromResponse(data);
          /* Do not fan out to backup hosts — that doubles the hit. */
          return {
            ok: false,
            message: mapApiError(data),
            data,
            rateLimited: true
          };
        }
        lastApiError = {
          ok: false,
          message: mapApiError(data),
          data,
          rateLimited: false
        };
        /* POST/DELETE: do not retry other hosts (risk of double-fill). */
        if (method === "POST" || method === "DELETE") {
          return lastApiError;
        }
        continue;
      }
      noteBingxSuccess();
      return { ok: true, data };
    } catch (err) {
      lastNetworkError = {
        ok: false,
        message: formatFetchError(err, creds.testnet)
      };
      /* Timeout after a possible accept: never POST/DELETE to backup host. */
      if (
        (method === "POST" || method === "DELETE") &&
        (err?.code === "timeout" || /timeout/i.test(String(err?.message || "")))
      ) {
        return lastNetworkError;
      }
    }
  }

  return (
    lastApiError ||
    lastNetworkError || { ok: false, message: "BingX API недоступен" }
  );
}

async function publicGet(path, params = {}) {
  let lastErr = null;
  for (const base of apiBases(false)) {
    const qs = new URLSearchParams(params).toString();
    const url = qs ? `${base}${path}?${qs}` : `${base}${path}`;
    try {
      const response = await fetchWithTimeout(url, {
        method: "GET",
        headers: { "X-SOURCE-KEY": SOURCE_KEY }
      });
      const data = parseBingxJson(await response.text());
      if (data?.code === 0 || data?.code === "0") {
        return { ok: true, data };
      }
      lastErr = {
        ok: false,
        message: mapApiError(data || {})
      };
    } catch (err) {
      lastErr = { ok: false, message: formatFetchError(err, false) };
    }
  }
  return lastErr || { ok: false, message: "BingX public API недоступен" };
}

function toFiniteNumber(value) {
  if (value == null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Prefer equity (account value) over availableMargin — with open positions
 * availableMargin is often 0 while equity/balance still have funds.
 */
function pickFromBalanceObject(balance) {
  if (!balance || typeof balance !== "object" || Array.isArray(balance)) {
    return null;
  }
  const preferred = [
    balance.equity,
    balance.balance,
    balance.availableMargin,
    balance.availableBalance,
    balance.available,
    balance.walletBalance,
    balance.crossWalletBalance
  ];
  let firstFinite = null;
  for (const value of preferred) {
    const n = toFiniteNumber(value);
    if (n == null) {
      continue;
    }
    if (firstFinite == null) {
      firstFinite = n;
    }
    if (n > 0) {
      return String(n);
    }
  }
  return firstFinite != null ? String(firstFinite) : null;
}

function pickUsdtFromList(list) {
  if (!Array.isArray(list) || !list.length) {
    return null;
  }
  const usdt =
    list.find(
      (a) => String(a?.asset || a?.currency || "").toUpperCase() === "USDT"
    ) || list[0];
  return pickFromBalanceObject(usdt);
}

function pickUsdtBalance(data) {
  const root = data?.data ?? data;
  if (!root || typeof root !== "object") {
    return "0";
  }

  /* v3: { balance: { equity, balance, availableMargin, asset: "USDT" } } */
  /* sometimes balance is an array of assets */
  const balanceNode = root.balance;
  if (Array.isArray(balanceNode)) {
    const fromList = pickUsdtFromList(balanceNode);
    if (fromList != null) {
      return fromList;
    }
  } else {
    const fromObj = pickFromBalanceObject(balanceNode);
    if (fromObj != null) {
      return fromObj;
    }
  }

  if (Array.isArray(root)) {
    const fromRoot = pickUsdtFromList(root);
    if (fromRoot != null) {
      return fromRoot;
    }
  }

  const fromAssets = pickUsdtFromList(root.assets);
  if (fromAssets != null) {
    return fromAssets;
  }

  const fromRootObj = pickFromBalanceObject(root);
  if (fromRootObj != null) {
    return fromRootObj;
  }

  return "0";
}

async function getWalletBalance() {
  const result = await signedRequest("GET", "/openApi/swap/v3/user/balance");
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    usdt: pickUsdtBalance(result.data) ?? "0"
  };
}

function parseBoolish(value) {
  if (value === true || value === false) {
    return value;
  }
  const s = String(value ?? "")
    .trim()
    .toLowerCase();
  if (s === "true" || s === "1") {
    return true;
  }
  if (s === "false" || s === "0") {
    return false;
  }
  return null;
}

async function isHedgeMode() {
  if (
    hedgeModeCache != null &&
    Date.now() - hedgeModeCacheAt < MODE_CACHE_MS
  ) {
    return hedgeModeCache;
  }
  const result = await signedRequest(
    "GET",
    "/openApi/swap/v1/positionSide/dual",
    {},
    { priority: PRIORITY.normal }
  );
  if (!result.ok) {
    return hedgeModeCache === true;
  }
  const dual =
    result.data?.data?.dualSidePosition ?? result.data?.dualSidePosition;
  hedgeModeCache = parseBoolish(dual) === true;
  hedgeModeCacheAt = Date.now();
  return hedgeModeCache;
}

async function setHedgeMode(enabled) {
  const result = await signedRequest(
    "POST",
    "/openApi/swap/v1/positionSide/dual",
    {
      dualSidePosition: enabled ? "true" : "false"
    }
  );
  if (result.ok) {
    hedgeModeCache = !!enabled;
    hedgeModeCacheAt = Date.now();
  }
  return result;
}

async function getAssetMode() {
  if (
    assetModeCache &&
    Date.now() - assetModeCacheAt < MODE_CACHE_MS
  ) {
    return assetModeCache;
  }
  const result = await signedRequest(
    "GET",
    "/openApi/swap/v1/trade/assetMode",
    {},
    { priority: PRIORITY.normal }
  );
  if (!result.ok) {
    return assetModeCache || "singleAssetMode";
  }
  const mode =
    result.data?.data?.assetMode ??
    result.data?.assetMode ??
    "singleAssetMode";
  assetModeCache = String(mode);
  assetModeCacheAt = Date.now();
  return assetModeCache;
}

async function setAssetMode(mode) {
  const result = await signedRequest(
    "POST",
    "/openApi/swap/v1/trade/assetMode",
    {
      assetMode: mode
    }
  );
  if (result.ok) {
    assetModeCache = mode;
    assetModeCacheAt = Date.now();
  }
  return result;
}

async function ensureAccountDefaults() {
  const creds = getCredentials(EXCHANGE_ID);
  const credKey = creds
    ? `${creds.apiKey}:${creds.testnet ? "vst" : "live"}`
    : "";

  if (accountDefaultsDoneKey === credKey && credKey) {
    return { ok: true, notes: [], cached: true };
  }

  if (accountDefaultsPromise && accountDefaultsCredKey === credKey) {
    return accountDefaultsPromise;
  }

  accountDefaultsCredKey = credKey;
  accountDefaultsPromise = (async () => {
    const notes = [];

    const hedge = await isHedgeMode();
    let hedgeOk = hedge;
    if (!hedge) {
      const setHedge = await setHedgeMode(true);
      hedgeOk = !!setHedge.ok;
      notes.push(setHedge.ok ? "hedge" : `hedge-fail:${setHedge.message || "?"}`);
    }

    const assetMode = await getAssetMode();
    let multiOk = assetMode === "multiAssetsMode";
    if (!multiOk) {
      const setMulti = await setAssetMode("multiAssetsMode");
      multiOk = !!setMulti.ok;
      notes.push(
        setMulti.ok ? "multiAssets" : `multiAssets-fail:${setMulti.message || "?"}`
      );
    }

    if (hedgeOk && multiOk) {
      accountDefaultsDoneKey = credKey;
    }
    return { ok: true, notes };
  })();

  try {
    return await accountDefaultsPromise;
  } finally {
    if (accountDefaultsCredKey === credKey) {
      accountDefaultsPromise = null;
    }
  }
}

async function resolveOpenSides(sideNorm) {
  const hedge = await isHedgeMode();
  if (hedge) {
    return {
      side: sideNorm === "Sell" ? "SELL" : "BUY",
      positionSide: sideNorm === "Sell" ? "SHORT" : "LONG"
    };
  }
  return {
    side: sideNorm === "Sell" ? "SELL" : "BUY",
    positionSide: "BOTH"
  };
}

/**
 * Closing / SL / TP sides. Never use abs(size)>0 — size is always positive.
 */
function resolveCloseSidesSync(position, hedge) {
  const posSide = String(
    position?.positionSide || position?.side || ""
  ).toUpperCase();
  const sideNorm = String(position?.side || "").toLowerCase();

  let isLong = null;
  if (posSide === "LONG" || sideNorm === "buy" || sideNorm === "long") {
    isLong = true;
  } else if (
    posSide === "SHORT" ||
    sideNorm === "sell" ||
    sideNorm === "short"
  ) {
    isLong = false;
  }

  if (isLong == null) {
    const amt = Number(
      position?._rawBingx?.positionAmt ?? position?.positionAmt
    );
    if (Number.isFinite(amt) && amt !== 0) {
      isLong = amt > 0;
    } else {
      return null;
    }
  }

  if (hedge) {
    return {
      side: isLong ? "SELL" : "BUY",
      positionSide: isLong ? "LONG" : "SHORT"
    };
  }
  return {
    side: isLong ? "SELL" : "BUY",
    positionSide: "BOTH",
    reduceOnly: "true"
  };
}

async function resolveCloseSides(position) {
  const hedge = await isHedgeMode();
  const sides = resolveCloseSidesSync(position, hedge);
  if (!sides) {
    return null;
  }
  return sides;
}

function normalizePositionSideHint(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (s === "LONG" || s === "BUY") {
    return "LONG";
  }
  if (s === "SHORT" || s === "SELL") {
    return "SHORT";
  }
  if (s === "BOTH") {
    return "BOTH";
  }
  return "";
}

function positionSideMatches(pos, hint) {
  const want = normalizePositionSideHint(hint);
  if (!want || want === "BOTH") {
    return true;
  }
  const got = normalizePositionSideHint(
    pos?.positionSide || pos?.side || ""
  );
  if (got === want) {
    return true;
  }
  if (want === "LONG" && String(pos?.side || "").toLowerCase() === "buy") {
    return true;
  }
  if (want === "SHORT" && String(pos?.side || "").toLowerCase() === "sell") {
    return true;
  }
  return false;
}

function orderRowSideMatchesPosition(row, pos) {
  const posSide = normalizePositionSideHint(
    pos?.positionSide || pos?.side || ""
  );
  if (!posSide || posSide === "BOTH") {
    return true;
  }
  const rowSide = normalizePositionSideHint(
    row?.positionSide || row?.position_side || ""
  );
  if (!rowSide || rowSide === "BOTH") {
    return true;
  }
  return rowSide === posSide;
}

function decimalsFromStep(stepStr) {
  const s = String(stepStr || "").trim();
  if (!s) {
    return 0;
  }
  const sci = /^1e-(\d+)$/i.exec(s);
  if (sci) {
    return Number(sci[1]) || 0;
  }
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function stepFromPrecision(precision) {
  const p = Number(precision);
  if (!Number.isFinite(p) || p < 0 || p > 18) {
    return null;
  }
  if (p === 0) {
    return "1";
  }
  return `0.${"0".repeat(p - 1)}1`;
}

function formatQtyValue(qty, decimals) {
  return Number(qty).toFixed(Math.max(0, decimals));
}

function formatPriceValue(price, rules) {
  const p = Number(price);
  if (!Number.isFinite(p) || p <= 0) {
    return null;
  }
  const tick = Number(rules?.tickSize);
  if (Number.isFinite(tick) && tick > 0) {
    const decimals = decimalsFromStep(String(tick));
    const rounded = Math.round(p / tick) * tick;
    return formatQtyValue(rounded, decimals);
  }
  return String(p);
}

function qtyFromVolumeUsdt(volumeUsdt, price, rules = null) {
  const vol = Number(volumeUsdt);
  const p = Number(price);
  if (!Number.isFinite(vol) || vol <= 0 || !Number.isFinite(p) || p <= 0) {
    return null;
  }
  const raw = vol / p;
  const step = Number(rules?.qtyStep);
  const minQty = Number(rules?.minOrderQty);
  if (Number.isFinite(step) && step > 0) {
    const min = Number.isFinite(minQty) && minQty > 0 ? minQty : step;
    const decimals = decimalsFromStep(rules.qtyStep);
    const floored = Math.floor(raw / step) * step;
    if (floored >= min) {
      return formatQtyValue(floored, decimals);
    }
    const ceiled = Math.ceil(raw / step) * step;
    if (ceiled >= min) {
      return formatQtyValue(ceiled, decimals);
    }
    return null;
  }
  return String(raw);
}

async function getInstrumentRules(symbol) {
  const sym = stripSymbolSuffix(symbol);
  const cached = instrumentRulesCache.get(sym);
  if (cached && Date.now() - cached.at < INSTRUMENT_CACHE_MS) {
    return cached.rules;
  }

  const result = await publicGet("/openApi/swap/v2/quote/contracts");
  if (!result.ok) {
    return cached?.rules || null;
  }

  const rows = extractBingxList(result.data, ["contracts", "list"]);
  let rules = null;
  for (const row of rows) {
    const rowSym = stripSymbolSuffix(row?.symbol);
    const precision = Number(row?.quantityPrecision);
    const stepFromPrec = stepFromPrecision(precision);
    const qtyStep = String(
      stepFromPrec || row?.size || row?.tradeMinQuantity || "0.001"
    );
    const tickPrecision = Number(row?.pricePrecision);
    const tick =
      stepFromPrecision(tickPrecision) ||
      String(row?.tickSize ?? "0.01");
    const mapped = {
      qtyStep,
      minOrderQty: Number(row?.tradeMinQuantity ?? row?.minQty ?? 0) || 0,
      tickSize: tick
    };
    instrumentRulesCache.set(rowSym, { at: Date.now(), rules: mapped });
    if (rowSym === sym) {
      rules = mapped;
    }
  }
  return rules;
}

async function getTickerPrices(symbol) {
  const bingxSym = toBingxSymbol(symbol);
  const result = await publicGet("/openApi/swap/v2/quote/ticker", {
    symbol: bingxSym
  });
  if (!result.ok) {
    return null;
  }
  const row =
    extractBingxList(result.data, ["ticker", "list"])[0] ||
    result.data?.data ||
    result.data;
  const last = Number(row?.lastPrice ?? row?.price ?? row?.markPrice);
  const ask = Number(row?.askPrice ?? last);
  const bid = Number(row?.bidPrice ?? last);
  return {
    last: Number.isFinite(last) ? last : 0,
    ask: Number.isFinite(ask) ? ask : 0,
    bid: Number.isFinite(bid) ? bid : 0
  };
}

function bingxSideToBybit(side, positionAmt) {
  const sideNorm = String(side || "").toUpperCase();
  if (sideNorm === "LONG" || sideNorm === "BUY") {
    return "Buy";
  }
  if (sideNorm === "SHORT" || sideNorm === "SELL") {
    return "Sell";
  }
  const amt = Number(positionAmt);
  if (amt > 0) {
    return "Buy";
  }
  if (amt < 0) {
    return "Sell";
  }
  return "";
}

function parseStopField(value) {
  if (value == null || value === "") {
    return { price: 0, orderId: null };
  }
  if (typeof value === "object") {
    const price = Number(
      value.stopPrice ?? value.price ?? value.triggerPrice ?? 0
    );
    const orderId = value.orderId != null ? String(value.orderId) : null;
    return {
      price: Number.isFinite(price) && price > 0 ? price : 0,
      orderId
    };
  }
  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    return { price: num, orderId: null };
  }
  return { price: 0, orderId: null };
}

function rawPositionFromBingx(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  /* REST uses long names; private WS ACCOUNT_UPDATE uses compact (s/pa/ep/ps). */
  const symbol = row.symbol ?? row.s;
  const positionSide = row.positionSide ?? row.ps;
  const amt = Number(
    row.positionAmt ?? row.availableAmt ?? row.size ?? row.pa ?? 0
  );
  const size = Math.abs(amt);
  if (!Number.isFinite(size) || size === 0) {
    return null;
  }
  const avgPrice = Number(row.avgPrice ?? row.averagePrice ?? row.ep ?? 0);
  const markPrice = Number(row.markPrice ?? avgPrice);
  const leverage = Number(row.leverage ?? 0);
  const side = bingxSideToBybit(positionSide, row.positionAmt ?? row.pa ?? amt);
  const slParsed = parseStopField(row.stopLoss);
  const tpParsed = parseStopField(row.takeProfit);
  const marginType = String(row.marginType || row.mt || "").toUpperCase();

  return {
    symbol: stripSymbolSuffix(symbol),
    side,
    size,
    availableSize: size,
    avgPrice,
    markPrice,
    unrealisedPnl:
      row.unrealizedProfit ?? row.unrealisedProfit ?? row.up ?? 0,
    positionValue: Number.isFinite(avgPrice) ? size * avgPrice : 0,
    liqPrice: row.liquidationPrice ?? 0,
    leverage,
    tradeMode: marginType === "ISOLATED" ? 1 : 0,
    stopLoss: slParsed.price,
    takeProfit: tpParsed.price,
    slOrderId: slParsed.orderId,
    tpOrderId: tpParsed.orderId,
    positionIdx: 0,
    positionSide: positionSide || "BOTH",
    _rawBingx: row
  };
}

/**
 * Expand BingX private-WS ACCOUNT_UPDATE position rows (compact → REST-like).
 * Zero-size rows are kept so stream can tombstone that side.
 */
function normalizeBingxWsPositionRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const symbol = stripSymbolSuffix(row.symbol ?? row.s);
  if (!symbol) {
    return null;
  }
  const positionSide = String(
    (row.positionSide ?? row.ps) || "BOTH"
  ).toUpperCase();
  const amt = Number(
    row.positionAmt ?? row.availableAmt ?? row.size ?? row.pa ?? 0
  );
  const size = Number.isFinite(amt) ? Math.abs(amt) : 0;
  const side =
    positionSide === "SHORT" || positionSide === "SELL"
      ? "Sell"
      : positionSide === "LONG" || positionSide === "BUY"
        ? "Buy"
        : bingxSideToBybit(positionSide, amt);

  return {
    ...row,
    symbol,
    positionSide: positionSide || "BOTH",
    side,
    size,
    positionAmt: amt,
    availableAmt: amt,
    avgPrice: Number(row.avgPrice ?? row.averagePrice ?? row.ep ?? 0),
    markPrice: Number(row.markPrice ?? row.ep ?? 0),
    unrealizedProfit: row.unrealizedProfit ?? row.unrealisedProfit ?? row.up ?? 0,
    marginType: row.marginType || row.mt
  };
}

/**
 * Expand BingX private-WS ORDER_TRADE_UPDATE order object (compact → REST-like).
 */
function normalizeBingxWsOrderRow(order) {
  if (!order || typeof order !== "object") {
    return null;
  }
  const symbol = String((order.symbol ?? order.s) || "").replace(/-/g, "");
  const sideRaw = String((order.side ?? order.S) || "").toUpperCase();
  const statusRaw = String(
    (order.status ?? order.orderStatus ?? order.X) || ""
  );
  const typeRaw = String(
    (order.type ?? order.orderType ?? order.o) || ""
  ).toUpperCase();
  const qty = order.quantity ?? order.origQty ?? order.q;
  const stopPrice = order.stopPrice ?? order.triggerPrice ?? order.sp;
  const price = order.price ?? order.p;

  return {
    ...order,
    symbol,
    side: sideRaw === "SELL" ? "Sell" : sideRaw === "BUY" ? "Buy" : order.side,
    status: statusRaw,
    orderStatus: statusRaw,
    type: typeRaw || order.type || order.orderType,
    orderType: typeRaw || order.orderType,
    orderId: String(order.orderId ?? order.orderID ?? order.i ?? "").trim(),
    qty,
    quantity: qty,
    origQty: qty,
    price,
    stopPrice,
    triggerPrice: stopPrice,
    avgPrice: order.avgPrice ?? order.ap,
    executedQty: order.executedQty ?? order.z,
    lastFilledQty: order.lastFilledQty ?? order.l,
    positionSide: order.positionSide ?? order.ps,
    stopOrderType: order.stopOrderType ?? order.ot,
    reduceOnly: order.reduceOnly ?? order.R ?? order.cp,
    closePosition: order.closePosition ?? order.cp,
    time: order.time ?? order.T,
    updateTime: order.updateTime ?? order.T,
    execType: order.execType ?? order.x
  };
}

function mapPositionRow(row) {
  const raw = row?._rawBingx ? row : rawPositionFromBingx(row);
  if (!raw) {
    return null;
  }
  const size = Number(raw.size);
  if (!Number.isFinite(size) || size === 0) {
    return null;
  }
  const pnl = Number(raw.unrealisedPnl);
  const mark = Number(raw.markPrice || raw.avgPrice || 0);
  const volume = Number(raw.positionValue);
  const volumeUsdt =
    Number.isFinite(volume) && volume > 0
      ? volume
      : Math.abs(size * mark);

  return {
    symbol: raw.symbol,
    ticker: displayTicker(raw.symbol),
    pnl: Number.isFinite(pnl) ? pnl : 0,
    volumeUsdt: Number.isFinite(volumeUsdt) ? volumeUsdt : 0,
    side: raw.side,
    size,
    availableSize: raw.availableSize ?? size,
    avgPrice: Number(raw.avgPrice) || 0,
    markPrice: mark,
    liqPrice: Number(raw.liqPrice) || 0,
    leverage: Number(raw.leverage) || 0,
    tradeMode: raw.tradeMode,
    stopLoss: Number(raw.stopLoss) || 0,
    takeProfit: Number(raw.takeProfit) || 0,
    slOrderId: raw.slOrderId || null,
    tpOrderId: raw.tpOrderId || null,
    positionIdx: 0,
    positionSide: raw.positionSide || "BOTH",
    exchangeId: EXCHANGE_ID,
    _rawBingx: raw._rawBingx
  };
}

function isBingxPositionStopType(typeRaw) {
  return (
    typeRaw === "STOP_MARKET" ||
    typeRaw === "STOP" ||
    typeRaw === "TAKE_PROFIT_MARKET" ||
    typeRaw === "TAKE_PROFIT" ||
    typeRaw === "TRAILING_TP_SL"
  );
}

function mapOrderRow(row) {
  if (!row) {
    return null;
  }
  const typeRaw = String(row.type ?? row.orderType ?? "").toUpperCase();

  /* Position SL/TP → overlay badges, not chart stop orders. */
  if (isBingxPositionStopType(typeRaw)) {
    return null;
  }

  const sideRaw = String(row.side ?? "").toUpperCase();
  const side = sideRaw === "SELL" ? "Sell" : "Buy";
  const status = String(row.status ?? "").toUpperCase();
  const triggerPrice = Number(
    row.stopPrice ?? row.triggerPrice ?? row.activationPrice ?? 0
  );
  const limitPrice = Number(row.price ?? 0);
  const isReduceOnly =
    row.reduceOnly === true ||
    row.reduceOnly === "true" ||
    row.closePosition === true ||
    row.closePosition === "true";

  const isTrigger =
    typeRaw === "TRIGGER_MARKET" || typeRaw === "TRIGGER_LIMIT";

  let label = "";
  let orderKind = "";

  if (
    isTrigger &&
    (status === "NEW" ||
      status === "PENDING" ||
      status === "UNTRIGGERED" ||
      status === "" ||
      !status)
  ) {
    label = side === "Buy" ? "Buy Stop" : "Sell Stop";
    orderKind = "stop";
  } else if (
    typeRaw === "LIMIT" &&
    Number.isFinite(limitPrice) &&
    limitPrice > 0
  ) {
    label = side === "Buy" ? "Buy Limit" : "Sell Limit";
    orderKind = "limit";
  } else {
    return null;
  }

  const displayPrice = orderKind === "stop" ? triggerPrice : limitPrice;
  if (!Number.isFinite(displayPrice) || displayPrice <= 0) {
    return null;
  }

  const qty = Number(row.quantity ?? row.origQty ?? row.qty);
  const created = Number(row.time ?? row.updateTime ?? row.createTime);

  return {
    orderId: String(row.orderId ?? row.orderID ?? ""),
    symbol: stripSymbolSuffix(row.symbol),
    ticker: displayTicker(row.symbol),
    price: displayPrice,
    side,
    label,
    shortLabel:
      orderKind === "stop"
        ? side === "Buy"
          ? "BST"
          : "SST"
        : side === "Buy"
          ? "BLT"
          : "SLT",
    orderKind,
    badgeSide: side === "Buy" ? "long" : "short",
    reduceOnly: isReduceOnly,
    qty: Number.isFinite(qty) ? qty : 0,
    volumeUsdt:
      Number.isFinite(qty) && Number.isFinite(displayPrice)
        ? qty * displayPrice
        : 0,
    orderType: orderKind === "stop" ? "Market" : "Limit",
    createdAt: Number.isFinite(created) ? created : null,
    exchangeId: EXCHANGE_ID
  };
}

async function fetchPositionListRaw(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  if (
    !forceRefresh &&
    Array.isArray(positionListCache.rows) &&
    Date.now() - positionListCache.at < POSITION_LIST_CACHE_MS
  ) {
    return {
      ok: true,
      rows: positionListCache.rows,
      list: positionListCache.rows,
      cached: true
    };
  }

  if (!forceRefresh && positionListCache.inflight) {
    return positionListCache.inflight;
  }

  const inflight = (async () => {
    const result = await signedRequest(
      "GET",
      "/openApi/swap/v2/user/positions"
    );
    if (!result.ok) {
      return result;
    }
    const rows = extractBingxList(result.data, ["positions", "list"]);
    positionListCache.rows = rows;
    positionListCache.at = Date.now();
    return {
      ok: true,
      rows,
      list: rows
    };
  })();

  positionListCache.inflight = inflight;

  try {
    return await inflight;
  } finally {
    if (positionListCache.inflight === inflight) {
      positionListCache.inflight = null;
    }
  }
}

function rememberOpenOrderRowsCache(rows) {
  openOrderRowsCache = {
    rows: Array.isArray(rows) ? rows : [],
    at: Date.now(),
    inflight: null
  };
}

function invalidateOpenOrderRowsCache() {
  openOrderRowsCache = {
    rows: [],
    at: 0,
    inflight: openOrderRowsCache.inflight
  };
}

function getCachedOpenOrderRows() {
  return openOrderRowsCache.rows;
}

async function fetchOpenOrderRows(options = {}) {
  const params = {};
  if (options.symbol) {
    params.symbol = toBingxSymbol(options.symbol);
  }
  const result = await signedRequest(
    "GET",
    "/openApi/swap/v2/trade/openOrders",
    params,
    options
  );
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    rows: extractBingxList(result.data, ["orders", "list"])
  };
}

async function fetchOpenOrderRowsCached(options = {}) {
  if (
    !options.forceRefresh &&
    openOrderRowsCache.rows.length &&
    Date.now() - openOrderRowsCache.at < OPEN_ORDERS_CACHE_MS
  ) {
    return { ok: true, rows: openOrderRowsCache.rows, cached: true };
  }
  if (openOrderRowsCache.inflight) {
    return openOrderRowsCache.inflight;
  }
  openOrderRowsCache.inflight = fetchOpenOrderRows(options)
    .then((result) => {
      if (result.ok) {
        rememberOpenOrderRowsCache(result.rows);
      }
      return result;
    })
    .finally(() => {
      openOrderRowsCache.inflight = null;
    });
  return openOrderRowsCache.inflight;
}

function enrichPositionsWithStopOrders(positions, orderRows) {
  if (!Array.isArray(positions) || !positions.length) {
    return positions || [];
  }
  const rows = Array.isArray(orderRows) ? orderRows : [];
  return positions.map((pos) => {
    const sym = stripSymbolSuffix(pos.symbol);
    const knownSlId = String(pos.slOrderId || "").trim();
    const knownTpId = String(pos.tpOrderId || "").trim();
    const matching = rows.filter(
      (r) =>
        stripSymbolSuffix(r.symbol) === sym &&
        orderRowSideMatchesPosition(r, pos)
    );
    let stopLoss = 0;
    let takeProfit = 0;
    let slOrderId = null;
    let tpOrderId = null;
    let slAt = -1;
    let tpAt = -1;

    for (const row of matching) {
      const type = String(row.type ?? row.orderType ?? "").toUpperCase();
      const stopOrderType = String(row.stopOrderType ?? row.ot ?? "").trim();
      const trigger = Number(
        row.stopPrice ?? row.triggerPrice ?? row.activationPrice ?? 0
      );
      const id = String(row.orderId ?? row.orderID ?? "").trim();
      const at = Number(row.updateTime ?? row.time ?? row.createTime ?? 0);
      const reduceOnly =
        row.reduceOnly === true ||
        row.reduceOnly === "true" ||
        row.closePosition === true ||
        row.closePosition === "true" ||
        row.cp === true ||
        row.cp === "true";
      if (!Number.isFinite(trigger) || trigger <= 0) {
        continue;
      }
      const isSlType =
        type === "STOP_MARKET" ||
        type === "STOP" ||
        type === "STOP_LOSS" ||
        type === "STOP_LOSS_MARKET" ||
        stopOrderType === "StopLoss" ||
        stopOrderType === "STOP_LOSS" ||
        (type === "TRIGGER_MARKET" && reduceOnly) ||
        (knownSlId && id === knownSlId);
      const isTpType =
        type === "TAKE_PROFIT_MARKET" ||
        type === "TAKE_PROFIT" ||
        type === "TAKE_PROFIT_LIMIT" ||
        stopOrderType === "TakeProfit" ||
        stopOrderType === "TAKE_PROFIT" ||
        (knownTpId && id === knownTpId);

      /* Prefer the known order id over a stale duplicate still in the book. */
      if (isSlType) {
        if (knownSlId && id === knownSlId) {
          stopLoss = trigger;
          slOrderId = id;
          slAt = Number.MAX_SAFE_INTEGER;
        } else if (slAt < Number.MAX_SAFE_INTEGER && at >= slAt) {
          stopLoss = trigger;
          slOrderId = id || slOrderId;
          slAt = at;
        }
      }
      if (isTpType) {
        if (knownTpId && id === knownTpId) {
          takeProfit = trigger;
          tpOrderId = id;
          tpAt = Number.MAX_SAFE_INTEGER;
        } else if (tpAt < Number.MAX_SAFE_INTEGER && at >= tpAt) {
          takeProfit = trigger;
          tpOrderId = id || tpOrderId;
          tpAt = at;
        }
      }
    }

    return {
      ...pos,
      stopLoss,
      takeProfit,
      slOrderId,
      tpOrderId
    };
  });
}

async function getPositions(options = {}) {
  const list = await fetchPositionListRaw({
    forceRefresh: options.forceRefresh === true
  });
  if (!list.ok) {
    return list;
  }
  let positions = (list.rows || [])
    .map((row) => mapPositionRow(row))
    .filter(Boolean);

  const ordersResult = await fetchOpenOrderRowsCached({
    forceRefresh: false
  });
  if (ordersResult?.ok) {
    positions = enrichPositionsWithStopOrders(
      positions,
      ordersResult.rows || []
    );
  }

  return { ok: true, positions };
}

function selectPositionFromCandidates(candidates, sideHint) {
  const list = Array.isArray(candidates) ? candidates : [];
  const hint = normalizePositionSideHint(sideHint);
  const filtered = hint
    ? list.filter((p) => positionSideMatches(p, hint))
    : list;
  if (!hint && filtered.length > 1) {
    return {
      ok: false,
      ambiguous: true,
      message:
        "Несколько позиций по символу — укажите сторону LONG или SHORT",
      position: null
    };
  }
  return {
    ok: true,
    ambiguous: false,
    position: filtered[0] || null
  };
}

async function getPosition(symbol, options = {}) {
  const sym = stripSymbolSuffix(symbol);
  const sideHint =
    options.positionSide ||
    options.side ||
    options.position?.positionSide ||
    options.position?.side;
  const list = await fetchPositionListRaw();
  if (!list.ok) {
    return list;
  }
  const candidates = (list.rows || [])
    .map((row) => mapPositionRow(row))
    .filter(Boolean)
    .filter((p) => p.symbol === sym);

  const picked = selectPositionFromCandidates(candidates, sideHint);
  if (!picked.ok) {
    return {
      ok: false,
      message: picked.message,
      ambiguous: true,
      position: null
    };
  }

  let position = picked.position;

  if (position) {
    const enriched = enrichPositionsWithStopOrders(
      [position],
      getCachedOpenOrderRows()
    );
    position = enriched[0] || position;
  }

  return { ok: true, position };
}

async function getOpenOrders(payload = {}) {
  const result = await fetchOpenOrderRowsCached({
    symbol: payload?.symbol,
    forceRefresh: payload?.forceRefresh === true
  });
  if (!result.ok) {
    return result;
  }
  const orders = (result.rows || [])
    .map((row) => mapOrderRow(row))
    .filter(Boolean);
  return { ok: true, orders, rows: result.rows };
}

async function openPositionAtMarket(symbol, side, volumeUsdt, options = {}) {
  await ensureAccountDefaults();

  const sym = stripSymbolSuffix(symbol);
  const sideNorm = String(side || "").trim() === "Sell" ? "Sell" : "Buy";
  const vol = Number(volumeUsdt);

  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  if (!Number.isFinite(vol) || vol <= 0) {
    return { ok: false, message: "Invalid volume" };
  }

  const [ticker, rules] = await Promise.all([
    getTickerPrices(sym),
    getInstrumentRules(sym)
  ]);
  const refPrice =
    sideNorm === "Buy"
      ? ticker?.ask || ticker?.last
      : ticker?.bid || ticker?.last;

  if (!Number.isFinite(refPrice) || refPrice <= 0) {
    return { ok: false, message: "Price unavailable" };
  }

  const qtyStrRaw = qtyFromVolumeUsdt(vol, refPrice, rules);
  if (!qtyStrRaw || Number(qtyStrRaw) <= 0) {
    return { ok: false, message: "Volume too small" };
  }

  /* Opposite open position → reduce/close only (cap qty; never flip). */
  const oppositeHint = sideNorm === "Sell" ? "LONG" : "SHORT";
  const livePosResult = await getPosition(sym, {
    positionSide: oppositeHint
  });
  if (livePosResult?.ok === false) {
    return livePosResult;
  }

  const livePos = livePosResult?.position || null;
  const liveSize = Math.abs(
    Number(livePos?.availableSize ?? livePos?.size) || 0
  );
  const isOpposite = liveSize > 0;

  let qtyStr = qtyStrRaw;
  let sides;
  let reducedOpposite = false;

  if (isOpposite) {
    const closeSides = await resolveCloseSides(livePos);
    if (!closeSides) {
      return { ok: false, message: "Cannot resolve position side" };
    }
    const requested = Number(qtyStrRaw);
    const decimals = decimalsFromStep(rules?.qtyStep);
    const step = Number(rules?.qtyStep);
    let capped = Math.min(requested, liveSize);
    if (Number.isFinite(step) && step > 0) {
      capped = Math.floor((capped + 1e-12) / step) * step;
    }
    if (!(capped > 0)) {
      return { ok: false, message: "Volume too small" };
    }
    qtyStr =
      capped >= liveSize - 1e-12
        ? formatQtyValue(liveSize, decimals)
        : formatQtyValue(capped, decimals);
    sides = closeSides;
    reducedOpposite = true;
  } else {
    sides = await resolveOpenSides(sideNorm);
  }

  const body = {
    symbol: toBingxSymbol(sym),
    side: sides.side,
    positionSide: sides.positionSide,
    type: "MARKET",
    quantity: qtyStr
  };
  if (sides.reduceOnly) {
    body.reduceOnly = "true";
  }

  /* Never attach stopLoss JSON — `{` breaks HMAC (100001). Place after fill. */
  const orderResult = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/order",
    body
  );
  if (orderResult?.ok === false) {
    return orderResult;
  }

  const apiPayload =
    orderResult?.data?.data ??
    orderResult?.data ??
    {};
  const orderData =
    apiPayload?.order && typeof apiPayload.order === "object"
      ? apiPayload.order
      : apiPayload;
  const orderId = String(
    orderData?.orderId ?? orderData?.orderID ?? ""
  ).trim();
  if (!orderId) {
    return {
      ok: false,
      message:
        orderResult?.message ||
        "BingX не подтвердила ордер (нет orderId)",
      data: orderResult?.data
    };
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();

  const qtyNum = Number(qtyStr);
  const avgFromOrder = Number(
    orderData.avgPrice ?? orderData.averagePrice ?? 0
  );
  const entry = avgFromOrder > 0 ? avgFromOrder : refPrice;

  if (reducedOpposite) {
    const remaining = Math.max(0, liveSize - qtyNum);
    if (!(remaining > 1e-12)) {
      /* Fully closed opposite — do not invent a new opposite leg. */
      return {
        ...orderResult,
        ok: true,
        position: null,
        orderId,
        reduced: true,
        stopsAttached: { sl: false, tp: false }
      };
    }
    const remainNum = Number(
      formatQtyValue(remaining, decimalsFromStep(rules?.qtyStep))
    );
    return {
      ...orderResult,
      ok: true,
      position: {
        ...livePos,
        size: remainNum,
        availableSize: remainNum,
        volumeUsdt:
          remainNum *
          (Number(livePos.markPrice || livePos.avgPrice || entry) || entry),
        _optimistic: true,
        _optimisticAt: Date.now(),
        _optimisticOrderId: orderId,
        _reduced: true
      },
      orderId,
      reduced: true,
      /* Keep existing stops; do not re-attach as a fresh open. */
      stopsAttached: { sl: false, tp: false }
    };
  }

  const isLong = sideNorm === "Buy";
  const position = {
    symbol: sym,
    ticker: displayTicker(sym),
    side: sideNorm,
    positionSide: sides.positionSide || (isLong ? "LONG" : "SHORT"),
    size: qtyNum,
    availableSize: qtyNum,
    avgPrice: entry,
    markPrice: entry,
    unrealisedPnl: 0,
    pnl: 0,
    volumeUsdt: qtyNum * entry,
    liqPrice: 0,
    leverage: 0,
    tradeMode: 0,
    stopLoss: 0,
    takeProfit: 0,
    slOrderId: null,
    tpOrderId: null,
    positionIdx: 0,
    exchangeId: EXCHANGE_ID,
    _optimistic: true,
    _optimisticAt: Date.now(),
    _optimisticOrderId: orderId
  };

  /* Fast return: do not await auto SL/TP here — that blocked IPC for seconds,
   * delayed chart/sound, and raced the stream baseline. Stops attach in IPC
   * after the first upsertStreamPosition (see register-ipc openPosition). */
  return {
    ...orderResult,
    ok: true,
    position,
    orderId,
    stopsAttached: { sl: false, tp: false }
  };
}

async function closePositionAtMarket(symbol, options = {}) {
  const sym = stripSymbolSuffix(
    typeof symbol === "object" ? symbol?.symbol : symbol
  );
  const opts =
    typeof symbol === "object" && symbol && !options.positionSide
      ? symbol
      : options;

  /* Prefer renderer-supplied row — skip a REST getPosition round-trip. */
  let pos = opts.position || null;
  if (!pos) {
    const posResult = await getPosition(sym, opts);
    if (!posResult.ok) {
      return posResult;
    }
    if (!posResult.position) {
      return { ok: true, position: null, alreadyClosed: true };
    }
    pos = posResult.position;
  }
  if (!pos || !(Math.abs(Number(pos.size) || 0) > 0)) {
    return { ok: true, position: null, alreadyClosed: true };
  }

  const sides = await resolveCloseSides(pos);
  if (!sides) {
    return { ok: false, message: "Cannot resolve position side" };
  }
  const rules = await getInstrumentRules(sym);
  const closeQty = Math.abs(Number(pos.availableSize ?? pos.size) || 0);
  const qtyStr =
    closeQty > 0
      ? formatQtyValue(closeQty, decimalsFromStep(rules?.qtyStep))
      : null;
  if (!qtyStr || Number(qtyStr) <= 0) {
    return { ok: false, message: "Invalid close quantity" };
  }

  /* Close first for UI latency; cancel leftover STOP/TP in background. */
  const body = {
    symbol: toBingxSymbol(sym),
    side: sides.side,
    positionSide: sides.positionSide,
    type: "MARKET",
    quantity: qtyStr
  };
  if (sides.reduceOnly) {
    body.reduceOnly = "true";
  }

  const result = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/order",
    body
  );
  if (result?.ok) {
    rememberOpenOrderRowsCache([]);
    invalidatePositionListCache();
    void cancelAllStopsForPosition(sym, pos);
  }
  return result;
}

async function placeTradeOrder(payload) {
  await ensureAccountDefaults();

  const sym = stripSymbolSuffix(payload?.symbol);
  const kind = String(payload?.kind || "").toLowerCase();
  const price = Number(payload?.price);
  const volumeUsdt = Number(payload?.volumeUsdt);
  const markPrice = Number(payload?.markPrice);

  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "Invalid price" };
  }
  if (!Number.isFinite(volumeUsdt) || volumeUsdt <= 0) {
    return { ok: false, message: "Invalid volume" };
  }

  const rules = await getInstrumentRules(sym);
  const qtyRef =
    Number.isFinite(markPrice) && markPrice > 0 ? markPrice : price;
  const qtyStr = qtyFromVolumeUsdt(volumeUsdt, qtyRef, rules);
  if (!qtyStr || Number(qtyStr) <= 0) {
    return { ok: false, message: "Volume too small" };
  }

  const priceStr = formatPriceValue(price, rules) || String(price);
  let sideNorm = "Buy";
  let orderType = "LIMIT";
  const body = {
    symbol: toBingxSymbol(sym),
    quantity: qtyStr
  };

  switch (kind) {
    case "sell-limit":
      sideNorm = "Sell";
      orderType = "LIMIT";
      body.price = priceStr;
      body.timeInForce = "GTC";
      break;
    case "buy-limit":
      sideNorm = "Buy";
      orderType = "LIMIT";
      body.price = priceStr;
      body.timeInForce = "GTC";
      break;
    case "buy-stop":
      /* Working form: quantity + stopPrice + price (no quoteOrderQty). */
      sideNorm = "Buy";
      orderType = "TRIGGER_MARKET";
      body.stopPrice = priceStr;
      body.price = priceStr;
      body.workingType = "MARK_PRICE";
      break;
    case "sell-stop":
      sideNorm = "Sell";
      orderType = "TRIGGER_MARKET";
      body.stopPrice = priceStr;
      body.price = priceStr;
      body.workingType = "MARK_PRICE";
      break;
    default:
      return { ok: false, message: "Unknown order kind" };
  }

  const sides = await resolveOpenSides(sideNorm);
  body.side = sides.side;
  body.positionSide = sides.positionSide;
  body.type = orderType;

  const placeResult = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/order",
    body
  );
  if (placeResult.ok) {
    rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
  }
  return {
    ...placeResult,
    markPrice: Number.isFinite(markPrice) ? markPrice : null
  };
}

async function cancelTradeOrder(symbol, orderId, options = {}) {
  const sym = stripSymbolSuffix(symbol);
  const id = String(orderId || "").trim();
  if (!sym || !id) {
    return { ok: false, message: "Symbol and orderId required" };
  }

  async function attemptCancel() {
    return signedRequest("DELETE", "/openApi/swap/v2/trade/order", {
      symbol: toBingxSymbol(sym),
      orderId: id
    });
  }

  let result = await attemptCancel();
  if (!result.ok) {
    await sleep(200);
    result = await attemptCancel();
  }

  if (!result.ok) {
    const msg = String(result.message || "").toLowerCase();
    const code = String(result.data?.code ?? "");
    if (
      msg.includes("not exist") ||
      msg.includes("not found") ||
      msg.includes("does not exist") ||
      code === "100204" ||
      code === "109400"
    ) {
      rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
      return { ok: true, alreadyGone: true };
    }
    return result;
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();

  if (options.verify === false) {
    return { ok: true };
  }

  await sleep(120);
  const check = await fetchOpenOrderRows({
    symbol: sym,
    forceRefresh: true
  });
  if (check.ok) {
    const stillThere = (check.rows || []).some(
      (row) => String(row.orderId ?? row.orderID ?? "") === id
    );
    if (stillThere) {
      const retry = await attemptCancel();
      if (!retry.ok) {
        const msg = String(retry.message || "").toLowerCase();
        if (msg.includes("not exist") || msg.includes("not found")) {
          rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
          return { ok: true, alreadyGone: true };
        }
        return {
          ok: false,
          message: retry.message || "Order still open after cancel"
        };
      }
      rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
    }
  }

  return { ok: true };
}

/**
 * Cancel STOP / TAKE_PROFIT attached to a position (hedge-aware).
 */
async function cancelAllStopsForPosition(symbol, position) {
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }

  const stopTypes = new Set([
    "STOP_MARKET",
    "STOP",
    "TAKE_PROFIT_MARKET",
    "TAKE_PROFIT",
    "TAKE_PROFIT_LIMIT",
    "STOP_LIMIT",
    "TRAILING_TP_SL",
    "TRAILING_STOP_MARKET"
  ]);

  const ids = new Set();
  if (position?.slOrderId) {
    ids.add(String(position.slOrderId));
  }
  if (position?.tpOrderId) {
    ids.add(String(position.tpOrderId));
  }

  const ordersResult = await fetchOpenOrderRows({
    symbol: sym,
    forceRefresh: true
  });
  if (ordersResult.ok) {
    for (const row of ordersResult.rows || []) {
      const type = String(row.type ?? row.orderType ?? "").toUpperCase();
      if (!stopTypes.has(type)) {
        continue;
      }
      if (!orderRowSideMatchesPosition(row, position || {})) {
        continue;
      }
      const id = String(row.orderId ?? row.orderID ?? "");
      if (id) {
        ids.add(id);
      }
    }
  }

  if (!ids.size) {
    return { ok: true, cancelled: 0 };
  }

  const idList = [...ids];
  for (const id of idList) {
    const r = await cancelTradeOrder(sym, id, { verify: false });
    if (r?.ok === false) {
      return r;
    }
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
  await sleep(150);
  const verify = await fetchOpenOrderRows({
    symbol: sym,
    forceRefresh: true
  });
  if (verify.ok) {
    const leftovers = (verify.rows || []).filter((row) => {
      const type = String(row.type ?? row.orderType ?? "").toUpperCase();
      if (!stopTypes.has(type)) {
        return false;
      }
      if (!orderRowSideMatchesPosition(row, position || {})) {
        return false;
      }
      return true;
    });
    for (const row of leftovers) {
      const id = String(row.orderId ?? row.orderID ?? "");
      if (!id) {
        continue;
      }
      const r = await cancelTradeOrder(sym, id, { verify: false });
      if (r?.ok === false) {
        return r;
      }
    }
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
  clearStopAmendForPositionSafe(position, "sl");
  clearStopAmendForPositionSafe(position, "tp");
  return { ok: true, cancelled: idList.length };
}

async function amendTradeOrder(payload) {
  const sym = stripSymbolSuffix(payload?.symbol);
  const orderId = String(payload?.orderId || "").trim();
  const price = Number(payload?.price);
  if (!sym || !orderId) {
    return { ok: false, message: "Symbol and orderId required" };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "Invalid price" };
  }

  /* BingX /amend only adjusts quantity — price/trigger edits need replace. */
  const ordersResult = await fetchOpenOrdersForSymbol(sym);
  if (!ordersResult.ok) {
    return ordersResult;
  }
  const row = (ordersResult.rows || []).find(
    (item) => String(item.orderId ?? item.orderID ?? "") === orderId
  );
  if (!row) {
    return { ok: false, message: "Order not found" };
  }

  const rules = await getInstrumentRules(sym);
  const priceStr = formatPriceValue(price, rules) || String(price);
  const qtyNum = Number(
    payload?.qty ??
      payload?.quantity ??
      row.quantity ??
      row.origQty ??
      row.qty
  );
  if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
    return { ok: false, message: "Order quantity required" };
  }
  const qtyStr =
    formatQtyValue(qtyNum, decimalsFromStep(rules?.qtyStep)) || String(qtyNum);

  const typeRaw = String(row.type || row.orderType || "").toUpperCase();
  const kind = String(payload?.orderKind || "").toLowerCase();
  const sideRaw = String(row.side || "").toUpperCase();
  const side = sideRaw === "SELL" ? "SELL" : "BUY";
  let positionSide = String(row.positionSide || "").toUpperCase();
  if (!positionSide) {
    positionSide = (await isHedgeMode())
      ? side === "SELL"
        ? "SHORT"
        : "LONG"
      : "BOTH";
  }

  const type =
    typeRaw ||
    (kind === "stop" ? "TRIGGER_MARKET" : "LIMIT");
  const isTrigger =
    type === "TRIGGER_MARKET" ||
    type === "TRIGGER_LIMIT" ||
    type === "STOP_MARKET" ||
    type === "STOP" ||
    type === "STOP_LOSS" ||
    type === "STOP_LOSS_MARKET" ||
    type === "TAKE_PROFIT_MARKET" ||
    type === "TAKE_PROFIT" ||
    type === "TAKE_PROFIT_LIMIT" ||
    kind === "stop";

  const reduceOnly =
    row.reduceOnly === true ||
    row.reduceOnly === "true" ||
    row.reduceOnly === "TRUE";

  /* cancelReplace often places a new stop without cancelling the old one.
   * For triggers/stops always cancel explicitly, then place. */
  if (isTrigger) {
    const cancelled = await cancelTradeOrder(sym, orderId, { verify: true });
    if (cancelled?.ok === false && !cancelled?.alreadyGone) {
      return cancelled;
    }
    const placeBody = {
      symbol: toBingxSymbol(sym),
      side,
      positionSide,
      type,
      quantity: qtyStr,
      stopPrice: priceStr,
      price: priceStr,
      workingType:
        String(row.workingType || "CONTRACT_PRICE").toUpperCase() ||
        "CONTRACT_PRICE"
    };
    if (reduceOnly && positionSide === "BOTH") {
      placeBody.reduceOnly = "true";
    }
    const placed = await signedRequest(
      "POST",
      "/openApi/swap/v2/trade/order",
      placeBody
    );
    rememberOpenOrderRowsCache([]);
    invalidatePositionListCache();
    if (!placed.ok) {
      return {
        ok: false,
        message:
          placed.message ||
          "Ордер отменён, не удалось перевыставить по новой цене",
        cancelledOrphan: true,
        rateLimited: !!placed.rateLimited
      };
    }
    const newOrderId = String(
      placed.data?.data?.order?.orderId ??
        placed.data?.order?.orderId ??
        placed.data?.data?.orderId ??
        placed.data?.orderId ??
        ""
    ).trim();
    return {
      ok: true,
      orderId: newOrderId || orderId,
      price,
      replaced: true
    };
  }

  const body = {
    symbol: toBingxSymbol(sym),
    cancelOrderId: orderId,
    cancelReplaceMode: "STOP_ON_FAILURE",
    side,
    positionSide,
    type,
    quantity: qtyStr,
    price: priceStr,
    timeInForce: String(row.timeInForce || "GTC").toUpperCase() || "GTC"
  };

  if (reduceOnly && positionSide === "BOTH") {
    body.reduceOnly = "true";
  }

  const result = await signedRequest(
    "POST",
    "/openApi/swap/v1/trade/cancelReplace",
    body
  );

  const data = result.data || {};
  const cancelResult = String(data.cancelResult || "").toUpperCase();
  const newOrderResult = String(data.newOrderResult || "").toUpperCase();
  const cancelOk =
    !cancelResult ||
    cancelResult === "SUCCESS" ||
    cancelResult === "OK";
  const placeOk =
    !newOrderResult ||
    newOrderResult === "SUCCESS" ||
    newOrderResult === "OK";

  async function placeReplacement() {
    const placeBody = {
      symbol: body.symbol,
      side: body.side,
      positionSide: body.positionSide,
      type: body.type,
      quantity: body.quantity
    };
    if (body.stopPrice != null) {
      placeBody.stopPrice = body.stopPrice;
    }
    if (body.price != null) {
      placeBody.price = body.price;
    }
    if (body.workingType) {
      placeBody.workingType = body.workingType;
    }
    if (body.timeInForce) {
      placeBody.timeInForce = body.timeInForce;
    }
    if (body.reduceOnly) {
      placeBody.reduceOnly = body.reduceOnly;
    }
    return signedRequest("POST", "/openApi/swap/v2/trade/order", placeBody);
  }

  /* Cancel succeeded but replace failed — recover by re-placing. */
  if (
    result.ok &&
    cancelOk &&
    newOrderResult === "FAILED"
  ) {
    const recovered = await placeReplacement();
    rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
    if (!recovered.ok) {
      return {
        ok: false,
        message:
          recovered.message ||
          "Ордер отменён, не удалось перевыставить по новой цене",
        cancelledOrphan: true,
        rateLimited: !!recovered.rateLimited
      };
    }
    const recoveredId = String(
      recovered.data?.order?.orderId ||
        recovered.data?.orderId ||
        recovered.data?.data?.orderId ||
        ""
    ).trim();
    return {
      ok: true,
      orderId: recoveredId || orderId,
      price,
      replaced: true,
      recovered: true
    };
  }

  if (!result.ok) {
    /* Ambiguous network/API failure after possible cancel — try place once. */
    if (cancelResult === "SUCCESS") {
      const recovered = await placeReplacement();
      rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
      if (recovered.ok) {
        const recoveredId = String(
          recovered.data?.order?.orderId ||
            recovered.data?.orderId ||
            ""
        ).trim();
        return {
          ok: true,
          orderId: recoveredId || orderId,
          price,
          replaced: true,
          recovered: true
        };
      }
      return {
        ok: false,
        message:
          recovered.message ||
          result.message ||
          "Ордер отменён, не удалось перевыставить",
        cancelledOrphan: true,
        rateLimited: !!(recovered.rateLimited || result.rateLimited)
      };
    }
    return result;
  }

  if (!placeOk && cancelOk) {
    const recovered = await placeReplacement();
    rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
    if (!recovered.ok) {
      return {
        ok: false,
        message:
          recovered.message ||
          "Ордер отменён, не удалось перевыставить по новой цене",
        cancelledOrphan: true,
        rateLimited: !!recovered.rateLimited
      };
    }
    const recoveredId = String(
      recovered.data?.order?.orderId ||
        recovered.data?.orderId ||
        ""
    ).trim();
    return {
      ok: true,
      orderId: recoveredId || orderId,
      price,
      replaced: true,
      recovered: true
    };
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
  const newOrderId = String(
    data.newOrderId ?? data.orderId ?? orderId
  ).trim();
  return {
    ...result,
    orderId: newOrderId || orderId,
    price,
    replaced: newOrderId !== orderId
  };
}

/**
 * Classify open-order row as position SL or TP (BingX types vary a lot).
 * @param {object} row
 * @param {object} pos
 * @param {"sl"|"tp"} tgt
 */
function isBingxPositionStopRow(row, pos, tgt) {
  const id = String(row?.orderId ?? row?.orderID ?? "").trim();
  const knownId = String(
    (tgt === "sl" ? pos?.slOrderId : pos?.tpOrderId) || ""
  ).trim();
  if (knownId && id && knownId === id) {
    return true;
  }

  const type = String(row?.type ?? row?.orderType ?? "").toUpperCase();
  const stopOrderType = String(row?.stopOrderType ?? row?.ot ?? "")
    .trim()
    .toUpperCase();
  const reduceOnly =
    row?.reduceOnly === true ||
    row?.reduceOnly === "true" ||
    row?.closePosition === true ||
    row?.closePosition === "true" ||
    row?.cp === true ||
    row?.cp === "true";
  const trigger = Number(
    row?.stopPrice ?? row?.triggerPrice ?? row?.activationPrice ?? 0
  );

  const explicitSl =
    type === "STOP_MARKET" ||
    type === "STOP" ||
    type === "STOP_LOSS" ||
    type === "STOP_LOSS_MARKET" ||
    type === "STOP_LIMIT" ||
    stopOrderType === "STOPLOSS" ||
    stopOrderType === "STOP_LOSS" ||
    (stopOrderType.includes("STOP") && !stopOrderType.includes("TAKE"));
  const explicitTp =
    type === "TAKE_PROFIT_MARKET" ||
    type === "TAKE_PROFIT" ||
    type === "TAKE_PROFIT_LIMIT" ||
    stopOrderType === "TAKEPROFIT" ||
    stopOrderType === "TAKE_PROFIT" ||
    stopOrderType.includes("TAKE");

  if (tgt === "sl" && explicitSl && !explicitTp) {
    return true;
  }
  if (tgt === "tp" && explicitTp) {
    return true;
  }

  if (!(trigger > 0) || !Number.isFinite(trigger)) {
    return (
      tgt === "sl" &&
      (type === "TRIGGER_MARKET" || type === "TRIGGER_LIMIT") &&
      reduceOnly
    );
  }

  const entry = Number(pos?.avgPrice) || 0;
  const posSide = String(pos?.positionSide || pos?.side || "")
    .trim()
    .toUpperCase();
  const isLong =
    posSide === "LONG" ||
    posSide === "BUY" ||
    String(pos?.side || "").toLowerCase() === "buy";

  if (tgt === "sl") {
    if (explicitTp) {
      return false;
    }
    if (entry > 0) {
      return isLong ? trigger < entry : trigger > entry;
    }
    return explicitSl || reduceOnly;
  }

  if (explicitSl && !explicitTp) {
    return false;
  }
  if (entry > 0) {
    return isLong ? trigger > entry : trigger < entry;
  }
  return explicitTp;
}

async function fetchOpenOrdersForSymbol(sym) {
  const filtered = await fetchOpenOrderRows({
    symbol: sym,
    forceRefresh: true
  });
  if (filtered.ok && Array.isArray(filtered.rows) && filtered.rows.length) {
    return filtered;
  }
  const all = await fetchOpenOrderRows({ forceRefresh: true });
  if (!all.ok) {
    return filtered.ok ? filtered : all;
  }
  const want = stripSymbolSuffix(sym);
  return {
    ok: true,
    rows: (all.rows || []).filter(
      (row) => stripSymbolSuffix(row?.symbol) === want
    )
  };
}

async function collectPositionStopCancelIds(symbol, target, position) {
  const sym = stripSymbolSuffix(symbol);
  const tgt = String(target || "").toLowerCase();
  const ordersResult = await fetchOpenOrdersForSymbol(sym);
  if (!ordersResult.ok) {
    return ordersResult;
  }

  const knownId = String(
    (tgt === "sl" ? position?.slOrderId : position?.tpOrderId) || ""
  ).trim();
  const toCancel = [];
  if (knownId) {
    toCancel.push(knownId);
  }

  for (const row of ordersResult.rows || []) {
    if (!orderRowSideMatchesPosition(row, position || {})) {
      continue;
    }
    if (!isBingxPositionStopRow(row, position || {}, tgt)) {
      continue;
    }
    const id = String(row.orderId ?? row.orderID ?? "").trim();
    if (id) {
      toCancel.push(id);
    }
  }

  return {
    ok: true,
    ids: [...new Set(toCancel)],
    rows: ordersResult.rows || []
  };
}

const setStopInflightByKey = new Map();

const STOP_CLEAR_TIMEOUT_MS = 5000;
const STOP_CONFIRM_TIMEOUT_MS = 5000;
const STOP_POLL_MS = 220;

/**
 * freshAttach only: if a stop already sits at the requested price, reuse it.
 * Drag/replace must NOT cancel before place — empty window loses the stop on
 * the exchange when place fails or lags.
 */
async function findReusableStopAtPrice(sym, tgt, pos, price) {
  const collected = await collectPositionStopCancelIds(sym, tgt, pos);
  if (!collected.ok) {
    return collected;
  }

  for (const row of collected.rows || []) {
    if (!orderRowSideMatchesPosition(row, pos || {})) {
      continue;
    }
    if (!isBingxPositionStopRow(row, pos || {}, tgt)) {
      continue;
    }
    const id = String(row.orderId ?? row.orderID ?? "").trim();
    if (!id) {
      continue;
    }
    const trigger = Number(
      row.stopPrice ?? row.triggerPrice ?? row.activationPrice ?? 0
    );
    if (stopPricesMatch(trigger, price)) {
      return { ok: true, reusableId: id, existingIds: collected.ids || [] };
    }
  }

  return { ok: true, reusableId: null, existingIds: collected.ids || [] };
}

/**
 * After a successful place: cancel every matching stop except keepId.
 */
async function cancelStopExtrasExcept(sym, tgt, pos, keepId, price) {
  const keep = String(keepId || "").trim();
  if (!keep) {
    return { ok: true };
  }

  const collected = await collectPositionStopCancelIds(sym, tgt, {
    ...pos,
    [tgt === "sl" ? "slOrderId" : "tpOrderId"]: keep,
    [tgt === "sl" ? "stopLoss" : "takeProfit"]: Number(price) || 0
  });
  if (!collected.ok) {
    return collected;
  }

  for (const id of collected.ids || []) {
    if (id === keep) {
      continue;
    }
    await cancelTradeOrder(sym, id, { verify: false });
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
  return { ok: true };
}

async function setPositionStop(symbol, target, price, options = {}) {
  const sym = stripSymbolSuffix(symbol);
  const tgt = String(target || "").toLowerCase();
  const p = Number(price);
  if (!sym || (tgt !== "sl" && tgt !== "tp")) {
    return { ok: false, message: "Invalid stop target" };
  }
  if (!Number.isFinite(p) || p <= 0) {
    return { ok: false, message: "Invalid price" };
  }

  let posHint = options.position || null;
  const sideHint = posHint?.positionSide || options.positionSide || null;
  const lockKey = `${sym}:${String(sideHint || "BOTH").toUpperCase()}:${tgt}`;
  const prevLock = setStopInflightByKey.get(lockKey);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  /* Store the queued promise (not bare gate) so finally can clear correctly. */
  const queued = prevLock ? prevLock.then(() => gate) : gate;
  setStopInflightByKey.set(lockKey, queued);
  if (prevLock) {
    await prevLock;
  }

  let amendKey = null;

  try {
    let pos = options.position || null;
    if (!pos) {
      const posResult = await getPosition(sym, options);
      if (!posResult.ok) {
        return posResult;
      }
      pos = posResult.position;
    }
    if (!pos) {
      return { ok: false, message: "No open position" };
    }

    if (!options.freshAttach) {
      const live = await getPosition(sym, {
        ...options,
        positionSide: pos.positionSide,
        side: pos.side
      });
      if (live?.ok && live.position) {
        pos = {
          ...live.position,
          ...pos,
          slOrderId: pos.slOrderId || live.position.slOrderId,
          tpOrderId: pos.tpOrderId || live.position.tpOrderId,
          avgPrice: Number(pos.avgPrice) || live.position.avgPrice,
          size: Number(pos.size) || live.position.size
        };
      }
    }

    const rules = await getInstrumentRules(sym);
    const priceStr = formatPriceValue(p, rules) || String(p);

    const knownOldId = String(
      (tgt === "sl" ? pos.slOrderId : pos.tpOrderId) || ""
    ).trim();
    const revision = beginStopAmend({
      symbol: sym,
      positionSide: pos.positionSide,
      side: pos.side,
      target: tgt,
      price: p,
      oldOrderIds: knownOldId ? [knownOldId] : [],
      phase: "clearing"
    });
    amendKey = revision.key;

    updateStopAmend(amendKey, { phase: "clearing" });

    /* Snapshot old ids BEFORE place. Cancel them only AFTER a successful place
     * so a failed/lagging place never leaves the exchange with zero stops. */
    const before = await findReusableStopAtPrice(sym, tgt, pos, p);
    if (!before.ok) {
      updateStopAmend(amendKey, { phase: "failed" });
      clearStopAmend(amendKey);
      return before;
    }

    /* Idempotent attach: stop already lives at this price — do not place again. */
    if (options.freshAttach && before.reusableId) {
      /* Sweep duplicates in background — do not block attach/open. */
      void cancelStopExtrasExcept(sym, tgt, pos, before.reusableId, p);
      const nextPosition = {
        ...pos,
        [tgt === "sl" ? "stopLoss" : "takeProfit"]: p,
        [tgt === "sl" ? "slOrderId" : "tpOrderId"]: before.reusableId,
        _stopAmendKey: amendKey,
        _stopAmendConfirmed: true,
        _stopsAuthoritative: true
      };
      updateStopAmend(amendKey, {
        phase: "confirmed",
        newOrderId: before.reusableId
      });
      setTimeout(() => clearStopAmend(amendKey), 2500);
      return {
        ok: true,
        confirmed: true,
        reused: true,
        stopRevision: {
          key: amendKey,
          target: tgt,
          price: p,
          orderId: before.reusableId,
          confirmed: true
        },
        position: nextPosition
      };
    }

    const oldIds = [...(before.existingIds || [])];

    const sides = await resolveCloseSides(pos);
    if (!sides) {
      updateStopAmend(amendKey, { phase: "failed" });
      clearStopAmend(amendKey);
      return { ok: false, message: "Cannot resolve position side" };
    }
    const qtyNum = Math.abs(Number(pos.size) || 0);
    const qtyStr =
      qtyNum > 0
        ? formatQtyValue(qtyNum, decimalsFromStep(rules?.qtyStep))
        : null;
    if (!qtyStr || Number(qtyStr) <= 0) {
      updateStopAmend(amendKey, { phase: "failed" });
      clearStopAmend(amendKey);
      return { ok: false, message: "Invalid position quantity" };
    }

    const type = tgt === "sl" ? "STOP_MARKET" : "TAKE_PROFIT_MARKET";
    const body = {
      symbol: toBingxSymbol(sym),
      side: sides.side,
      positionSide: sides.positionSide,
      type,
      stopPrice: priceStr,
      quantity: qtyStr,
      workingType: "CONTRACT_PRICE"
    };
    if (sides.reduceOnly) {
      body.reduceOnly = "true";
    }

    updateStopAmend(amendKey, { phase: "placed" });
    const placeResult = await signedRequest(
      "POST",
      "/openApi/swap/v2/trade/order",
      body
    );
    if (!placeResult.ok) {
      updateStopAmend(amendKey, { phase: "failed" });
      clearStopAmend(amendKey);
      /* Old stops intentionally left intact. */
      return placeResult;
    }

    rememberOpenOrderRowsCache([]);
    invalidatePositionListCache();
    const placedId = String(
      placeResult.data?.data?.order?.orderId ??
        placeResult.data?.order?.orderId ??
        placeResult.data?.data?.orderId ??
        placeResult.data?.orderId ??
        placeResult.data?.orderID ??
        ""
    ).trim();

    updateStopAmend(amendKey, {
      phase: "placed",
      newOrderId: placedId || null
    });

    /* Cancel previous stops only after place ack — never create an empty gap.
     * Do not await openOrders confirm loops here: that blocked open/drag IPC
     * for seconds and still could not stop UI snap-back. */
    if (placedId) {
      for (const id of oldIds) {
        if (id && id !== placedId) {
          void cancelTradeOrder(sym, id, { verify: false });
        }
      }
      void cancelStopExtrasExcept(sym, tgt, pos, placedId, p).then(() => {
        updateStopAmend(amendKey, { phase: "confirmed" });
        /* Keep amend briefly so stream gate ignores stale old prices. */
        setTimeout(() => {
          const cur = getStopAmend(amendKey);
          if (cur && cur.phase === "confirmed") {
            clearStopAmend(amendKey);
          }
        }, 2500);
      });
    }

    const confirmed = false;

    const nextPosition = {
      ...pos,
      [tgt === "sl" ? "stopLoss" : "takeProfit"]: p,
      [tgt === "sl" ? "slOrderId" : "tpOrderId"]: placedId || null,
      _stopAmendKey: amendKey,
      _stopAmendConfirmed: false
    };

    return {
      ...placeResult,
      ok: true,
      confirmed,
      stopRevision: {
        key: amendKey,
        target: tgt,
        price: p,
        orderId: placedId || null,
        confirmed
      },
      position: nextPosition
    };
  } catch (err) {
    if (amendKey) {
      updateStopAmend(amendKey, { phase: "failed" });
      clearStopAmend(amendKey);
    }
    throw err;
  } finally {
    release();
    if (setStopInflightByKey.get(lockKey) === queued) {
      setStopInflightByKey.delete(lockKey);
    }
  }
}

async function cancelPositionStop(symbol, target, options = {}) {
  const sym = stripSymbolSuffix(symbol);
  const tgt = String(target || "").toLowerCase();
  const posResult = await getPosition(sym, options);
  if (!posResult.ok) {
    return posResult;
  }
  const pos = posResult.position;
  if (tgt === "all" || tgt === "both") {
    return cancelAllStopsForPosition(sym, pos);
  }
  const cancelIds = await collectPositionStopCancelIds(sym, tgt, pos);
  if (!cancelIds.ok) {
    return cancelIds;
  }

  if (!cancelIds.ids.length) {
    clearStopAmendForPositionSafe(pos, tgt);
    return { ok: true, alreadyGone: true };
  }

  const results = await Promise.all(
    cancelIds.ids.map((id) => cancelTradeOrder(sym, id))
  );
  const failed = results.find((r) => r && r.ok === false);
  if (!failed) {
    clearStopAmendForPositionSafe(pos, tgt);
  }
  return failed || { ok: true };
}

async function reconcileOrdersOnPositionOpen() {
  return { ok: true, skipped: true };
}

async function reconcileOrdersOnPositionClose() {
  return { ok: true, skipped: true };
}

async function pingBybit() {
  /* Adapter contract name shared with Bybit; prefer pingExchange. */
  return pingExchange();
}

async function pingExchange() {
  const started = Date.now();
  const pub = await publicGet("/openApi/swap/v2/quote/ticker", {
    symbol: "BTC-USDT"
  });
  const publicMs = Date.now() - started;
  const tradeStarted = Date.now();
  const bal = await getWalletBalance();
  const tradingMs = Date.now() - tradeStarted;
  return {
    ok: pub.ok && bal.ok,
    publicMs,
    tradingMs,
    configured: !!getCredentials(EXCHANGE_ID),
    message: !bal.ok ? bal.message : pub.ok ? null : pub.message
  };
}

/* __BINGX_DIARY_BIND__ */
const bingxDiary = require("./bingx-rest-diary.cjs");
bingxDiary.bindBingxDiaryDeps({
  signedRequest,
  stripSymbolSuffix,
  toBingxSymbol,
  toCanonicalSymbol,
  peekRateLimitBlock,
  extractBingxList
});
const {
  resolveBingxClosedTrade,
  executionsFromBingxClosedTrades,
  getTradeDiaryDetail,
  getClosedPnlHistory,
  enrichClosedPnlTrades,
  mapBingxFillExecution,
  matchBingxRoundTripByAnchor,
  mapBingxPositionHistoryRow,
  buildBingxRoundTripsFromPositionFills
} = bingxDiary;

function decodeWsMessage(data) {
  if (Buffer.isBuffer(data)) {
    const head = data[0];
    if (head === 0x1f && data[1] === 0x8b) {
      try {
        return zlib.gunzipSync(data).toString("utf8");
      } catch {
        /* fall through */
      }
    }
    return data.toString("utf8");
  }
  if (data instanceof ArrayBuffer) {
    return decodeWsMessage(Buffer.from(data));
  }
  return String(data);
}

const bingxSettings = require("./bingx-rest-settings.cjs");
bingxSettings.bindBingxSettingsDeps({
  stripSymbolSuffix,
  signedRequest,
  toBingxSymbol,
  isHedgeMode,
  getAssetMode,
  ensureAccountDefaults,
  PRIORITY
});
const {
  getSymbolPositionSettings,
  applySymbolPositionSettings
} = bingxSettings;

module.exports = {
  EXCHANGE_ID,
  toCanonicalSymbol,
  toBingxSymbol,
  decodeWsMessage,
  isRateLimitError,
  mapApiError,
  getRateLimitBackoffMs,
  peekRateLimitBlock,
  getBingxSchedulerStats,
  PRIORITY,
  invalidatePositionListCache,
  signedRequest,
  rawPositionFromBingx,
  normalizeBingxWsPositionRow,
  normalizeBingxWsOrderRow,
  pickUsdtBalance,
  getWalletBalance,
  fetchPositionListRaw,
  getPositions,
  getOpenOrders,
  getPosition,
  closePositionAtMarket,
  openPositionAtMarket,
  attachAutoStopsAfterOpen,
  cancelPositionStop,
  setPositionStop,
  placeTradeOrder,
  cancelTradeOrder,
  amendTradeOrder,
  reconcileOrdersOnPositionOpen,
  reconcileOrdersOnPositionClose,
  pingBybit,
  pingExchange,
  getClosedPnlHistory,
  enrichClosedPnlTrades,
  getTradeDiaryDetail,
  resolveBingxClosedTrade,
  mapPositionRow,
  mapOrderRow,
  extractBingxList,
  getSymbolPositionSettings,
  buildBingxRoundTripsFromPositionFills,
  matchBingxRoundTripByAnchor,
  executionsFromBingxClosedTrades,
  applySymbolPositionSettings,
  enrichPositionsWithStopOrders,
  invalidateOpenOrderRowsCache,
  fetchOpenOrderRows,
  fetchOpenOrderRowsCached,
  getCachedOpenOrderRows,
  ensureAccountDefaults,
  isHedgeMode,
  getAssetMode,
  setHedgeMode,
  setAssetMode,
  selectPositionFromCandidates,
  resolveCloseSidesSync,
  mapBingxPositionHistoryRow,
  mapBingxFillExecution
};
