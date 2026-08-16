/**
 * Scalping DOM depth feed — Worker owns WS + book; this file is the host.
 */
import {
jsUrl
} from "../asset-manifest.js?v=2";

import {
loadMarketOrderbook
} from "../market-api.js?v=5";

import {
EXCHANGE_CHANGED_EVENT,
getActiveExchangeId
} from "../exchanges/context.js?v=1";

import {
getBybitWsUrl,
rotateBybitWsEndpoint
} from "../bybit-fetch.js?v=17";

import {
getBingxWsUrl
} from "../exchanges/bingx/fetch.js?v=5";

import {
applyPositionOverlays,
applySlTpHighlights,
resolvePositionOverlays,
resolveSlTpPrices
} from "./position-overlay.js?v=6";

import {
applyAlertUnderlines,
resolveAlertPrices
} from "./alert-overlay.js?v=3";

import {
applyTriggerUnderlines,
hydrateOpenOrdersFromApi,
ingestOpenOrders,
resolveTriggerLevels
} from "./trigger-order-overlay.js?v=2";

import {
getScalpingDomAutocenterPct,
getScalpingDomPriceScale
} from "./prefs.js?v=4";

import {
BYBIT_DOM_DEPTH
} from "./depth-ws-bybit.js?v=4";

const REST_WAIT_MS =
1800;

