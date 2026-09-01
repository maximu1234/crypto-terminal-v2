/**
 * Visible ladder slice from a tick-indexed book. No full-book sort.
 */
import {
stickyHalfSpanForScale,
makeStickyPriceRange,
stickyRangeNeedsRecenter
} from "./depth-store.js?v=11";

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

function clampViewRows(viewRows){
  return Math.max(8, Math.min(HARD_MAX_ROWS, Math.round(Number(viewRows) || 40)));
}

/**
 * Last ask / last bid of the *visible* compressed book: the last ask-side
 * row and the first bid-side row. Leftover opposite-side size inside a
 * bid (or ask) bucket must not move the highlight onto that other row
 * or split a row in half.
 */
function markCompressedBbo(rows){
  let lastAskI = -1;
  let firstBidI = -1;
  for(let i = 0; i < rows.length; i++){
    if(rows[i].side === "ask"){
      lastAskI = i;
    }
    if(rows[i].side === "bid" && firstBidI < 0){
      firstBidI = i;
    }
  }
  if(lastAskI >= 0 && firstBidI < 0 && rows[lastAskI].bidSize > 0){
    firstBidI = lastAskI;
  }else if(firstBidI >= 0 && lastAskI < 0 && rows[firstBidI].askSize > 0){
    lastAskI = firstBidI;
  }
  for(let i = 0; i < rows.length; i++){
    const touchAsk = i === lastAskI;
    const touchBid = i === firstBidI;
    rows[i].touchAsk = touchAsk;
    rows[i].touchBid = touchBid;
    rows[i].touch = touchAsk || touchBid;
    if(touchAsk && !touchBid){
      rows[i].side = "ask";
    }else if(touchBid && !touchAsk){
      rows[i].side = "bid";
    }else if(touchAsk && touchBid){
      rows[i].side = rows[i].askSize >= rows[i].bidSize ? "ask" : "bid";
      rows[i].size = (rows[i].askSize || 0) + (rows[i].bidSize || 0);
    }
  }
  return rows;
}

export function compressedBboPaintMode(row){
  if(!row){
    return "";
  }
  const touchAsk =
    row.touchAsk === true ||
    (row.touch === true && row.side === "ask" && row.touchBid !== true);
  const touchBid =
    row.touchBid === true ||
    (row.touch === true && row.side === "bid" && row.touchAsk !== true);
  if(touchAsk && touchBid){
    return "split";
  }
  if(touchAsk){
    return "ask";
  }
  if(touchBid){
    return "bid";
  }
  return "";
}

function collectVisibleRows(
book,
view,
displayTick,
scale,
dec
){
  const rows = [];
  let maxSize = 0;
  if(view.rows > 0 && displayTick > 0){
    for(let step = view.startIdx; step >= view.endIdx; step--){
      const price = Number((step * displayTick).toFixed(dec));
      const askSize = book.notionalAtDisplay("ask", step, scale);
      const bidSize = book.notionalAtDisplay("bid", step, scale);
      let side = "hole";
      let size = 0;
      if(askSize > 0 && bidSize > 0){
        side = askSize >= bidSize ? "ask" : "bid";
        size = askSize + bidSize;
      }else if(askSize > 0){
        side = "ask";
        size = askSize;
      }else if(bidSize > 0){
        side = "bid";
        size = bidSize;
      }
      if(size > maxSize){
        maxSize = size;
      }
      rows.push({
        price,
        size,
        side,
        touch: false,
        touchAsk: false,
        touchBid: false,
        major: isMajorPrice(price, displayTick),
        askSize,
        bidSize
      });
    }
  }
  return {
    rows: markCompressedBbo(rows),
    maxSize
  };
}

function attachViewCenter(sticky, viewCenterIdx){
  if(!sticky){
    return null;
  }
  sticky.viewCenterIdx = viewCenterIdx | 0;
  return sticky;
}

/**
 * How far the spread is from the visible center, as % of half the viewport.
 * 0 = middle of the ladder; 100 = top or bottom edge; >100 = off-screen.
 */
export function spreadOffsetPctInView(
midIdx,
viewCenterIdx,
viewOffset,
viewRows
){
  const half = Math.max(1, Math.floor(clampViewRows(viewRows) / 2));
  const viewMidIdx = (viewCenterIdx | 0) + (viewOffset | 0);
  return (Math.abs((midIdx | 0) - viewMidIdx) / half) * 100;
}

