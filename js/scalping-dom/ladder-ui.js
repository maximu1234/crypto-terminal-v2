/**
 * Canvas ladder for scalping order book (visible rows only).
 */
import {
getScalpingDomPriceScale,
getScalpingDomVolumeInput,
SCALPING_DOM_PRICE_SCALE_OPTIONS,
setScalpingDomPriceScale,
setScalpingDomVolumeInput
} from "./prefs.js?v=4";

const ROW_H =
14;

function wheelRowDelta(event, rowH, pageH){
  let pixels = Number(event?.deltaY) || 0;
  if(!pixels){
    return 0;
  }
  const mode = event.deltaMode | 0;
  if(mode === 1){
    pixels *= rowH;
  }else if(mode === 2){
    pixels *= Math.max(rowH, pageH || rowH * 20);
  }
  const rows = Math.max(1, Math.round(Math.abs(pixels) / rowH));
  return pixels > 0 ? -rows : rows;
}

function decimalsForTick(tick){
  if(!(tick > 0)){
    return 6;
  }
  const s = tick.toFixed(12).replace(/\.?0+$/, "");
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

function formatPrice(price, tick){
  if(!Number.isFinite(price)){
    return "—";
  }
  const decimals = decimalsForTick(tick);
  let snapped = price;
  if(tick > 0){
    snapped = Math.round(price / tick) * tick;
  }
  const fixed = snapped.toFixed(decimals);
  const parts = fixed.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimals > 0 ? `${intPart}.${parts[1]}` : intPart;
}

function formatSize(size){
  if(!Number.isFinite(size) || size <= 0){
    return "";
  }
  if(size >= 1_000_000){
    const m = size / 1_000_000;
    return `${m >= 10 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if(size >= 1000){
    const k = size / 1000;
    return `${k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  if(size >= 100){
    return String(Math.round(size));
  }
  if(size >= 10){
    return size.toFixed(1).replace(/\.0$/, "");
  }
  return size.toFixed(2).replace(/\.?0+$/, "");
}

function formatVolumeInput(value){
  const n = Number(value);
  if(!Number.isFinite(n) || n <= 0){
    return "";
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function buildScaleSelectOptionsHtml(selected){
  const current = getScalpingDomPriceScale();
  const value = Number.isFinite(Number(selected)) ? Number(selected) : current;
  return SCALPING_DOM_PRICE_SCALE_OPTIONS.map(
    (opt) => `<option value="${opt}"${opt === value ? " selected" : ""}>x${opt}</option>`
  ).join("");
}

function volumeBarPct(size, refMax){
  if(!(size > 0) || !(refMax > 0)){
    return 0;
  }
  return Math.min(100, (size / refMax) * 100);
}

function lightenHex(hex, amount = 0.2){
  const raw = String(hex || "").replace("#", "");
  if(raw.length !== 6){
    return hex;
  }
  const n = parseInt(raw, 16);
  if(!Number.isFinite(n)){
    return hex;
  }
  const mix = (c) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rowSideBg(row){
  let sideBg =
    row.side === "ask"
      ? (row.touch ? "#5d0e07" : "#5c1d1a")
      : row.side === "bid"
        ? (row.touch ? "#102f1e" : "#0d3d31")
        : "";
  if(sideBg && row.slTpHighlight){
    sideBg = lightenHex(sideBg, 0.22);
  }
  return sideBg;
}

function rowPriceBg(row, sideBg){
  return row.positionFill === "profit"
    ? (row.slTpHighlight ? lightenHex("#357a20", 0.18) : "#357a20")
    : row.positionFill === "loss"
      ? (row.slTpHighlight ? lightenHex("#b61e0c", 0.18) : "#b61e0c")
      : sideBg;
}

function resolveVolumeRefMax(rows, userMax){
  if(Number.isFinite(userMax) && userMax > 0){
    return userMax;
  }
  let max = 0;
  for(const row of rows){
    if(row.size > max){
      max = row.size;
    }
  }
  return max;
}

function drawDashedLine(ctx, y, width, color){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, y + 0.5);
  ctx.lineTo(width, y + 0.5);
  ctx.stroke();
  ctx.restore();
}

function paintLadder(canvas, ladder){
  const ctx = canvas.getContext("2d");
  if(!ctx){
    return;
  }
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 0;
  const cssH = canvas.clientHeight || 0;
  const pixelW = Math.max(1, Math.round(cssW * dpr));
  const pixelH = Math.max(1, Math.round(cssH * dpr));
  if(canvas.width !== pixelW || canvas.height !== pixelH){
    canvas.width = pixelW;
    canvas.height = pixelH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, cssW, cssH);

  const rows = ladder?.rows || [];
  if(!rows.length || cssW <= 0){
    return;
  }

  const tick = ladder.tick || 0;
  const refMax = resolveVolumeRefMax(rows, getScalpingDomVolumeInput());
  const sizeW = cssW * (1.7 / 2.55);
  const font = `10px system-ui, -apple-system, sans-serif`;
  const fontMajor = `700 10px system-ui, -apple-system, sans-serif`;

  ctx.textBaseline = "middle";

  for(let i = 0; i < rows.length; i++){
    const row = rows[i];
    const y = i * ROW_H;
    if(y >= cssH){
      break;
    }
    const touchAsk = row.touchAsk === true || (row.touch && row.side === "ask" && row.touchBid !== true);
    const touchBid = row.touchBid === true || (row.touch && row.side === "bid" && row.touchAsk !== true);
    const splitTouch = touchAsk && touchBid;
    const sideBg = splitTouch ? "" : rowSideBg({ ...row, touch: touchAsk || touchBid });
    const priceBg = rowPriceBg(row, sideBg);
    if(splitTouch && !row.positionFill){
      const midY = y + ROW_H / 2;
      ctx.fillStyle = "#5d0e07";
      ctx.fillRect(0, y, cssW, midY - y);
      ctx.fillStyle = "#102f1e";
      ctx.fillRect(0, midY, cssW, y + ROW_H - midY);
    }else{
      if(sideBg){
        ctx.fillStyle = sideBg;
        ctx.fillRect(0, y, sizeW, ROW_H);
      }
      if(priceBg){
        ctx.fillStyle = priceBg;
        ctx.fillRect(sizeW, y, cssW - sizeW, ROW_H);
      }
    }
    const barPct = volumeBarPct(row.size, refMax);
    if(barPct > 0){
      ctx.fillStyle = "#8a6a1a";
      ctx.globalAlpha = 0.92;
      ctx.fillRect(0, y, sizeW * (barPct / 100), ROW_H);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#fff";
    ctx.font = font;
    ctx.textAlign = "left";
    const sizeText = formatSize(row.size);
    if(sizeText){
      ctx.fillText(sizeText, 5, y + ROW_H / 2);
    }
    ctx.font = row.major ? fontMajor : font;
    ctx.textAlign = "right";
    ctx.fillText(formatPrice(row.price, tick), cssW - 4, y + ROW_H / 2);

    const mark = row.slTpMark || "";
    if(mark === "sl-short" || mark === "tp-long"){
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, y, cssW, 2);
    }
    if(mark === "sl-long"){
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(0, y + ROW_H - 2, cssW, 2);
    }
    if(mark === "tp-short"){
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(0, y + ROW_H - 2, cssW, 2);
    }
    if(row.triggerUnderline === "long" || row.triggerUnderline === "short"){
      ctx.fillStyle = row.triggerUnderline === "long" ? "#22c55e" : "#ef4444";
      const ty = row.alertUnderline ? y + ROW_H - 5 : y + ROW_H - 2;
      ctx.fillRect(0, ty, cssW, 2);
    }
    const drawingLines = Array.isArray(row.drawingLines) ? row.drawingLines : [];
    if(drawingLines.length){
      let offset = 1;
      if(row.alertUnderline){
        offset += 2;
      }
      if(row.triggerUnderline === "long" || row.triggerUnderline === "short"){
        offset += 3;
      }
      for(let d = 0; d < drawingLines.length; d++){
        const line = drawingLines[d];
        ctx.fillStyle = String(line.color || "#3b82f6");
        ctx.fillRect(0, y + ROW_H - offset - 2, cssW, 2);
        offset += 3;
      }
    }
    if(row.alertUnderline){
      drawDashedLine(ctx, y + ROW_H - 1, cssW, "#facc15");
    }
  }
}

/**
 * @param {HTMLElement} root
 * @param {{ onSettingsChange?: Function, onViewChange?: Function }} [options]
 */
export function createLadderUi(root, options = {}){
  root.innerHTML =
    `<div class="scalping-dom-header">` +
    `<input type="text" class="scalping-dom-input scalping-dom-input--volume" data-role="volume-input" inputmode="decimal" spellcheck="false" title="Объём" aria-label="Объём" />` +
    `<select class="scalping-dom-input scalping-dom-input--scale" data-role="scale-select" title="Сжатие цены (scale)" aria-label="Сжатие цены">` +
    buildScaleSelectOptionsHtml() +
    `</select>` +
    `</div>` +
    `<canvas class="scalping-dom-ladder" data-role="ladder"></canvas>` +
    `<div class="scalping-dom-status" data-role="status"></div>`;

  const volumeInput = root.querySelector('[data-role="volume-input"]');
  const scaleSelect = root.querySelector('[data-role="scale-select"]');
  const canvas = root.querySelector('[data-role="ladder"]');
  const statusEl = root.querySelector('[data-role="status"]');

  if(volumeInput){
    volumeInput.value = formatVolumeInput(getScalpingDomVolumeInput());
  }
  if(scaleSelect){
    scaleSelect.value = String(getScalpingDomPriceScale());
  }

  let lastLadder = null;
  let viewOffset = 0;
  let hover = false;
  let resizeObs = null;

  function viewRows(){
    const h = canvas?.clientHeight || 0;
    return Math.max(8, Math.floor(h / ROW_H) || 48);
  }

  function emitView(){
    options.onViewChange?.({
      viewRows: viewRows(),
      viewOffset,
      hover
    });
  }

  function notifySettings(){
    options.onSettingsChange?.();
  }

  volumeInput?.addEventListener("change", () => {
    const next = setScalpingDomVolumeInput(volumeInput.value);
    volumeInput.value = formatVolumeInput(next);
    notifySettings();
    if(lastLadder){
      paintLadder(canvas, lastLadder);
    }
  });

  scaleSelect?.addEventListener("change", () => {
    setScalpingDomPriceScale(scaleSelect.value);
    viewOffset = 0;
    notifySettings();
    emitView();
  });

  canvas?.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const step = wheelRowDelta(
        event,
        ROW_H,
        canvas?.clientHeight || 0
      );
      if(!step){
        return;
      }
      viewOffset += step;
      emitView();
    },
    { passive: false }
  );

  root.addEventListener("pointerenter", () => {
    hover = true;
    emitView();
  });

  root.addEventListener("pointerleave", () => {
    hover = false;
    emitView();
  });

  if(typeof ResizeObserver === "function" && canvas){
    resizeObs = new ResizeObserver(() => {
      emitView();
      if(lastLadder){
        paintLadder(canvas, lastLadder);
      }
    });
    resizeObs.observe(canvas);
  }

  requestAnimationFrame(() => emitView());

  return {
    setSymbol(){
      viewOffset = 0;
    },
    setStatus(text){
      if(statusEl){
        statusEl.textContent = text || "";
      }
    },
    render(ladder){
      if(!canvas){
        return;
      }
      if(!ladder){
        lastLadder = null;
        paintLadder(canvas, { rows: [] });
        return;
      }
      if(ladder.recentered){
        viewOffset = ladder.viewOffset | 0;
      }else if(typeof ladder.viewOffset === "number"){
        viewOffset = ladder.viewOffset | 0;
      }
      lastLadder = ladder;
      paintLadder(canvas, ladder);
    },
    destroy(){
      resizeObs?.disconnect();
      resizeObs = null;
      lastLadder = null;
      root.replaceChildren();
    }
  };
}
