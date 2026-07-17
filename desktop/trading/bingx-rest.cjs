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
const CLOSED_PNL_CACHE_MS = 5 * 60 * 1000;
const closedPnlCacheByKey = new Map();

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
  const cancelable =
    options.cancelable === true ||
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
    const matching = rows.filter(
      (r) =>
        stripSymbolSuffix(r.symbol) === sym &&
        orderRowSideMatchesPosition(r, pos)
    );
    let stopLoss = Number(pos.stopLoss) || 0;
    let takeProfit = Number(pos.takeProfit) || 0;
    let slOrderId = pos.slOrderId || null;
    let tpOrderId = pos.tpOrderId || null;
    let slAt = -1;
    let tpAt = -1;

    for (const row of matching) {
      const type = String(row.type ?? row.orderType ?? "").toUpperCase();
      const stopOrderType = String(row.stopOrderType ?? row.ot ?? "").trim();
      const trigger = Number(row.stopPrice ?? row.triggerPrice ?? 0);
      const id = String(row.orderId ?? row.orderID ?? "");
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
        stopOrderType === "StopLoss" ||
        (type === "TRIGGER_MARKET" && reduceOnly);
      const isTpType =
        type === "TAKE_PROFIT_MARKET" ||
        type === "TAKE_PROFIT" ||
        stopOrderType === "TakeProfit";
      if (isSlType) {
        if (at >= slAt) {
          stopLoss = trigger;
          slOrderId = id || slOrderId;
          slAt = at;
        }
      }
      if (isTpType) {
        if (at >= tpAt) {
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

  const qtyStr = qtyFromVolumeUsdt(vol, refPrice, rules);
  if (!qtyStr || Number(qtyStr) <= 0) {
    return { ok: false, message: "Volume too small" };
  }

  const sides = await resolveOpenSides(sideNorm);
  const body = {
    symbol: toBingxSymbol(sym),
    side: sides.side,
    positionSide: sides.positionSide,
    type: "MARKET",
    quantity: qtyStr
  };

  /* Never attach stopLoss JSON — `{` breaks HMAC (100001). Place after fill. */
  const orderResult = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/order",
    body
  );
  if (orderResult?.ok === false) {
    return orderResult;
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();

  const isLong = sideNorm === "Buy";
  const qtyNum = Number(qtyStr);
  const orderData =
    orderResult?.data?.order ||
    orderResult?.data ||
    orderResult?.order ||
    {};
  const avgFromOrder = Number(
    orderData.avgPrice ?? orderData.averagePrice ?? 0
  );
  const entry = avgFromOrder > 0 ? avgFromOrder : refPrice;

  /* Fast IPC ack: no REST poll / stop attach in the critical path.
   * SL/TP: renderer applyAutoStopsAfterEntry (attachStopsInMainProcess=false). */
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
    _optimisticAt: Date.now()
  };

  return {
    ...orderResult,
    position,
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
  const posResult = await getPosition(sym, opts);
  if (!posResult.ok) {
    return posResult;
  }
  if (!posResult.position) {
    return { ok: true, position: null, alreadyClosed: true };
  }

  const pos = posResult.position;
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

  /* BingX does not always drop STOP/TP with the position — cancel first. */
  const stopsCancel = await cancelAllStopsForPosition(sym, pos);
  if (stopsCancel?.ok === false && !stopsCancel?.rateLimited) {
    /* Soft-continue: still attempt market close so user is not stuck. */
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

  const result = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/order",
    body
  );
  if (result?.ok) {
    rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
    /* Second pass — catch race where STOP orders appear after first scan. */
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

  /* BingX /amend only adjusts quantity — price/trigger edits need cancelReplace. */
  const ordersResult = await fetchOpenOrderRows({
    symbol: sym,
    forceRefresh: true
  });
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
    type === "TAKE_PROFIT_MARKET" ||
    type === "TAKE_PROFIT" ||
    kind === "stop";

  const body = {
    symbol: toBingxSymbol(sym),
    cancelOrderId: orderId,
    cancelReplaceMode: "STOP_ON_FAILURE",
    side,
    positionSide,
    type,
    quantity: qtyStr
  };

  if (isTrigger) {
    body.stopPrice = priceStr;
    body.price = priceStr;
    body.workingType =
      String(row.workingType || "MARK_PRICE").toUpperCase() || "MARK_PRICE";
  } else {
    body.price = priceStr;
    body.timeInForce = String(row.timeInForce || "GTC").toUpperCase() || "GTC";
  }

  const reduceOnly =
    row.reduceOnly === true ||
    row.reduceOnly === "true" ||
    row.reduceOnly === "TRUE";
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

async function collectPositionStopCancelIds(symbol, target, position) {
  const sym = stripSymbolSuffix(symbol);
  const tgt = String(target || "").toLowerCase();
  const ordersResult = await fetchOpenOrderRows({
    symbol: sym,
    forceRefresh: true
  });
  if (!ordersResult.ok) {
    return ordersResult;
  }

  const wantTypes =
    tgt === "sl"
      ? ["STOP_MARKET", "STOP"]
      : ["TAKE_PROFIT_MARKET", "TAKE_PROFIT"];
  const knownId = tgt === "sl" ? position?.slOrderId : position?.tpOrderId;
  const wantSide = String(position?.positionSide || "").toUpperCase();

  const toCancel = [];
  for (const row of ordersResult.rows || []) {
    const type = String(row.type ?? row.orderType ?? "").toUpperCase();
    const id = String(row.orderId ?? row.orderID ?? "");
    if (!id) {
      continue;
    }
    const rowSide = String(row.positionSide || "").toUpperCase();
    if (
      wantSide &&
      wantSide !== "BOTH" &&
      rowSide &&
      rowSide !== "BOTH" &&
      rowSide !== wantSide
    ) {
      continue;
    }
    if (knownId && id === String(knownId)) {
      toCancel.push(id);
      continue;
    }
    if (wantTypes.includes(type)) {
      toCancel.push(id);
    }
  }

  return {
    ok: true,
    ids: [...new Set(toCancel)]
  };
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

  const rules = await getInstrumentRules(sym);
  const priceStr = formatPriceValue(p, rules) || String(p);
  const knownId = tgt === "sl" ? pos.slOrderId : pos.tpOrderId;

  if (knownId) {
    const amendResult = await amendTradeOrder({
      symbol: sym,
      orderId: knownId,
      price: p,
      orderKind: "stop"
    });
    if (amendResult.ok) {
      rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
      return {
        ...amendResult,
        position: {
          ...pos,
          [tgt === "sl" ? "stopLoss" : "takeProfit"]: p
        }
      };
    }
  }

  if (!options.freshAttach) {
    const cancelIds = await collectPositionStopCancelIds(sym, tgt, pos);
    if (!cancelIds.ok) {
      return cancelIds;
    }
    for (const id of cancelIds.ids || []) {
      await cancelTradeOrder(sym, id);
    }
  }

  const sides = await resolveCloseSides(pos);
  if (!sides) {
    return { ok: false, message: "Cannot resolve position side" };
  }
  const qtyNum = Math.abs(Number(pos.size) || 0);
  const qtyStr =
    qtyNum > 0
      ? formatQtyValue(qtyNum, decimalsFromStep(rules?.qtyStep))
      : null;
  if (!qtyStr || Number(qtyStr) <= 0) {
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
    workingType: "MARK_PRICE"
  };
  if (sides.reduceOnly) {
    body.reduceOnly = "true";
  }

  const placeResult = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/order",
    body
  );
  if (!placeResult.ok) {
    return placeResult;
  }

  rememberOpenOrderRowsCache([]);
  invalidatePositionListCache();
  const placedId = String(
    placeResult.data?.data?.order?.orderId ??
      placeResult.data?.order?.orderId ??
      placeResult.data?.data?.orderId ??
      ""
  );

  return {
    ...placeResult,
    position: {
      ...pos,
      [tgt === "sl" ? "stopLoss" : "takeProfit"]: p,
      [tgt === "sl" ? "slOrderId" : "tpOrderId"]: placedId || knownId || null
    }
  };
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
    return { ok: true, alreadyGone: true };
  }

  const results = await Promise.all(
    cancelIds.ids.map((id) => cancelTradeOrder(sym, id))
  );
  const failed = results.find((r) => r && r.ok === false);
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

async function fetchBingxIncomeRows(options = {}) {
  const params = {
    limit: String(Math.min(1000, Number(options.limit) || 1000))
  };
  if (Number.isFinite(options.startTime)) {
    params.startTime = String(Math.floor(options.startTime));
  }
  if (Number.isFinite(options.endTime)) {
    params.endTime = String(Math.floor(options.endTime));
  }
  if (options.incomeType) {
    params.incomeType = String(options.incomeType);
  }
  if (options.symbol) {
    params.symbol = toBingxSymbol(options.symbol);
  }

  const reqOpts =
    options.priority != null
      ? {
          priority: options.priority
        }
      : {};
  const result = await signedRequest(
    "GET",
    "/openApi/swap/v2/user/income",
    params,
    reqOpts
  );
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    rows: extractBingxList(result.data, ["list", "income", "data"])
  };
}

/** BingX positionHistory allows ≤3 months per request. */
const POSITION_HISTORY_MAX_SPAN_MS = 90 * 24 * 60 * 60 * 1000;

async function fetchBingxPositionHistoryPages(
  symbol,
  startTs,
  endTs,
  options = {}
) {
  const sym = toBingxSymbol(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  const rows = [];
  let windowStart = Math.floor(startTs);
  const rangeEnd = Math.floor(endTs);
  const priority =
    options.priority != null ? options.priority : PRIORITY.background;

  while (windowStart <= rangeEnd) {
    const windowEnd = Math.min(
      rangeEnd,
      windowStart + POSITION_HISTORY_MAX_SPAN_MS
    );
    for (let page = 1; page <= 20; page++) {
      const result = await signedRequest(
        "GET",
        "/openApi/swap/v1/trade/positionHistory",
        {
          symbol: sym,
          startTs: String(windowStart),
          endTs: String(windowEnd),
          pageIndex: String(page),
          pageSize: "100"
        },
        {
          priority
        }
      );
      if (!result.ok) {
        return result;
      }
      const chunk = extractBingxList(result.data, [
        "positionHistory",
        "list",
        "data"
      ]);
      rows.push(...chunk);
      if (chunk.length < 100) {
        break;
      }
    }
    if (windowEnd >= rangeEnd) {
      break;
    }
    windowStart = windowEnd + 1;
  }

  return { ok: true, rows };
}

function parseBingxTimeMs(value) {
  if (value == null || value === "") {
    return NaN;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return NaN;
    }
    /* Seconds vs milliseconds */
    return value < 1e12 ? Math.floor(value * 1000) : Math.floor(value);
  }
  const raw = String(value).trim();
  if (!raw) {
    return NaN;
  }
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) {
      return NaN;
    }
    return n < 1e12 ? Math.floor(n * 1000) : Math.floor(n);
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function pickBingxNumber(row, keys) {
  if (!row || typeof row !== "object") {
    return 0;
  }
  for (const key of keys) {
    const n = Number(row[key]);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }
  return 0;
}

function mapBingxPositionHistoryRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const closeTimeMs = parseBingxTimeMs(
    row.updateTime ??
      row.closeTime ??
      row.time ??
      row.update_time ??
      row.close_time
  );
  if (!Number.isFinite(closeTimeMs) || closeTimeMs <= 0) {
    return null;
  }
  const openTimeMs = parseBingxTimeMs(row.openTime ?? row.open_time);
  const openMs =
    Number.isFinite(openTimeMs) && openTimeMs > 0 && openTimeMs <= closeTimeMs
      ? openTimeMs
      : closeTimeMs;
  const pnl = Number(
    row.netProfit ??
      row.net_profit ??
      row.realisedProfit ??
      row.realised_profit ??
      row.realizedPnl ??
      row.profit ??
      row.pnl
  );
  if (!Number.isFinite(pnl)) {
    return null;
  }
  const qty = Math.abs(
    Number(
      row.closePositionAmt ??
        row.close_position_amt ??
        row.positionAmt ??
        row.position_amt ??
        row.qty
    ) || 0
  );
  const avgEntryPrice = pickBingxNumber(row, [
    "avgPrice",
    "avg_price",
    "openAvgPrice",
    "avgOpenPrice",
    "entryPrice",
    "openPrice"
  ]);
  const avgExitPrice = pickBingxNumber(row, [
    "avgClosePrice",
    "avg_close_price",
    "closeAvgPrice",
    "avgExitPrice",
    "closePrice",
    "exitPrice"
  ]);
  const entryValue =
    avgEntryPrice > 0 && qty > 0 ? avgEntryPrice * qty : 0;
  const commissionUsd = Math.abs(
    Number(row.positionCommission ?? row.position_commission) || 0
  );
  const sideRaw = String(
    row.positionSide || row.position_side || row.side || ""
  ).toUpperCase();
  /* Diary + chart markers expect long|short (Bybit closed-PnL shape). */
  let side =
    sideRaw === "SHORT" || sideRaw === "SELL" ? "short" : "long";
  /* One-way mode often reports BOTH — infer from entry/exit vs PnL. */
  if (
    (sideRaw === "BOTH" || !sideRaw) &&
    avgEntryPrice > 0 &&
    avgExitPrice > 0 &&
    Number.isFinite(pnl)
  ) {
    const priceUp = avgExitPrice >= avgEntryPrice;
    if (pnl >= 0) {
      side = priceUp ? "long" : "short";
    } else {
      side = priceUp ? "short" : "long";
    }
  }
  const positionId = String(row.positionId || row.position_id || "");

  return {
    symbol: toCanonicalSymbol(row.symbol),
    closeTimeMs,
    openTimeMs: openMs,
    durationMs: Math.max(0, closeTimeMs - openMs),
    pnlUsd: pnl,
    pnlPct: entryValue > 0 ? (pnl / entryValue) * 100 : 0,
    commissionUsd,
    side,
    qty,
    avgEntryPrice,
    avgExitPrice,
    leverage: Math.max(1, Math.round(Number(row.leverage) || 1)),
    positionId,
    orderId: positionId || String(row.orderId || "")
  };
}

function mapBingxIncomeToSparseTrade(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const type = String(row.incomeType || "").toUpperCase();
  if (type && type !== "REALIZED_PNL") {
    return null;
  }
  const pnl = Number(row.income);
  const closeTimeMs = parseBingxTimeMs(row.time);
  if (!Number.isFinite(pnl) || !Number.isFinite(closeTimeMs)) {
    return null;
  }
  const symbol = toCanonicalSymbol(row.symbol);
  if (!symbol) {
    return null;
  }
  return {
    symbol,
    closeTimeMs,
    openTimeMs: closeTimeMs,
    listCloseTimeMs: closeTimeMs,
    durationMs: 0,
    pnlUsd: pnl,
    pnlPct: 0,
    commissionUsd: 0,
    /* Unknown until positionHistory enrich — do not default to long. */
    side: "",
    qty: 0,
    avgEntryPrice: 0,
    avgExitPrice: 0,
    leverage: 1,
    orderId: String(row.tranId || row.tradeId || closeTimeMs),
    sparse: true
  };
}

function mapBingxFillExecution(row) {
  if (!row || typeof row !== "object") {
    return null;
  }
  const execTimeMs = parseBingxTimeMs(
    row.time ??
      row.filledTime ??
      row.filledTm ??
      row.tradeTime ??
      row.fillTime ??
      row.transactTime
  );
  const execPrice = pickBingxNumber(row, [
    "price",
    "filledPrice",
    "fillsPrice",
    "avgPrice",
    "tradePrice"
  ]);
  const execQty = Math.abs(
    Number(
      row.qty ??
        row.volume ??
        row.filledQty ??
        row.fillQty ??
        row.quantity
    ) || 0
  );
  if (
    !Number.isFinite(execTimeMs) ||
    !Number.isFinite(execPrice) ||
    execPrice <= 0 ||
    execQty <= 0
  ) {
    return null;
  }
  const sideRaw = String(row.side || row.orderSide || "").toUpperCase();
  if (
    sideRaw !== "BUY" &&
    sideRaw !== "SELL" &&
    sideRaw !== "ASK" &&
    sideRaw !== "BID"
  ) {
    return null;
  }
  const side =
    sideRaw === "SELL" || sideRaw === "ASK" ? "Sell" : "Buy";
  const positionSideRaw = String(
    row.positionSide || row.position_side || ""
  ).toUpperCase();
  const positionSide =
    positionSideRaw === "LONG" || positionSideRaw === "SHORT"
      ? positionSideRaw
      : "";
  const execFee = Math.abs(Number(row.fee ?? row.commission) || 0);
  const execValue = execPrice * execQty;
  return {
    symbol: toCanonicalSymbol(row.symbol),
    execTimeMs,
    side,
    positionSide,
    execPrice,
    execQty,
    execFee,
    execValue,
    feeRate: execValue > 0 ? (execFee / execValue) * 100 : 0,
    orderId: String(row.orderId || ""),
    execId: String(row.tradeId || row.fillId || "")
  };
}

function synthesizeBingxTradeExecutions(options = {}) {
  const sideNorm = String(options.side || "").toLowerCase();
  if (sideNorm !== "long" && sideNorm !== "short") {
    return [];
  }
  const isLong = sideNorm === "long";
  const openMs = Number(options.openTimeMs);
  const closeMs = Number(options.closeTimeMs);
  const entry = Number(options.avgEntryPrice);
  const exit = Number(options.avgExitPrice);
  const qty = Math.abs(Number(options.qty) || 0);
  const out = [];

  if (Number.isFinite(openMs) && openMs > 0 && entry > 0) {
    out.push({
      execTimeMs: openMs,
      side: isLong ? "Buy" : "Sell",
      execPrice: entry,
      execQty: qty,
      execFee: 0,
      execValue: entry * qty,
      feeRate: 0,
      orderId: String(options.orderId || options.positionId || ""),
      execId: `synth-entry-${openMs}`,
      synthetic: true
    });
  }

  if (Number.isFinite(closeMs) && closeMs > 0 && exit > 0) {
    out.push({
      execTimeMs: closeMs,
      side: isLong ? "Sell" : "Buy",
      execPrice: exit,
      execQty: qty,
      execFee: 0,
      execValue: exit * qty,
      feeRate: 0,
      orderId: String(options.orderId || options.positionId || ""),
      execId: `synth-exit-${closeMs}`,
      synthetic: true
    });
  }

  return out;
}

/** BingX fillHistory / allFillOrders — keep windows ≤ ~30 days. */
const FILL_HISTORY_MAX_SPAN_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fills only — never pass positionId as orderId (BingX rejects / returns empty).
 * allFillOrders max useful window ~30d; diary detail uses a tight trade window.
 */
async function fetchBingxFillRows({
  symbol,
  startTs,
  endTs,
  orderId,
  priority
}) {
  const bingxSym = toBingxSymbol(symbol);
  const reqOpts =
    priority != null
      ? {
          priority
        }
      : {};
  const baseParams = {
    startTs: String(Math.floor(startTs)),
    endTs: String(Math.floor(endTs))
  };
  /* Callers must pass a real orderId — never positionId (empty result). */
  if (orderId != null && String(orderId).trim() !== "") {
    baseParams.orderId = String(orderId).trim();
  }

  /* Prefer fillHistory — requires symbol, returns fill_orders. */
  if (bingxSym) {
    const hist = await signedRequest(
      "GET",
      "/openApi/swap/v2/trade/fillHistory",
      {
        ...baseParams,
        symbol: bingxSym,
        pageIndex: "1",
        pageSize: "100"
      },
      reqOpts
    );
    if (hist.ok) {
      const rows = extractBingxList(hist.data, [
        "fill_history_orders",
        "fill_orders",
        "fillOrders",
        "list",
        "orders",
        "data"
      ]);
      if (rows.length) {
        return { ok: true, rows };
      }
    } else if (hist.rateLimited) {
      return hist;
    }
  }

  const allParams = {
    ...baseParams,
    tradingUnit: "COIN"
  };
  if (bingxSym) {
    allParams.symbol = bingxSym;
  }

  const allFills = await signedRequest(
    "GET",
    "/openApi/swap/v2/trade/allFillOrders",
    allParams,
    reqOpts
  );
  if (!allFills.ok) {
    return allFills;
  }

  return {
    ok: true,
    rows: extractBingxList(allFills.data, [
      "fill_orders",
      "fillOrders",
      "list",
      "orders",
      "data"
    ])
  };
}

async function fetchBingxFillRowsPaged(
  symbol,
  startTs,
  endTs,
  options = {}
) {
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  const rows = [];
  let windowStart = Math.floor(startTs);
  const rangeEnd = Math.floor(endTs);
  const priority =
    options.priority != null ? options.priority : PRIORITY.background;

  while (windowStart <= rangeEnd) {
    const windowEnd = Math.min(
      rangeEnd,
      windowStart + FILL_HISTORY_MAX_SPAN_MS
    );
    const chunk = await fetchBingxFillRows({
      symbol: sym,
      startTs: windowStart,
      endTs: windowEnd,
      priority
    });
    if (!chunk.ok) {
      return chunk;
    }
    rows.push(...(chunk.rows || []));
    if (windowEnd >= rangeEnd) {
      break;
    }
    windowStart = windowEnd + 1;
  }

  return { ok: true, rows };
}

function vwapFromExecutions(rows) {
  if (!rows?.length) {
    return 0;
  }
  let notional = 0;
  let qty = 0;
  for (const ex of rows) {
    const q = Math.abs(Number(ex.execQty) || 0);
    const p = Number(ex.execPrice) || 0;
    if (q > 0 && p > 0) {
      notional += p * q;
      qty += q;
    }
  }
  return qty > 0 ? notional / qty : 0;
}

/**
 * Build closed position cycles from fills using BingX positionSide.
 * LONG: Buy opens/adds, Sell closes. SHORT: Sell opens/adds, Buy closes.
 * The side is explicit exchange data — never inferred from chronology.
 */
function buildBingxRoundTripsFromPositionFills(fills) {
  const sorted = (fills || [])
    .filter(
      (ex) =>
        ex &&
        (ex.positionSide === "LONG" || ex.positionSide === "SHORT") &&
        Number(ex.execTimeMs) > 0 &&
        Number(ex.execQty) > 0
    )
    .sort((a, b) => a.execTimeMs - b.execTimeMs);
  const out = [];

  for (const positionSide of ["LONG", "SHORT"]) {
    const entrySide = positionSide === "LONG" ? "Buy" : "Sell";
    const exitSide = positionSide === "LONG" ? "Sell" : "Buy";
    let openQty = 0;
    let entries = [];
    let exits = [];

    for (const ex of sorted) {
      if (ex.positionSide !== positionSide) {
        continue;
      }
      const qty = Math.abs(Number(ex.execQty) || 0);
      if (!(qty > 0)) {
        continue;
      }
      if (ex.side === entrySide) {
        if (!(openQty > 1e-12)) {
          entries = [];
          exits = [];
        }
        entries.push(ex);
        openQty += qty;
        continue;
      }
      if (ex.side !== exitSide || !(openQty > 1e-12)) {
        continue;
      }

      exits.push(ex);
      openQty -= qty;
      if (openQty > 1e-9) {
        continue;
      }

      const openTimeMs = entries[0]?.execTimeMs;
      const closeTimeMs = exits[exits.length - 1]?.execTimeMs;
      if (closeTimeMs > openTimeMs) {
        const entryQty = entries.reduce(
          (sum, row) => sum + Number(row.execQty || 0),
          0
        );
        out.push({
          side: positionSide === "SHORT" ? "short" : "long",
          positionSide,
          openTimeMs,
          closeTimeMs,
          durationMs: closeTimeMs - openTimeMs,
          avgEntryPrice: vwapFromExecutions(entries),
          avgExitPrice: vwapFromExecutions(exits),
          qty: entryQty,
          entries: entries.slice(),
          exits: exits.slice(),
          executions: [...entries, ...exits].sort(
            (a, b) => a.execTimeMs - b.execTimeMs
          ),
          sparse: false
        });
      }
      openQty = 0;
      entries = [];
      exits = [];
    }
  }

  return out.sort((a, b) => a.closeTimeMs - b.closeTimeMs);
}

function matchBingxRoundTripByAnchor(roundTrips, anchorTimeMs) {
  const anchorMs = Number(anchorTimeMs);
  if (!Number.isFinite(anchorMs)) {
    return null;
  }
  const closeTolMs = 5 * 60 * 1000;
  const openTolMs = 5 * 60 * 1000;
  let best = null;
  let bestScore = Infinity;
  for (const trade of roundTrips || []) {
    const openMs = Number(trade.openTimeMs);
    const closeMs = Number(trade.closeTimeMs);
    if (!(closeMs > openMs)) {
      continue;
    }
    const closeDist = Math.abs(closeMs - anchorMs);
    const openDist = Math.abs(openMs - anchorMs);
    const contains = openMs <= anchorMs && anchorMs <= closeMs;
    let score = Infinity;
    if (closeDist <= closeTolMs) {
      score = closeDist;
    } else if (openDist <= openTolMs) {
      /* Income time often equals open fill, not close. */
      score = 1e12 + openDist;
    } else if (contains) {
      score = 2e12 + Math.min(closeDist, openDist);
    }
    if (score < bestScore) {
      bestScore = score;
      best = trade;
    }
  }
  return best;
}

/** @deprecated alias — prefer matchBingxRoundTripByAnchor */
function matchBingxRoundTripByClose(roundTrips, closeTimeMs) {
  return matchBingxRoundTripByAnchor(roundTrips, closeTimeMs);
}

function executionsFromBingxClosedTrades(trades) {
  const out = [];
  for (const trade of trades || []) {
    const openMs = Number(trade?.openTimeMs);
    const closeMs = Number(trade?.closeTimeMs);
    if (
      !Number.isFinite(openMs) ||
      !Number.isFinite(closeMs) ||
      openMs <= 0 ||
      closeMs <= 0 ||
      openMs === closeMs
    ) {
      continue;
    }
    const side = String(trade?.side || "").toLowerCase();
    if (side !== "long" && side !== "short") {
      continue;
    }
    const isLong = side === "long";
    out.push({
      execTimeMs: openMs,
      side: isLong ? "Buy" : "Sell"
    });
    out.push({
      execTimeMs: closeMs,
      side: isLong ? "Sell" : "Buy"
    });
  }
  return out;
}

async function resolveBingxTradePrices(options = {}) {
  let avgEntryPrice = Number(options.avgEntryPrice) || 0;
  let avgExitPrice = Number(options.avgExitPrice) || 0;
  let qty = Math.abs(Number(options.qty) || 0);
  let side = options.side;

  const symbol = stripSymbolSuffix(options.symbol);
  const openTimeMs = Number(options.openTimeMs);
  const closeTimeMs = Number(options.closeTimeMs);
  const positionId = String(
    options.positionId || options.orderId || ""
  );
  const sparse =
    options.sparse === true ||
    options.sparse === "true" ||
    (Number.isFinite(openTimeMs) &&
      Number.isFinite(closeTimeMs) &&
      openTimeMs === closeTimeMs);

  if (
    !symbol ||
    !Number.isFinite(closeTimeMs)
  ) {
    return { avgEntryPrice, avgExitPrice, qty, side };
  }

  const hist = await fetchBingxPositionHistoryPages(
    symbol,
    Math.max(
      0,
      (Number.isFinite(openTimeMs) && openTimeMs > 0 && openTimeMs < closeTimeMs
        ? openTimeMs
        : closeTimeMs) -
        14 * 24 * 60 * 60 * 1000
    ),
    closeTimeMs + 60 * 60 * 1000
  );

  const want = toCanonicalSymbol(symbol);
  const mapped = (hist.ok ? hist.rows || [] : [])
    .map(mapBingxPositionHistoryRow)
    .filter(Boolean)
    .filter((t) => t.symbol === want);

  let match =
    positionId && !sparse
      ? mapped.find(
          (t) =>
            t.positionId === positionId || t.orderId === positionId
        )
      : null;

  /* Match by close/open/contain — income time may be open or close. */
  if (!match) {
    match = matchBingxRoundTripByAnchor(mapped, closeTimeMs);
  }

  if (!match && mapped.length === 1) {
    match = mapped[0];
  }

  if (match) {
    avgEntryPrice = match.avgEntryPrice || avgEntryPrice || 0;
    avgExitPrice = match.avgExitPrice || avgExitPrice || 0;
    qty = match.qty || qty || 0;
    /* positionHistory side is authoritative (short opens with Sell). */
    side = match.side || side;
    return {
      avgEntryPrice,
      avgExitPrice,
      qty,
      side,
      openTimeMs: match.openTimeMs,
      closeTimeMs: match.closeTimeMs,
      positionId: match.positionId
    };
  }

  /*
   * BingX returns an empty positionHistory for historical One-way trades.
   * allFillOrders still carries explicit positionSide=LONG|SHORT, so build
   * position cycles from that authoritative field.
   */
  /* Sparse income often stamps open time as close — look forward for exit. */
  const lookForwardMs =
    sparse ||
    !(
      Number.isFinite(openTimeMs) &&
      openTimeMs > 0 &&
      openTimeMs < closeTimeMs
    )
      ? 7 * 24 * 60 * 60 * 1000
      : 15 * 60 * 1000;
  const fillResult = await fetchBingxFillRowsPaged(
    symbol,
    Math.max(0, closeTimeMs - FILL_HISTORY_MAX_SPAN_MS),
    closeTimeMs + lookForwardMs,
    { priority: PRIORITY.normal }
  );
  if (fillResult.ok) {
    const executions = (fillResult.rows || [])
      .map(mapBingxFillExecution)
      .filter(Boolean)
      .filter((ex) => !ex.symbol || ex.symbol === want);
    const fillTrade = matchBingxRoundTripByAnchor(
      buildBingxRoundTripsFromPositionFills(executions),
      closeTimeMs
    );
    if (fillTrade) {
      return {
        avgEntryPrice: fillTrade.avgEntryPrice || avgEntryPrice || 0,
        avgExitPrice: fillTrade.avgExitPrice || avgExitPrice || 0,
        qty: fillTrade.qty || qty || 0,
        side: fillTrade.side,
        openTimeMs: fillTrade.openTimeMs,
        closeTimeMs: fillTrade.closeTimeMs,
        entries: fillTrade.entries,
        exits: fillTrade.exits,
        executions: fillTrade.executions,
        source: "position-side-fills"
      };
    }
  }

  return { avgEntryPrice, avgExitPrice, qty, side };
}

async function getTradeDiaryDetail(options = {}) {
  const symbol = stripSymbolSuffix(options.symbol);
  const anchorOpenMs = Number(options.openTimeMs);
  const anchorCloseMs = Number(options.closeTimeMs);

  if (
    !symbol ||
    !Number.isFinite(anchorOpenMs) ||
    !Number.isFinite(anchorCloseMs)
  ) {
    return { ok: false, message: "Некорректные параметры сделки" };
  }

  const sparse =
    options.sparse === true ||
    options.sparse === "true" ||
    anchorOpenMs === anchorCloseMs;

  /*
   * Never trust list/cache side when the row is still sparse — old caches
   * poisoned Shorts as Long and that blocked correct fill-cycle matching.
   */
  const hintSide = sparse
    ? ""
    : String(options.side || "").toLowerCase();

  const want = toCanonicalSymbol(symbol);
  let openTimeMs = anchorOpenMs;
  let closeTimeMs = anchorCloseMs;
  let side = hintSide === "long" || hintSide === "short" ? hintSide : "";
  let avgEntryPrice = Number(options.avgEntryPrice) || 0;
  let avgExitPrice = Number(options.avgExitPrice) || 0;
  let qty = Math.abs(Number(options.qty) || 0);
  let positionId = options.positionId || "";
  let entries = [];
  let exits = [];
  let executions = [];
  let fillsOk = true;
  let fillsMessage = null;

  /* 1) positionHistory when available */
  const hist = await fetchBingxPositionHistoryPages(
    symbol,
    Math.max(0, Math.min(anchorOpenMs, anchorCloseMs) - 14 * 24 * 60 * 60 * 1000),
    Math.max(anchorOpenMs, anchorCloseMs) + 60 * 60 * 1000,
    { priority: PRIORITY.normal }
  );
  if (hist.ok) {
    const mapped = (hist.rows || [])
      .map(mapBingxPositionHistoryRow)
      .filter(Boolean)
      .filter((t) => t.symbol === want);
    const match = matchBingxRoundTripByAnchor(mapped, anchorCloseMs);
    if (match && match.closeTimeMs > match.openTimeMs) {
      openTimeMs = match.openTimeMs;
      closeTimeMs = match.closeTimeMs;
      side = match.side || side;
      avgEntryPrice = match.avgEntryPrice || avgEntryPrice;
      avgExitPrice = match.avgExitPrice || avgExitPrice;
      qty = match.qty || qty;
      positionId = match.positionId || positionId;
    }
  }

  /* 2) Authoritative SHORT/LONG from allFillOrders.positionSide */
  const lookBackMs = FILL_HISTORY_MAX_SPAN_MS;
  const lookForwardMs =
    sparse || !(closeTimeMs > openTimeMs)
      ? 7 * 24 * 60 * 60 * 1000
      : 15 * 60 * 1000;
  const fillResult = await fetchBingxFillRowsPaged(
    symbol,
    Math.max(0, Math.min(anchorOpenMs, anchorCloseMs) - lookBackMs),
    Math.max(anchorOpenMs, anchorCloseMs) + lookForwardMs,
    { priority: PRIORITY.normal }
  );
  if (!fillResult.ok) {
    fillsOk = false;
    fillsMessage = fillResult.message || null;
  } else {
    const fillExecs = (fillResult.rows || [])
      .map(mapBingxFillExecution)
      .filter(Boolean)
      .filter((ex) => !ex.symbol || ex.symbol === want)
      .sort((a, b) => a.execTimeMs - b.execTimeMs);
    const fillTrade = matchBingxRoundTripByAnchor(
      buildBingxRoundTripsFromPositionFills(fillExecs),
      anchorCloseMs
    );
    if (fillTrade && fillTrade.closeTimeMs > fillTrade.openTimeMs) {
      openTimeMs = fillTrade.openTimeMs;
      closeTimeMs = fillTrade.closeTimeMs;
      side = fillTrade.side;
      avgEntryPrice = fillTrade.avgEntryPrice || avgEntryPrice;
      avgExitPrice = fillTrade.avgExitPrice || avgExitPrice;
      qty = fillTrade.qty || qty;
      entries = fillTrade.entries.slice();
      exits = fillTrade.exits.slice();
      executions = fillTrade.executions.slice();
    } else if (closeTimeMs > openTimeMs) {
      /* Keep fills inside the resolved open/close window for the table. */
      const pad = 15 * 60 * 1000;
      executions = fillExecs.filter(
        (ex) =>
          ex.execTimeMs >= openTimeMs - pad &&
          ex.execTimeMs <= closeTimeMs + pad
      );
    }
  }

  const isShort = side === "short";
  const isLong = side === "long";
  const sideKnown = isShort || isLong;
  const openSideFinal = isShort ? "Sell" : "Buy";
  const closeSideFinal = isShort ? "Buy" : "Sell";

  if (sideKnown) {
    if (!entries.length) {
      entries = executions.filter((ex) => ex.side === openSideFinal);
    }
    if (!exits.length) {
      exits = executions.filter((ex) => ex.side === closeSideFinal);
    }
  }

  if (!avgEntryPrice && entries.length) {
    avgEntryPrice = vwapFromExecutions(entries);
  }
  if (!avgExitPrice && exits.length) {
    avgExitPrice = vwapFromExecutions(exits);
  }
  if (!qty && sideKnown) {
    qty = Math.max(
      entries.reduce((s, ex) => s + ex.execQty, 0),
      exits.reduce((s, ex) => s + ex.execQty, 0)
    );
  }

  if (!executions.length && sideKnown && avgEntryPrice > 0 && avgExitPrice > 0) {
    executions = synthesizeBingxTradeExecutions({
      side,
      openTimeMs,
      closeTimeMs,
      avgEntryPrice,
      avgExitPrice,
      qty,
      positionId,
      orderId: options.orderId
    });
    entries = executions.filter((ex) => ex.side === openSideFinal);
    exits = executions.filter((ex) => ex.side === closeSideFinal);
  }

  return {
    ok: true,
    executions,
    entries,
    exits,
    side: isShort ? "short" : isLong ? "long" : "",
    openTimeMs,
    closeTimeMs,
    durationMs: Math.max(0, closeTimeMs - openTimeMs),
    avgEntryPrice: avgEntryPrice || 0,
    avgExitPrice: avgExitPrice || 0,
    positionId,
    fillsOk,
    fillsMessage
  };
}

function closedPnlCacheKey(startTime, endTime, symbol) {
  return `${Math.floor(startTime)}:${Math.floor(endTime)}:${symbol || "*"}`;
}

function readClosedPnlCache(key) {
  const hit = closedPnlCacheByKey.get(key);
  if (!hit) {
    return null;
  }
  if (Date.now() - hit.at > CLOSED_PNL_CACHE_MS) {
    closedPnlCacheByKey.delete(key);
    return null;
  }
  return {
    ...hit.result,
    trades: Array.isArray(hit.result.trades) ? [...hit.result.trades] : []
  };
}

function writeClosedPnlCache(key, result) {
  if (!result?.ok || !Array.isArray(result.trades)) {
    return;
  }
  closedPnlCacheByKey.set(key, {
    at: Date.now(),
    result: {
      ...result,
      trades: [...result.trades]
    }
  });
}

function serveClosedPnlCacheOrBlock(key, blocked) {
  const cached = readClosedPnlCache(key);
  if (cached) {
    return {
      ...cached,
      ok: true,
      stale: true,
      fromCache: true
    };
  }
  return (
    blocked || {
      ok: false,
      rateLimited: true,
      message: "BingX rate limit — подождите"
    }
  );
}

/**
 * BingX diary list: income-first (PnL $ usable immediately).
 * No O(symbols)×positionHistory fan-out on boot — enrich lazily via
 * getTradeDiaryDetail when the user expands a trade.
 *
 * Single-symbol requests (Terminal «История сделок»):
 * positionHistory + income + one paged fillHistory window → real open/close
 * and `executions` for chart markers (positionHistory alone is incomplete:
 * ~1 month / hedge-only / missing openTime).
 */
async function getClosedPnlHistory(options = {}) {
  const endTime = Number.isFinite(Number(options.endTime))
    ? Number(options.endTime)
    : Date.now();
  const startTime = Number.isFinite(Number(options.startTime))
    ? Number(options.startTime)
    : endTime - 7 * 24 * 60 * 60 * 1000;

  if (endTime < startTime) {
    return { ok: false, message: "Invalid time range" };
  }

  const symbolFilter = stripSymbolSuffix(options.symbol);
  const cacheKey = closedPnlCacheKey(startTime, endTime, symbolFilter);
  const forceRefresh = options.forceRefresh === true;

  if (!forceRefresh) {
    const blocked = peekRateLimitBlock();
    if (blocked) {
      return serveClosedPnlCacheOrBlock(cacheKey, blocked);
    }
    const cached = readClosedPnlCache(cacheKey);
    if (cached) {
      /* Invalidate caches created before positionSide-aware fill cycles. */
      if (
        symbolFilter &&
        cached.markerSchema !== 6
      ) {
        closedPnlCacheByKey.delete(cacheKey);
      } else if (
        symbolFilter &&
        Array.isArray(cached.trades) &&
        cached.trades.some(
          (t) =>
            t?.sparse ||
            !Number.isFinite(Number(t?.openTimeMs)) ||
            Number(t.openTimeMs) === Number(t.closeTimeMs)
        )
      ) {
        closedPnlCacheByKey.delete(cacheKey);
      } else {
        return {
          ...cached,
          fromCache: true,
          stale: false
        };
      }
    }
  } else {
    const blocked = peekRateLimitBlock();
    if (blocked) {
      return serveClosedPnlCacheOrBlock(cacheKey, blocked);
    }
    if (symbolFilter) {
      closedPnlCacheByKey.delete(cacheKey);
    }
  }

  /*
   * Terminal markers use explicit exchange position direction:
   * positionHistory when available; otherwise allFillOrders.positionSide.
   * Buy/Sell chronology never decides Long/Short.
   */
  if (symbolFilter) {
    const want = toCanonicalSymbol(symbolFilter);
    const hist = await fetchBingxPositionHistoryPages(
      symbolFilter,
      Math.max(0, startTime - 2 * 24 * 60 * 60 * 1000),
      endTime + 60 * 60 * 1000
    );
    if (!hist.ok && hist.rateLimited) {
      return serveClosedPnlCacheOrBlock(cacheKey, hist);
    }

    let trades = (hist.ok ? hist.rows || [] : [])
      .map(mapBingxPositionHistoryRow)
      .filter(Boolean)
      .filter((t) => t.symbol === want)
      .filter(
        (t) =>
          t.openTimeMs > 0 &&
          t.closeTimeMs > t.openTimeMs &&
          t.closeTimeMs >= startTime &&
          t.closeTimeMs <= endTime
      )
      .map((t) => ({ ...t, sparse: false }));
    let source = "position-history-v6";
    let partial = false;

    if (!trades.length) {
      const fills = await fetchBingxFillRowsPaged(
        symbolFilter,
        Math.max(0, endTime - FILL_HISTORY_MAX_SPAN_MS),
        endTime + 15 * 60 * 1000,
        { priority: PRIORITY.normal }
      );
      if (!fills.ok && fills.rateLimited) {
        return serveClosedPnlCacheOrBlock(cacheKey, fills);
      }
      if (fills.ok) {
        trades = buildBingxRoundTripsFromPositionFills(
          (fills.rows || [])
            .map(mapBingxFillExecution)
            .filter(Boolean)
            .filter((ex) => !ex.symbol || ex.symbol === want)
        ).filter(
          (t) =>
            t.closeTimeMs >= startTime &&
            t.closeTimeMs <= endTime
        );
        source = "position-side-fills-v6";
      } else {
        partial = true;
      }
    }

    trades.sort((a, b) => b.closeTimeMs - a.closeTimeMs);
    const executions = executionsFromBingxClosedTrades(trades);

    const result = {
      ok: true,
      trades,
      executions,
      sparse: false,
      enriched: true,
      partial,
      historyFails: hist.ok ? 0 : 1,
      historyAttempted: 1,
      symbolsCapped: false,
      source,
      markerSchema: 6
    };
    writeClosedPnlCache(cacheKey, result);
    return result;
  }

  const incomeResult = await fetchBingxIncomeRows({
    startTime,
    endTime,
    incomeType: "REALIZED_PNL"
  });
  if (!incomeResult.ok) {
    if (incomeResult.rateLimited) {
      return serveClosedPnlCacheOrBlock(cacheKey, incomeResult);
    }
    return incomeResult;
  }

  const trades = [];
  const seenKeys = new Set();
  for (const row of incomeResult.rows || []) {
    const trade = mapBingxIncomeToSparseTrade(row);
    if (!trade) {
      continue;
    }
    if (trade.closeTimeMs < startTime || trade.closeTimeMs > endTime) {
      continue;
    }
    const key = `income:${trade.symbol}:${trade.orderId}`;
    if (seenKeys.has(key)) {
      continue;
    }
    seenKeys.add(key);
    trades.push(trade);
  }

  trades.sort((a, b) => b.closeTimeMs - a.closeTimeMs);
  const result = {
    ok: true,
    trades,
    sparse: trades.some((t) => t.sparse),
    enriched: false,
    partial: false,
    historyFails: 0,
    historyAttempted: 0,
    symbolsCapped: false,
    source: "income"
  };
  writeClosedPnlCache(cacheKey, result);
  return result;
}

/**
 * Background diary enrich. Prefer positionHistory; when BingX returns no
 * rows, use explicit allFillOrders.positionSide cycles.
 */
async function enrichClosedPnlTrades(options = {}) {
  const startTime = Number(options.startTime);
  const endTime = Number(options.endTime);
  const input = Array.isArray(options.trades) ? options.trades : [];
  if (
    !input.length ||
    !Number.isFinite(startTime) ||
    !Number.isFinite(endTime) ||
    endTime < startTime
  ) {
    return {
      ok: false,
      message: "Некорректные параметры обогащения"
    };
  }

  const need = input.filter(
    (t) =>
      t?.sparse ||
      !String(t?.side || "").trim() ||
      !Number.isFinite(Number(t?.openTimeMs)) ||
      Number(t.openTimeMs) === Number(t.closeTimeMs) ||
      !Number(t?.durationMs)
  );
  const symbols = [
    ...new Set(
      need
        .map((t) => toCanonicalSymbol(t.symbol))
        .filter(Boolean)
    )
  ].slice(0, 20);

  const closedTradesBySymbol = new Map();
  for (const symbol of symbols) {
    const hist = await fetchBingxPositionHistoryPages(
      symbol,
      Math.max(0, startTime - 2 * 24 * 60 * 60 * 1000),
      endTime + 60 * 60 * 1000
    );
    if (!hist.ok && hist.rateLimited) {
      break;
    }
    let rows = (hist.ok ? hist.rows || [] : [])
        .map(mapBingxPositionHistoryRow)
        .filter(Boolean)
        .filter((t) => t.symbol === symbol);

    if (!rows.length) {
      const fills = await fetchBingxFillRowsPaged(
        symbol,
        Math.max(0, startTime - FILL_HISTORY_MAX_SPAN_MS),
        endTime + 15 * 60 * 1000,
        { priority: PRIORITY.background }
      );
      if (!fills.ok && fills.rateLimited) {
        break;
      }
      if (fills.ok) {
        rows = buildBingxRoundTripsFromPositionFills(
          (fills.rows || [])
            .map(mapBingxFillExecution)
            .filter(Boolean)
            .filter((ex) => !ex.symbol || ex.symbol === symbol)
        );
      }
    }
    closedTradesBySymbol.set(symbol, rows);
  }

  const trades = input.map((trade) => {
    const sym = toCanonicalSymbol(trade.symbol);
    const rows = closedTradesBySymbol.get(sym);
    if (!rows?.length) {
      return trade;
    }
    const closeMs = Number(trade.closeTimeMs);
    const match = matchBingxRoundTripByAnchor(rows, closeMs);
    if (!match || !(match.closeTimeMs > match.openTimeMs)) {
      return trade;
    }
    return {
      ...trade,
      listCloseTimeMs:
        Number(trade.listCloseTimeMs) || Number(trade.closeTimeMs) || closeMs,
      openTimeMs: match.openTimeMs,
      closeTimeMs: match.closeTimeMs,
      durationMs: match.durationMs,
      side: match.side,
      avgEntryPrice: match.avgEntryPrice || trade.avgEntryPrice || 0,
      avgExitPrice: match.avgExitPrice || trade.avgExitPrice || 0,
      qty: match.qty || trade.qty || 0,
      positionId: match.positionId || trade.positionId || "",
      pnlUsd: Number.isFinite(match.pnlUsd) ? match.pnlUsd : trade.pnlUsd,
      sparse: false
    };
  });

  return {
    ok: true,
    trades
  };
}

async function getSymbolPositionSettings(symbol) {
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  const hedge = await isHedgeMode();
  const assetMode = await getAssetMode();
  const levResult = await signedRequest(
    "GET",
    "/openApi/swap/v2/trade/leverage",
    { symbol: toBingxSymbol(sym) },
    { priority: PRIORITY.normal }
  );
  const marginResult = await signedRequest(
    "GET",
    "/openApi/swap/v2/trade/marginType",
    { symbol: toBingxSymbol(sym) },
    { priority: PRIORITY.normal }
  );
  const levData = levResult.data?.data ?? levResult.data ?? {};
  const marginData = marginResult.data?.data ?? marginResult.data ?? {};
  return {
    ok: true,
    symbol: sym,
    leverage: Number(levData.longLeverage ?? levData.leverage ?? 0) || null,
    marginMode:
      String(marginData.marginType || "").toUpperCase() === "ISOLATED"
        ? "isolated"
        : "cross",
    hedgeMode: hedge,
    assetMode
  };
}

async function applySymbolPositionSettings(symbol, settings = {}) {
  await ensureAccountDefaults();
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }

  const notes = [];
  const bingxSym = toBingxSymbol(sym);

  const marginMode = String(settings.marginMode || "cross").toLowerCase();
  const marginType = marginMode === "isolated" ? "ISOLATED" : "CROSSED";
  const marginResult = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/marginType",
    {
      symbol: bingxSym,
      marginType
    }
  );
  if (marginResult.ok) {
    notes.push(`margin:${marginType}`);
  }

  const leverage = Number(settings.leverage);
  if (Number.isFinite(leverage) && leverage > 0) {
    const hedge = await isHedgeMode();
    if (hedge) {
      for (const side of ["LONG", "SHORT"]) {
        const levResult = await signedRequest(
          "POST",
          "/openApi/swap/v2/trade/leverage",
          {
            symbol: bingxSym,
            side,
            leverage: String(Math.round(leverage))
          }
        );
        if (levResult.ok) {
          notes.push(`leverage:${side}:${Math.round(leverage)}`);
        }
      }
    } else {
      const levResult = await signedRequest(
        "POST",
        "/openApi/swap/v2/trade/leverage",
        {
          symbol: bingxSym,
          side: "BOTH",
          leverage: String(Math.round(leverage))
        }
      );
      if (levResult.ok) {
        notes.push(`leverage:${Math.round(leverage)}`);
      }
    }
  }

  return { ok: true, notes };
}

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
