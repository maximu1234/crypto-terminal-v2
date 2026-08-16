/**
 * Supertrend on the drawings overlay canvas.
 * LWC LineSeries cannot break on whitespace, so a series-per-segment
 * approach creates hundreds of series and freezes the chart.
 */

function strokeSegment(ctx, ts, series, points, color, lineWidth){
  if(!ctx || !ts || !series || !Array.isArray(points) || !points.length){
    return;
  }

  const width = Math.max(1, Number(lineWidth) || 2);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if(points.length === 1){
    const x = ts.timeToCoordinate(points[0].time);
    const y = series.priceToCoordinate(points[0].value);
    if(x != null && y != null && Number.isFinite(x) && Number.isFinite(y)){
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, width * 0.7), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  ctx.beginPath();
  let started = false;
  for(const p of points){
    const x = ts.timeToCoordinate(p.time);
    const y = series.priceToCoordinate(p.value);
    if(x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)){
      started = false;
      continue;
    }
    if(!started){
      ctx.moveTo(x, y);
      started = true;
    }else{
      ctx.lineTo(x, y);
    }
  }
  if(started){
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   chart: { timeScale: () => { timeToCoordinate: Function } },
 *   series: { priceToCoordinate: Function },
 *   upSegments?: Array<Array<{time:number, value:number}>>,
 *   downSegments?: Array<Array<{time:number, value:number}>>,
 *   upColor?: string,
 *   downColor?: string,
 *   lineWidth?: number
 * }} opts
 */
export function paintSupertrendSegments(ctx, opts = {}){
  const chart = opts.chart;
  const series = opts.series;
  if(!ctx || !chart || !series){
    return;
  }

  let ts = null;
  try{
    ts = chart.timeScale();
  }catch{
    return;
  }
  if(!ts?.timeToCoordinate){
    return;
  }

  const upColor = opts.upColor || "#22c55e";
  const downColor = opts.downColor || "#ef4444";
  const lineWidth = opts.lineWidth;
  const up = Array.isArray(opts.upSegments) ? opts.upSegments : [];
  const down = Array.isArray(opts.downSegments) ? opts.downSegments : [];

  for(const seg of up){
    strokeSegment(ctx, ts, series, seg, upColor, lineWidth);
  }
  for(const seg of down){
    strokeSegment(ctx, ts, series, seg, downColor, lineWidth);
  }
}