/**
 * Sticky camera: prices stay put while the spread walks. Recenter the view
 * only when the pointer is not over the ladder and the spread is near/past
 * the visible edge (autocenterPct, default 85).
 *
 * @param {{ high: number, low: number, tick: number, viewCenterIdx?: number } | null} sticky
 * @param {number} mid
 * @param {number} displayTick
 * @param {number} priceScale
 * @param {number} autocenterPct
 * @param {boolean} hover
 * @param {number} viewRows
 * @param {number} viewOffset
 * @returns {{ sticky: ReturnType<typeof makeStickyPriceRange>, recentered: boolean, resetView: boolean }}
 */
export function stepStickyRange(
sticky,
mid,
displayTick,
priceScale,
autocenterPct,
hover,
viewRows,
viewOffset
){
  const halfSpan = stickyHalfSpanForScale(priceScale);
  const midIdx = Math.round(mid / displayTick);
  const threshold = Number(autocenterPct);
  const pct = Number.isFinite(threshold) ? threshold : 85;

  if(!sticky || sticky.tick !== displayTick || !(displayTick > 0) || !(mid > 0)){
    return {
      sticky: attachViewCenter(
        makeStickyPriceRange(mid, displayTick, halfSpan),
        midIdx
      ),
      recentered: true,
      resetView: true
    };
  }

  const center = Number.isFinite(sticky.viewCenterIdx)
    ? (sticky.viewCenterIdx | 0)
    : midIdx;
  const offsetPct = spreadOffsetPctInView(
    midIdx,
    center,
    viewOffset,
    viewRows
  );

  if(!hover && offsetPct > pct){
    return {
      sticky: attachViewCenter(
        makeStickyPriceRange(mid, displayTick, halfSpan),
        midIdx
      ),
      recentered: true,
      resetView: true
    };
  }

  if(stickyRangeNeedsRecenter(sticky, mid, pct)){
    const next = makeStickyPriceRange(mid, displayTick, halfSpan);
    return {
      sticky: attachViewCenter(next, center),
      recentered: false,
      resetView: false
    };
  }

  return {
    sticky: attachViewCenter(sticky, center),
    recentered: false,
    resetView: false
  };
}

/**
 * Display-tick indices to paint (high → low), anchored to the frozen camera.
 */
export function visibleDisplayIndexRange(
sticky,
viewRows,
viewOffset
){
  const tick = sticky?.tick || 0;
  const rows = clampViewRows(viewRows);
  const centerIdx = Number.isFinite(sticky?.viewCenterIdx)
    ? (sticky.viewCenterIdx | 0)
    : 0;
  if(!(tick > 0) || !sticky){
    return {
      startIdx: 0,
      endIdx: 0,
      tick,
      rows: 0
    };
  }
  const half = Math.floor(rows / 2);
  const start = centerIdx + (viewOffset | 0) + half;
  const end = start - rows + 1;
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

  let stepped = stepStickyRange(
    options.sticky || null,
    mid,
    displayTick,
    priceScale,
    options.autocenterPct,
    options.hover === true,
    options.viewRows,
    options.viewOffset | 0
  );
  let sticky = stepped.sticky;
  let viewOffset = stepped.resetView ? 0 : (options.viewOffset | 0);
  let view = visibleDisplayIndexRange(
    sticky,
    options.viewRows,
    viewOffset
  );

  const scale = Math.max(1, Math.round(priceScale));
  const dec = decimalsForTick(displayTick);
  let built = collectVisibleRows(
    book,
    view,
    displayTick,
    scale,
    dec
  );

  /* Empty window (hover freeze / leftover offset) — snap back to the book. */
  if(
    built.maxSize <= 0 &&
    mid > 0 &&
    displayTick > 0 &&
    (bestAsk > 0 || bestBid > 0)
  ){
    stepped = stepStickyRange(
      null,
      mid,
      displayTick,
      priceScale,
      options.autocenterPct,
      false,
      options.viewRows,
      0
    );
    sticky = stepped.sticky;
    viewOffset = 0;
    view = visibleDisplayIndexRange(
      sticky,
      options.viewRows,
      0
    );
    built = collectVisibleRows(
      book,
      view,
      displayTick,
      scale,
      dec
    );
  }

  const rows = built.rows;
  const maxSize = built.maxSize;

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
