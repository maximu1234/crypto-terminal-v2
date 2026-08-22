/**
 * Sparse L2 book indexed by native tick (integer). Deltas are O(1);
 * no sort on the hot path.
 */

function toQty(raw){
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function toPrice(raw){
  if(Array.isArray(raw)){
    return raw[0];
  }
  return raw?.price;
}

function toSizeRaw(raw){
  if(Array.isArray(raw)){
    return raw[1];
  }
  return raw?.size;
}

/**
 * Tick from exchange price strings ("64713.9" → 0.1). Fallback 0.
 * @param {unknown[]} levels
 */
export function inferTickFromLevels(levels){
  if(!Array.isArray(levels)){
    return 0;
  }
  let tick = 0;
  for(const row of levels){
    const key = String(toPrice(row) ?? "").trim();
    if(!key){
      continue;
    }
    const dot = key.indexOf(".");
    const fromDec = dot < 0 ? 1 : 10 ** -(key.length - dot - 1);
    const n = Number(key);
    if(!Number.isFinite(n) || n <= 0){
      continue;
    }
    if(!tick || fromDec < tick){
      tick = fromDec;
    }
  }
  return tick;
}

export function priceToTickIndex(price, nativeTick){
  if(!(nativeTick > 0) || !Number.isFinite(price)){
    return 0;
  }
  return Math.round(price / nativeTick);
}

export function tickIndexToPrice(index, nativeTick){
  if(!(nativeTick > 0)){
    return 0;
  }
  const raw = index * nativeTick;
  const s = nativeTick.toPrecision(12);
  const tick = Number(s);
  if(!(tick > 0)){
    return raw;
  }
  const decimals = decimalsForTick(tick);
  return Number((index * tick).toFixed(decimals));
}

function decimalsForTick(tick){
  if(!(tick > 0)){
    return 6;
  }
  const s = tick.toFixed(12).replace(/\.?0+$/, "");
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function applyLevels(map, levels, nativeTick, sideBest, isBid){
  if(!Array.isArray(levels) || !(nativeTick > 0)){
    return sideBest;
  }
  let best = sideBest;
  let needRescan = false;
  for(const row of levels){
    const price = Number(toPrice(row));
    const qty = toQty(toSizeRaw(row));
    if(!Number.isFinite(price) || price <= 0){
      continue;
    }
    const idx = priceToTickIndex(price, nativeTick);
    if(qty <= 0){
      if(map.delete(idx) && idx === best){
        needRescan = true;
      }
      continue;
    }
    map.set(idx, qty);
    if(best == null){
      best = idx;
    }else if(isBid ? idx > best : idx < best){
      best = idx;
    }
  }
  if(needRescan){
    best = rescanBest(map, isBid);
  }
  return best;
}

function rescanBest(map, isBid){
  if(map.size === 0){
    return null;
  }
  let best = null;
  for(const idx of map.keys()){
    if(best == null){
      best = idx;
      continue;
    }
    if(isBid ? idx > best : idx < best){
      best = idx;
    }
  }
  return best;
}

export function createTickBook(){
  /** @type {Map<number, number>} */
  const bids = new Map();
  /** @type {Map<number, number>} */
  const asks = new Map();
  let nativeTick = 0;
  let lastU = 0;
  let ready = false;
  /** @type {number | null} */
  let bestBidIdx = null;
  /** @type {number | null} */
  let bestAskIdx = null;

  function clear(){
    bids.clear();
    asks.clear();
    lastU = 0;
    ready = false;
    bestBidIdx = null;
    bestAskIdx = null;
    nativeTick = 0;
  }

  function setNativeTick(tick){
    const n = Number(tick);
    if(Number.isFinite(n) && n > 0){
      nativeTick = n;
    }
  }

  function ensureTick(data){
    if(nativeTick > 0){
      return nativeTick;
    }
    const fromAsks = inferTickFromLevels(data?.a || data?.asks);
    const fromBids = inferTickFromLevels(data?.b || data?.bids);
    const t = fromAsks && fromBids ? Math.min(fromAsks, fromBids) : fromAsks || fromBids;
    if(t > 0){
      nativeTick = t;
    }
    return nativeTick;
  }

  function markReady(){
    ready = bids.size > 0 || asks.size > 0;
  }

  function applySnapshot(data){
    bids.clear();
    asks.clear();
    bestBidIdx = null;
    bestAskIdx = null;
    ensureTick(data);
    bestBidIdx = applyLevels(bids, data?.b || data?.bids, nativeTick, null, true);
    bestAskIdx = applyLevels(asks, data?.a || data?.asks, nativeTick, null, false);
    lastU = Number(data?.u) || 0;
    markReady();
    return ready;
  }

  /**
   * @returns {"ok" | "empty" | "resync"}
   */
  function applyDelta(data){
    const u = Number(data?.u);
    const pu = Number(data?.pu);
    if(u === 1 && ready){
      clear();
      return "resync";
    }
    if(
      ready &&
      Number.isFinite(pu) &&
      pu > 0 &&
      lastU > 0 &&
      pu !== lastU
    ){
      clear();
      return "resync";
    }
    ensureTick(data);
    bestBidIdx = applyLevels(
      bids,
      data?.b || data?.bids,
      nativeTick,
      bestBidIdx,
      true
    );
    bestAskIdx = applyLevels(
      asks,
      data?.a || data?.asks,
      nativeTick,
      bestAskIdx,
      false
    );
    if(Number.isFinite(u) && u > 0){
      lastU = u;
    }
    markReady();
    return ready ? "ok" : "empty";
  }

  function replaceBook(data){
    return applySnapshot(data);
  }

  function notionalAtNativeIndex(map, idx){
    const qty = map.get(idx);
    if(!(qty > 0) || !(nativeTick > 0)){
      return 0;
    }
    return tickIndexToPrice(idx, nativeTick) * qty;
  }

  /**
   * USDT notional aggregated into one display bucket.
   * @param {"bid" | "ask"} side
   * @param {number} displayIdx
   * @param {number} scale
   */
  function notionalAtDisplay(side, displayIdx, scale){
    const map = side === "bid" ? bids : asks;
    const s = Math.max(1, Math.round(Number(scale) || 1));
    if(s <= 1){
      return notionalAtNativeIndex(map, displayIdx);
    }
    const start = displayIdx * s;
    let sum = 0;
    for(let i = 0; i < s; i++){
      sum += notionalAtNativeIndex(map, start + i);
    }
    return sum;
  }

  function bestBid(){
    if(bestBidIdx == null || !(nativeTick > 0)){
      return 0;
    }
    return tickIndexToPrice(bestBidIdx, nativeTick);
  }

  function bestAsk(){
    if(bestAskIdx == null || !(nativeTick > 0)){
      return 0;
    }
    return tickIndexToPrice(bestAskIdx, nativeTick);
  }

  function toBook(){
    const bidRows = [];
    for(const [idx, qty] of bids){
      if(!(qty > 0)){
        continue;
      }
      const price = tickIndexToPrice(idx, nativeTick);
      bidRows.push({
        price,
        size: qty,
        notional: price * qty
      });
    }
    bidRows.sort((a, b) => b.price - a.price);
    const askRows = [];
    for(const [idx, qty] of asks){
      if(!(qty > 0)){
        continue;
      }
      const price = tickIndexToPrice(idx, nativeTick);
      askRows.push({
        price,
        size: qty,
        notional: price * qty
      });
    }
    askRows.sort((a, b) => a.price - b.price);
    return {
      bids: bidRows,
      asks: askRows,
      updateId: lastU,
      ready,
      nativeTick
    };
  }

  return {
    clear,
    setNativeTick,
    getNativeTick: () => nativeTick,
    applySnapshot,
    applyDelta,
    replaceBook,
    notionalAtDisplay,
    bestBid,
    bestAsk,
    bestBidIdx: () => bestBidIdx,
    bestAskIdx: () => bestAskIdx,
    toBook,
    isReady: () => ready
  };
}

export function createLiveBook(){
  return createTickBook();
}
