/**
 * Dedicated worker: parse depth WS, maintain tick book, emit visible slice.
 * No DOM. Main thread only paints canvas + overlays.
 */
import {
createTickBook
} from "./tick-book.js?v=2";

import {
buildVisibleSliceFromTickBook
} from "./ladder-slice.js?v=4";

import {
createBybitDepthWs,
BYBIT_DOM_DEPTH
} from "./depth-ws-bybit.js?v=4";

import {
createBingxDepthWs
} from "./depth-ws-bingx.js?v=5";

const book =
createTickBook();

let exchange =
"bybit";
let symbol =
"";
let bybitWsUrl =
"";
let bingxWsUrl =
"";
let priceScale =
1;
let autocenterPct =
85;
let viewRows =
48;
let viewOffset =
0;
let hover =
false;
let sticky =
null;
let ws =
null;
let stopped =
false;
let dirty =
false;
let frameTimer =
0;

function clearFrameTimer(){
  if(!frameTimer){
    return;
  }
  if(typeof cancelAnimationFrame === "function"){
    cancelAnimationFrame(frameTimer);
  }else{
    clearTimeout(frameTimer);
  }
  frameTimer =
  0;
}

function postStatus(text){
  postMessage({
    type: "status",
    text: text || ""
  });
}

function postFrame(slice){
  const rows = slice.rows || [];
  const n = rows.length;
  const prices = new Float64Array(n);
  const sizes = new Float64Array(n);
  const sides = new Int8Array(n);
  const flags = new Uint8Array(n);
  for(let i = 0; i < n; i++){
    const row = rows[i];
    prices[i] = row.price;
    sizes[i] = row.size;
    sides[i] = row.side === "ask" ? 1 : row.side === "bid" ? -1 : 0;
    flags[i] = (row.touch ? 1 : 0)
      | (row.major ? 2 : 0)
      | (row.touchAsk ? 4 : 0)
      | (row.touchBid ? 8 : 0);
  }
  postMessage(
    {
      type: "frame",
      tick: slice.tick,
      nativeTick: slice.nativeTick,
      bestBid: slice.bestBid,
      bestAsk: slice.bestAsk,
      mid: slice.mid,
      maxSize: slice.maxSize,
      recentered: slice.recentered,
      viewOffset: slice.viewOffset,
      rowCount: n,
      prices,
      sizes,
      sides,
      flags
    },
    [prices.buffer, sizes.buffer, sides.buffer, flags.buffer]
  );
}

function emitFrame(){
  if(stopped || !book.isReady()){
    return;
  }
  const slice = buildVisibleSliceFromTickBook(book, {
    priceScale,
    sticky,
    viewRows,
    viewOffset,
    hover,
    autocenterPct
  });
  sticky = slice.sticky || sticky;
  viewOffset = slice.viewOffset | 0;
  postFrame(slice);
}

function scheduleFrame(){
  dirty = true;
  if(stopped || frameTimer){
    return;
  }
  const run = () => {
    frameTimer = 0;
    if(!dirty || stopped){
      return;
    }
    dirty = false;
    emitFrame();
  };
  if(typeof requestAnimationFrame === "function"){
    frameTimer = requestAnimationFrame(run);
  }else{
    frameTimer = setTimeout(run, 16);
  }
}

function destroyWs(){
  try{
    ws?.stop();
  }catch{
    /* ignore */
  }
  ws = null;
}

function attachBybit(){
  return createBybitDepthWs({
    getWsUrl: () => bybitWsUrl,
    onRotateEndpoint: () => {
      postMessage({ type: "wsFailed", exchange: "bybit" });
    },
    onOpen: () => postStatus(""),
    onClose: () => {
      if(!stopped){
        postMessage({ type: "wsClosed", exchange: "bybit" });
      }
    },
    onStatus: (text) => postStatus(text),
    onSnapshot: (data) => {
      book.applySnapshot(data);
      sticky = null;
      scheduleFrame();
    },
    onDelta: (data) => {
      if(!book.isReady()){
        return;
      }
      const result = book.applyDelta(data);
      if(result === "resync"){
        postMessage({
          type: "needResync",
          exchange: "bybit",
          depth: BYBIT_DOM_DEPTH
        });
        return;
      }
      scheduleFrame();
    }
  });
}

function attachBingx(){
  return createBingxDepthWs({
    getWsUrl: () => bingxWsUrl,
    onOpen: () => postStatus(""),
    onClose: () => {
      if(!stopped){
        postMessage({ type: "wsClosed", exchange: "bingx" });
      }
    },
    onStatus: (text) => postStatus(text),
    onBook: (data) => {
      book.replaceBook(data);
      scheduleFrame();
    }
  });
}

function startWs(){
  destroyWs();
  book.clear();
  sticky = null;
  if(!symbol){
    return;
  }
  ws = exchange === "bingx" ? attachBingx() : attachBybit();
  ws.start(symbol);
}

function applyConfig(msg){
  if(msg.bybitWsUrl != null){
    bybitWsUrl = String(msg.bybitWsUrl || "");
  }
  if(msg.bingxWsUrl != null){
    bingxWsUrl = String(msg.bingxWsUrl || "");
  }
  if(msg.priceScale != null){
    priceScale = Number(msg.priceScale) || 1;
  }
  if(msg.autocenterPct != null){
    autocenterPct = Number(msg.autocenterPct) || 85;
  }
  if(msg.viewRows != null){
    viewRows = Math.max(8, Math.round(Number(msg.viewRows) || 48));
  }
  if(msg.viewOffset != null){
    viewOffset = msg.viewOffset | 0;
  }
  if(msg.hover != null){
    hover = msg.hover === true;
  }
  if(msg.nativeTick != null){
    book.setNativeTick(msg.nativeTick);
  }
}

self.onmessage = (event) => {
  const msg = event?.data;
  if(!msg || typeof msg !== "object"){
    return;
  }

  switch(msg.type){
    case "start":
      stopped = false;
      applyConfig(msg);
      exchange = String(msg.exchange || "bybit").toLowerCase() === "bingx"
        ? "bingx"
        : "bybit";
      symbol = String(msg.symbol || "").trim().toUpperCase();
      startWs();
      break;

    case "setSymbol":
      applyConfig(msg);
      exchange = String(msg.exchange || exchange).toLowerCase() === "bingx"
        ? "bingx"
        : "bybit";
      symbol = String(msg.symbol || "").trim().toUpperCase();
      startWs();
      postMessage({ type: "symbol", symbol });
      break;

    case "config":
      applyConfig(msg);
      if(msg.rebuildWs){
        startWs();
      }else{
        scheduleFrame();
      }
      break;

    case "snapshot":
      book.applySnapshot(msg);
      sticky = null;
      scheduleFrame();
      break;

    case "stop":
      stopped = true;
      clearFrameTimer();
      destroyWs();
      book.clear();
      sticky = null;
      break;

    default:
      break;
  }
};