function normalizeSymbol(raw){
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\.P$/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

let lastChartSymbol = "";

function readChartSymbol(){
  if(lastChartSymbol){
    return lastChartSymbol;
  }
  const label = document.getElementById("current-symbol")?.textContent || "";
  return normalizeSymbol(label);
}

function decodeFrame(data){
  const n = data.rowCount | 0;
  const prices = data.prices;
  const sizes = data.sizes;
  const sides = data.sides;
  const flags = data.flags;
  const rows = [];
  for(let i = 0; i < n; i++){
    const sideBits = sides[i];
    rows.push({
      price: prices[i],
      size: sizes[i],
      side: sideBits > 0 ? "ask" : sideBits < 0 ? "bid" : "hole",
      touch: (flags[i] & 1) !== 0,
      major: (flags[i] & 2) !== 0
    });
  }
  return {
    rows,
    bestAsk: data.bestAsk,
    bestBid: data.bestBid,
    mid: data.mid,
    tick: data.tick,
    nativeTick: data.nativeTick,
    maxSize: data.maxSize,
    recentered: data.recentered,
    viewOffset: data.viewOffset,
    updatedAt: Date.now()
  };
}

/**
 * @param {{
 *   onLadder: (ladder: object | null) => void,
 *   onSymbol: (symbol: string) => void,
 *   onStatus: (text: string) => void
 * }} handlers
 */
export function createDepthFeed(handlers){
  let stopped = false;
  let symbol = "";
  let worker = null;
  let restInflight = false;
  let restWaitTimer = 0;
  let gotFrame = false;
  let overlayCache = null;
  let overlayCacheAt = 0;
  let viewRows = 48;
  let viewOffset = 0;
  let hover = false;

  const OVERLAY_CACHE_MS = 300;

  function restDepth(){
    return getActiveExchangeId() === "bingx" ? 100 : BYBIT_DOM_DEPTH;
  }

  function post(msg){
    try{
      worker?.postMessage(msg);
    }catch{
      /* ignore */
    }
  }

  function workerConfig(){
    return {
      exchange: getActiveExchangeId() === "bingx" ? "bingx" : "bybit",
      bybitWsUrl: getBybitWsUrl(),
      bingxWsUrl: getBingxWsUrl(),
      priceScale: getScalpingDomPriceScale(),
      autocenterPct: getScalpingDomAutocenterPct(),
      viewRows,
      viewOffset,
      hover
    };
  }

  function applyOverlays(ladder){
    if(!ladder){
      return null;
    }
    const now = performance.now();
    if(
      !overlayCache ||
      overlayCache.symbol !== symbol ||
      now - overlayCacheAt >= OVERLAY_CACHE_MS
    ){
      overlayCache = {
        symbol,
        overlays: resolvePositionOverlays(symbol, {
          mid: ladder.mid,
          bestBid: ladder.bestBid,
          bestAsk: ladder.bestAsk
        }),
        alerts: resolveAlertPrices(symbol),
        triggers: resolveTriggerLevels(symbol),
        slTp: resolveSlTpPrices(symbol)
      };
      overlayCacheAt = now;
    }
    const withPos = applyPositionOverlays(ladder, overlayCache.overlays);
    const withAlerts = applyAlertUnderlines(withPos, overlayCache.alerts);
    const withTriggers = applyTriggerUnderlines(withAlerts, overlayCache.triggers);
    return applySlTpHighlights(withTriggers, overlayCache.slTp);
  }

  function onWorkerMessage(event){
    const msg = event?.data;
    if(!msg || stopped){
      return;
    }
    if(msg.type === "frame"){
      gotFrame = true;
      if(restWaitTimer){
        clearTimeout(restWaitTimer);
        restWaitTimer = 0;
      }
      if(typeof msg.viewOffset === "number"){
        viewOffset = msg.viewOffset | 0;
      }
      handlers.onLadder?.(applyOverlays(decodeFrame(msg)));
      return;
    }
    if(msg.type === "status"){
      handlers.onStatus?.(msg.text || "");
      return;
    }
    if(msg.type === "symbol"){
      handlers.onSymbol?.(msg.symbol || symbol);
      return;
    }
    if(msg.type === "needResync"){
      void restSnapshot("resync");
      return;
    }
    if(msg.type === "wsFailed"){
      rotateBybitWsEndpoint();
      post({
        type: "config",
        ...workerConfig(),
        rebuildWs: true
      });
      return;
    }
    if(msg.type === "wsClosed"){
      void restSnapshot("reconnect");
    }
  }

  async function restSnapshot(reason){
    if(stopped || !symbol || restInflight){
      return;
    }
    restInflight = true;
    try{
      const snap = await loadMarketOrderbook(symbol, restDepth());
      if(stopped){
        return;
      }
      post({
        type: "snapshot",
        bids: snap?.bids,
        asks: snap?.asks
      });
      handlers.onStatus?.("");
    }catch(err){
      if(!stopped && !gotFrame){
        handlers.onStatus?.(
          err?.message ? String(err.message) : "Ошибка стакана"
        );
      }
    }finally{
      restInflight = false;
    }
    void reason;
  }

  function armRestWait(){
    if(restWaitTimer){
      clearTimeout(restWaitTimer);
    }
    restWaitTimer = setTimeout(() => {
      restWaitTimer = 0;
      if(!stopped && !gotFrame){
        void restSnapshot("wait");
      }
    }, REST_WAIT_MS);
  }

  function spawnWorker(){
    destroyWorker();
    const url = jsUrl("scalping-dom/depth-worker.js");
    try{
      worker = new Worker(url, { type: "module", name: "scalping-dom-depth" });
    }catch(err){
      handlers.onStatus?.(
        err?.message ? String(err.message) : "Worker стакана недоступен"
      );
      worker = null;
      return false;
    }
    worker.onmessage = onWorkerMessage;
    worker.onerror = (err) => {
      handlers.onStatus?.(
        err?.message ? String(err.message) : "Ошибка worker стакана"
      );
    };
    return true;
  }

  function destroyWorker(){
    if(restWaitTimer){
      clearTimeout(restWaitTimer);
      restWaitTimer = 0;
    }
    try{
      post({ type: "stop" });
      worker?.terminate();
    }catch{
      /* ignore */
    }
    worker = null;
  }

  function startWorkerForSymbol(sym){
    gotFrame = false;
    overlayCache = null;
    if(!worker && !spawnWorker()){
      return;
    }
    post({
      type: "start",
      symbol: sym,
      ...workerConfig()
    });
    armRestWait();
  }

  function setActiveSymbol(next){
    const sym = normalizeSymbol(next);
    if(!sym){
      return;
    }
    if(sym === symbol && worker){
      handlers.onSymbol?.(symbol);
      return;
    }
    symbol = sym;
    handlers.onSymbol?.(symbol);
    handlers.onLadder?.(null);
    overlayCache = null;
    viewOffset = 0;
    startWorkerForSymbol(symbol);
  }

  function setView(patch){
    if(patch.viewRows != null){
      viewRows = Math.max(8, Math.round(Number(patch.viewRows) || viewRows));
    }
    if(patch.viewOffset != null){
      viewOffset = patch.viewOffset | 0;
    }
    if(patch.hover != null){
      hover = patch.hover === true;
    }
    post({
      type: "config",
      viewRows,
      viewOffset,
      hover
    });
  }

  function invalidateOverlayCache(){
    overlayCache = null;
    overlayCacheAt = 0;
  }

  const onSymbolChanged = (e) => {
    const next = normalizeSymbol(e?.detail?.symbol);
    if(next){
      lastChartSymbol = next;
      setActiveSymbol(next);
    }
  };

  const onCandlesLoaded = (e) => {
    const next = normalizeSymbol(e?.detail?.symbol);
    if(next){
      lastChartSymbol = next;
      setActiveSymbol(next);
    }
  };

  const onExchangeChanged = () => {
    if(stopped){
      return;
    }
    viewOffset = 0;
    startWorkerForSymbol(symbol);
    void hydrateOpenOrdersFromApi();
  };

  const onAlertsChanged = () => {
    if(stopped){
      return;
    }
    invalidateOverlayCache();
    post({ type: "config" });
  };

  const onOrdersChanged = (event) => {
    if(stopped){
      return;
    }
    const list = event?.detail?.orders;
    if(Array.isArray(list)){
      ingestOpenOrders(list);
    }
    invalidateOverlayCache();
    post({ type: "config" });
  };

  function start(){
    if(stopped){
      return;
    }
    symbol = readChartSymbol();
    handlers.onSymbol?.(symbol);
    window.addEventListener("coins-chart-symbol-changed", onSymbolChanged);
    window.addEventListener("chart-candles-loaded", onCandlesLoaded);
    window.addEventListener(EXCHANGE_CHANGED_EVENT, onExchangeChanged);
    window.addEventListener("price-alerts-changed", onAlertsChanged);
    window.addEventListener("alerts-changed", onAlertsChanged);
    window.addEventListener("alerts-registry-pulled", onAlertsChanged);
    window.addEventListener("trade-stream-orders", onOrdersChanged);
    window.addEventListener("trade-orders-refresh", onOrdersChanged);
    window.addEventListener("trade-book-refresh", onOrdersChanged);
    window.addEventListener("trade-stream-positions", onAlertsChanged);
    startWorkerForSymbol(symbol);
    void hydrateOpenOrdersFromApi();
  }

  function stop(){
    stopped = true;
    destroyWorker();
    overlayCache = null;
    window.removeEventListener("coins-chart-symbol-changed", onSymbolChanged);
    window.removeEventListener("chart-candles-loaded", onCandlesLoaded);
    window.removeEventListener(EXCHANGE_CHANGED_EVENT, onExchangeChanged);
    window.removeEventListener("price-alerts-changed", onAlertsChanged);
    window.removeEventListener("alerts-changed", onAlertsChanged);
    window.removeEventListener("alerts-registry-pulled", onAlertsChanged);
    window.removeEventListener("trade-stream-orders", onOrdersChanged);
    window.removeEventListener("trade-orders-refresh", onOrdersChanged);
    window.removeEventListener("trade-book-refresh", onOrdersChanged);
    window.removeEventListener("trade-stream-positions", onAlertsChanged);
  }

  return {
    start,
    stop,
    refresh: () => restSnapshot("manual"),
    rebuild: () => {
      post({
        type: "config",
        ...workerConfig()
      });
    },
    setView
  };
}
