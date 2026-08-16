/**
 * Visible ladder slice from a tick-indexed book. No full-book sort.
 */
import {
stickyHalfSpanForScale,
makeStickyPriceRange,
stickyRangeNeedsRecenter
} from "./depth-store.js?v=10";

const HARD_MAX_ROWS =
320;

function roundTick(value){
  if(!Number.isFinite(value) || value <= 0){
    return 0;
  }
  return Number(value.toPrecision(12));
}

function normalizePriceScale(raw){
  const n = Number(raw);
  if(!Number.isFinite(n) || n <= 0){
    return 1;
  }
  return n;
}

function decimalsForTick(tick){
  if(!(tick > 0)){
    return 6;
  }
  const s = tick.toFixed(12).replace(/\.?0+$/, "");
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function isMajorPrice(price, tick){
  if(!(tick > 0)){
    return false;
  }
  return Math.round(price / tick) % 10 === 0;
}

export function displayTickFor(nativeTick, priceScale){
  const scale = normalizePriceScale(priceScale);
  if(!(nativeTick > 0)){
    return 0;
  }
  return roundTick(nativeTick * scale);
}

/**
 * @param {{ high: number, low: number, tick: number } | null} sticky
 * @param {number} mid
 * @param {number} displayTick
 * @param {number} priceScale
 * @param {number} autocenterPct
 * @param {boolean} hover
 * @returns {{ sticky: ReturnType<typeof makeStickyPriceRange>, recentered: boolean, resetView: boolean }}
 */
export function stepStickyRange(
sticky,
mid,
displayTick,
priceScale,
autocenterPct,
hover
){
  const half = stickyHalfSpanForScale(priceScale);
  if(!sticky || sticky.tick !== displayTick){
    return {
      sticky: makeStickyPriceRange(mid, displayTick, half),
      recentered: true,
      resetView: true
    };
  }
  if(!hover && stickyRangeNeedsRecenter(sticky, mid, autocenterPct)){
    return {
      sticky: makeStickyPriceRange(mid, displayTick, half),
      recentered: true,
      resetView: true
    };
  }
  return {
    sticky,
    recentered: false,
    resetView: false
  };
}

/**
 * Display-tick indices to paint (high → low).
 */
export function visibleDisplayIndexRange(
sticky,
mid,
viewRows,
viewOffset
){
  const tick = sticky?.tick || 0;
  const rows = Math.max(8, Math.min(HARD_MAX_ROWS, Math.round(Number(viewRows) || 40)));
  if(!(tick > 0) || !sticky){
    return {
      startIdx: 0,
      endIdx: 0,
      tick,
      rows: 0
    };
  }
  const highIdx = Math.round(sticky.high / tick);
  const lowIdx = Math.round(sticky.low / tick);
  const midIdx = Math.round(mid / tick);
  const half = Math.floor(rows / 2);
  let start = midIdx + (viewOffset | 0) + half;
  let end = start - rows + 1;
  if(start > highIdx){
    start = highIdx;
    end = start - rows + 1;
  }
  if(end < lowIdx){
    end = lowIdx;
    start = Math.min(highIdx, end + rows - 1);
  }
  if(start < end){
    start = end;
  }
  return {
    startIdx: start,
    endIdx: end,
    tick,
    rows: start - end + 1
  };
}

/**
 * @param {ReturnType<import("./tick-book.js").createTickBook>} book
 * @param {{
 *   priceScale?: number,
 *   sticky?: { high: number, low: number, tick: number } | null,
 *   viewRows?: number,
 *   viewOffset?: number,
 *   hover?: boolean,
 *   autocenterPct?: number
 * }} [options]
 */
export function buildVisibleSliceFromTickBook(
book,
options =
{}
){
  const nativeTick = book.getNativeTick();
  const priceScale = normalizePriceScale(options.priceScale);
  const displayTick = displayTickFor(nativeTick, priceScale);
  const bestAsk = book.bestAsk();
  const bestBid = book.bestBid();
  const mid =
    bestAsk > 0 && bestBid > 0
      ? (bestAsk + bestBid) / 2
      : bestAsk || bestBid || 0;

  const stepped = stepStickyRange(
    options.sticky || null,
    mid,
    displayTick,
    priceScale,
    options.autocenterPct,
    options.hover === true
  );
  const sticky = stepped.sticky;
  const viewOffset = stepped.resetView ? 0 : (options.viewOffset | 0);
  const view = visibleDisplayIndexRange(
    sticky,
    mid,
    options.viewRows,
    viewOffset
  );

  const rows = [];
  let maxSize = 0;
  const scale = Math.max(1, Math.round(priceScale));
  const dec = decimalsForTick(displayTick);

  if(view.rows > 0 && displayTick > 0){
    for(let step = view.startIdx; step >= view.endIdx; step--){
      const price = Number((step * displayTick).toFixed(dec));
      const askSize = book.notionalAtDisplay("ask", step, scale);
      const bidSize = book.notionalAtDisplay("bid", step, scale);
      let side = "hole";
      let size = 0;
      if(askSize > 0){
        side = "ask";
        size = askSize;
      }else if(bidSize > 0){
        side = "bid";
        size = bidSize;
      }
      if(size > maxSize){
        maxSize = size;
      }
      const touch =
        size > 0 &&
        (
          (bestAsk > 0 && Math.abs(price - bestAsk) < displayTick * 0.5) ||
          (bestBid > 0 && Math.abs(price - bestBid) < displayTick * 0.5)
        );
      rows.push({
        price,
        size,
        side,
        touch,
        major: isMajorPrice(price, displayTick)
      });
    }
  }

  return {
    rows,
    askRows: rows.filter((r) => r.side === "ask"),
    bidRows: rows.filter((r) => r.side === "bid"),
    bestAsk,
    bestBid,
    mid,
    tick: displayTick,
    nativeTick,
    priceScale,
    maxSize,
    recentered: stepped.recentered,
    sticky,
    viewOffset,
    updatedAt: Date.now()
  };
}
