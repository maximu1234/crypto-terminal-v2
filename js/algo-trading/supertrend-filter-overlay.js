/**
 * Supertrend filter overlay on the Algo chart — canvas, not LWC series.
 */
import {
buildAlgoSupertrendLineData
} from "./pattern-supertrend-filter.js?v=5";

import {
splitSupertrendValuedSegments
} from "../indicators/supertrend-math.js?v=3";

import {
paintSupertrendSegments
} from "../indicators/supertrend-paint.js?v=1";

/**
 * @param {{
 *   getChart: () => object|null,
 *   getSeries: () => object|null,
 *   getDrawingTools: () => { addAfterRedrawListener?: Function, removeAfterRedrawListener?: Function, scheduleRedraw?: Function }|null,
 *   getCandles: () => Array,
 *   getTf: () => string,
 *   getGate: () => object,
 *   getLinesVisible: () => boolean
 * }} deps
 */
export function createAlgoSupertrendFilterOverlay(deps){
  let afterRedraw = null;
  let longUp = [];
  let longDown = [];
  let shortUp = [];
  let shortDown = [];

  function bind(){
    const dt = deps.getDrawingTools?.();
    if(!dt?.addAfterRedrawListener){
      return false;
    }
    if(afterRedraw){
      dt.removeAfterRedrawListener?.(afterRedraw);
    }
    afterRedraw = paint;
    dt.addAfterRedrawListener(afterRedraw);
    return true;
  }

  function unbind(){
    const dt = deps.getDrawingTools?.();
    if(afterRedraw && dt?.removeAfterRedrawListener){
      dt.removeAfterRedrawListener(afterRedraw);
    }
    afterRedraw = null;
  }

  function paint(ctx){
    if(!ctx){
      return;
    }
    const chart = deps.getChart?.();
    const series = deps.getSeries?.();
    paintSupertrendSegments(ctx, {
      chart,
      series,
      upSegments: longUp,
      downSegments: longDown,
      upColor: "#22c55e",
      downColor: "#ef4444",
      lineWidth: 2
    });
    paintSupertrendSegments(ctx, {
      chart,
      series,
      upSegments: shortUp,
      downSegments: shortDown,
      upColor: "#86efac",
      downColor: "#f87171",
      lineWidth: 2
    });
  }

  function sideSegments(side, gate, candles, chartTf, linesVisible){
    const enabled = side === "long"
      ? gate.supertrendLongFilter
      : gate.supertrendShortFilter;
    if(!enabled || !linesVisible){
      return { up: [], down: [] };
    }
    const lines = buildAlgoSupertrendLineData(candles, {
      atrLength: side === "long" ? gate.supertrendLongAtr : gate.supertrendShortAtr,
      factor: side === "long" ? gate.supertrendLongFactor : gate.supertrendShortFactor,
      tf: side === "long" ? gate.supertrendLongTf : gate.supertrendShortTf,
      chartTf
    });
    return {
      up: splitSupertrendValuedSegments(lines.up),
      down: splitSupertrendValuedSegments(lines.down)
    };
  }

  function refresh(){
    if(!afterRedraw){
      bind();
    }
    const candles = deps.getCandles?.() || [];
    const gate = deps.getGate?.() || {};
    const chartTf = deps.getTf?.() || "";
    const linesVisible = deps.getLinesVisible?.() !== false;
    const long = sideSegments("long", gate, candles, chartTf, linesVisible);
    const short = sideSegments("short", gate, candles, chartTf, linesVisible);
    longUp = long.up;
    longDown = long.down;
    shortUp = short.up;
    shortDown = short.down;
    deps.getDrawingTools?.()?.scheduleRedraw?.();
  }

  function destroy(){
    longUp = [];
    longDown = [];
    shortUp = [];
    shortDown = [];
    unbind();
  }

  return {
    bind,
    refresh,
    destroy
  };
}
