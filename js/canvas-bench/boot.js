/**
 * Проба CPU: свой холст свечей, без Lightweight Charts.
 * Терминал / Скринер / Вотчлист этой страницей не подменяются.
 * Данные — тот же публичный Bybit, что у графика (desktop IPC или прямой REST/WS).
 */

import {
loadBybitHistory
} from "../api.js?v=d2a5a6fe";

import {
subscribeKline
} from "../ws.js?v=a3fc2075";

import {
CandleBenchChart
} from "./chart.js";

import {
RsiBenchPane
} from "./rsi-pane.js";

import {
OscBenchPane
} from "./osc-pane.js";

import {
PnlTag
} from "./pnl-tag.js";

import {
DrawLayer
} from "./draw-layer.js";

import {
sampleDrawings
} from "./drawings.js";

import {
TradeLayer
} from "./trade-layer.js";

import {
sampleTradeLevels
} from "./trade-levels.js";

const TF_LABEL = {
"1": "1м",
"5": "5м",
"15": "15м",
"60": "1ч",
"240": "4ч",
"D": "1д"
};

const symbolInput =
document.getElementById("symbol");
const tfSelect =
document.getElementById("tf");
const statusEl =
document.getElementById("status");
const stage =
document.getElementById("stage");

const chart =
new CandleBenchChart(stage);
const rsi =
new RsiBenchPane(
document.getElementById("rsi"),
chart
);
const ao =
new OscBenchPane(
document.getElementById("ao"),
chart,
"ao"
);
const macd =
new OscBenchPane(
document.getElementById("macd"),
chart,
"macd"
);
const volume =
new OscBenchPane(
document.getElementById("volume"),
chart,
"volume"
);

chart.bindPlot(
document.getElementById("rsi")
);
chart.bindPlot(
document.getElementById("ao")
);
chart.bindPlot(
document.getElementById("macd")
);
chart.bindPlot(
document.getElementById("volume")
);
const drawLayer =
new DrawLayer(
stage,
chart,
document.getElementById("draw-tools")
);
const tradeLayer =
new TradeLayer(
stage,
chart
);
const pnl =
new PnlTag(
stage,
chart,
tradeLayer
);
tradeLayer.onPaint = ()=>{
pnl.paint();
};
drawLayer.onSelect = ()=>{
tradeLayer.clearSelection();
};
tradeLayer.onSelect = ()=>{

if(drawLayer.selected < 0){
return;
}

drawLayer.selected = -1;
drawLayer.paint();

};
chart.onView = ()=>{
ao.rebuild();
macd.rebuild();
volume.rebuild();
rsi.rebuild();
drawLayer.paint();
tradeLayer.paint();
};
chart.onLive = ()=>{
ao.paintLast();
macd.paintLast();
volume.paintLast();
rsi.paintLast();
pnl.paint();
};

let generation = 0;
let unsubscribe = null;
let hudAt = 0;

function normalizeSymbol(raw){

return String(raw || "")
.trim()
.toUpperCase()
.replace(/\.P$/i, "")
.replace(/[^A-Z0-9]/g, "");

}

function writeStatus(text){

statusEl.textContent = text;

}

function updateHud(force){

const now =
performance.now();

if(
!force &&
now - hudAt < 500
){
return;
}

hudAt = now;

const symbol =
normalizeSymbol(symbolInput.value) || "—";
const tf =
tfSelect.value;
const where =
window.cryptoTerminalDesktop?.isDesktop
? "Electron"
: "не Electron";
const counts =
chart.counts;
const rsiCounts =
rsi.counts;
const price =
chart.lastPriceText();
const mode =
chart.priceScaleMode === "logarithmic"
? "log"
: "regular";

writeStatus(
`${symbol} · ${TF_LABEL[tf] || tf} · ${mode} · ${chart.candleCount} свечей · ${where} · свечи ${counts.rebuild}/${counts.live} · RSI ${rsiCounts.rebuild}/${rsiCounts.live} · MACD ${macd.counts.rebuild}/${macd.counts.live} · AO ${ao.counts.rebuild}/${ao.counts.live} · объём ${volume.counts.rebuild}/${volume.counts.live} · рисунки ${drawLayer.paints} · заявки ${tradeLayer.paints} · pnl ${pnl.paints} · одинаковые ${counts.skip}${price ? ` · ${price}` : ""}`
);

}

chart.onActivity = ()=>{
updateHud(false);
};

async function load(){

const token =
++generation;
const symbol =
normalizeSymbol(symbolInput.value);
const tf =
tfSelect.value;

if(unsubscribe){
unsubscribe();
unsubscribe = null;
}

if(!symbol){
writeStatus("Нужен тикер, например BTCUSDT");
return;
}

symbolInput.value = symbol;
writeStatus(`${symbol} · загрузка свечей Bybit…`);

try{

const rows =
await loadBybitHistory(
symbol,
tf,
2,
{ parallel: true }
);

if(token !== generation){
return;
}

if(!rows?.length){
writeStatus(`${symbol} · Bybit не отдал свечи`);
return;
}

drawLayer.setItems(
sampleDrawings(rows)
);
tradeLayer.setLevels(
sampleTradeLevels(rows)
);
chart.setSeries(rows, tf);
updateHud(true);

unsubscribe =
subscribeKline(
symbol,
tf,
candle=>{

if(token !== generation){
return;
}

chart.onCandle(candle);
updateHud(false);

}
);

}catch(err){

if(token !== generation){
return;
}

writeStatus(
err?.message || "сбой загрузки свечей"
);

}

}

document.getElementById("reload").addEventListener(
"click",
()=>{
void load();
}
);

symbolInput.addEventListener(
"keydown",
event=>{

if(event.key === "Enter"){
void load();
}

}
);

tfSelect.addEventListener(
"change",
()=>{
void load();
}
);

void load();
