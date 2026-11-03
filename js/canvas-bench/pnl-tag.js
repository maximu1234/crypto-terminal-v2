/**
 * Подпись PnL у входа в позицию.
 * Меняется с последней ценой и не перерисовывает линии заявок.
 */

const FONT =
"11px -apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif";
const QTY = 0.02;

export function positionPnlText(
entry,
last,
qty = QTY
){

const pnl = (Number(last) - Number(entry)) * qty;

if(!Number.isFinite(pnl)){
return "";
}

const sign = pnl > 0 ? "+" : "";

return `${sign}${pnl.toFixed(2)}`;

}

export class PnlTag {

constructor(stage, chart, tradeLayer){

this.stage = stage;
this.chart = chart;
this.tradeLayer = tradeLayer;
this.canvas = document.createElement("canvas");
this.canvas.className = "bench-canvas";
stage.insertBefore(this.canvas, chart.live);
this.ctx = this.canvas.getContext("2d", { alpha: true });
this.paints = 0;
this.dirty = null;
this.text = "";

}

paint(){

const layout = this.chart.layout;
const ctx = this.ctx;
const entry =
this.tradeLayer.levels.find(level=>level.id === "entry");
const last = this.chart.candles.at(-1)?.close;
const text =
entry && Number.isFinite(last)
? positionPnlText(entry.price, last)
: "";

if(!layout || !text || !this.chart.scale){

if(this.dirty){
ctx.clearRect(this.dirty.x, this.dirty.y, this.dirty.w, this.dirty.h);
this.dirty = null;
this.text = "";
}

return;

}

const dpr = layout.dpr || window.devicePixelRatio || 1;
const bw = Math.floor(layout.cssW * dpr);
const bh = Math.floor(layout.cssH * dpr);

if(this.canvas.width !== bw || this.canvas.height !== bh){
this.canvas.width = bw;
this.canvas.height = bh;
this.dirty = null;
}

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

const y = this.chart.yOf(entry.price);
const tagH = 16;

ctx.font = FONT;

const tagW = ctx.measureText(text).width + 10;
const tagX = layout.plotLeft + 108;
const tagY = Math.round(y - tagH / 2);

if(this.dirty){
ctx.clearRect(this.dirty.x, this.dirty.y, this.dirty.w, this.dirty.h);
}

const next = {
x: tagX - 2,
y: tagY - 2,
w: tagW + 4,
h: tagH + 4
};

if(
text === this.text &&
this.dirty &&
this.dirty.x === next.x &&
this.dirty.y === next.y &&
this.dirty.w === next.w
){
return;
}

ctx.fillStyle = "#facc15";
ctx.fillRect(tagX, tagY, tagW, tagH);
ctx.fillStyle = "#0e1116";
ctx.textAlign = "left";
ctx.textBaseline = "middle";
ctx.fillText(text, tagX + 5, tagY + tagH / 2);
this.dirty = next;
this.text = text;
this.paints++;
this.chart.note?.();

}

}
