/**
 * Проигрывание графика Терминала: свечи правее выбранной скрыты,
 * шаг и воспроизведение открывают их по одной.
 * Бумажных ордеров нет.
 */

/** @type {number|null} время последней видимой свечи, секунды */
let cutTime = null;
let phase = "off";
let playing = false;
let speed = 1;
let timer = 0;
let paintGen = 0;
let deps = null;

/**
 * @param {Array<{ time: number }>|null|undefined} candles
 * @param {number|null} time
 */
export function candlesUpToTime(candles, time){

const list = Array.isArray(candles) ? candles : [];

if(
time == null ||
!Number.isFinite(time)
){
return list;
}

let end = 0;

for(
let i = 0;
i < list.length;
i++
){

const barTime = Number(list[i]?.time);

if(
!Number.isFinite(barTime)
){
continue;
}

if(barTime <= time){
end = i + 1;
}else{
break;
}

}

return list.slice(0, end);

}

export function isTerminalReplayActive(){

return cutTime != null;

}

export function replayVisibleCandles(candles){

return candlesUpToTime(candles, cutTime);

}

function barEl(){

return document.getElementById("terminal-replay-bar");

}

function statusEl(){

return document.getElementById("terminal-replay-status");

}

function playBtn(){

return document.getElementById("terminal-replay-play");

}

function clearTimer(){

if(timer){
clearTimeout(timer);
timer = 0;
}

}

function formatCut(candles){

const shown = replayVisibleCandles(candles);
const last = shown[shown.length - 1];

if(!last){
return "Кликните свечу на графике";
}

const date = new Date(Number(last.time) * 1000);

if(Number.isNaN(date.getTime())){
return "Проигрывание";
}

return date.toLocaleString("ru-RU", {
day: "2-digit",
month: "short",
hour: "2-digit",
minute: "2-digit"
});

}

function syncUi(){

const on = phase !== "off";
const btn = document.getElementById("terminal-replay-btn");

btn?.setAttribute("aria-pressed", on ? "true" : "false");
btn?.classList.toggle("active", on);
barEl()?.classList.toggle("hidden", !on);
document.body.classList.toggle("terminal-replay-pick", phase === "pick");

const play = playBtn();

if(play){
play.textContent = playing ? "Пауза" : "Пуск";
play.disabled = cutTime == null;
}

const step = document.getElementById("terminal-replay-step");

if(step){
step.disabled = cutTime == null;
}

const status = statusEl();

if(status){
status.textContent = phase === "pick" && cutTime == null
? "Кликните свечу, с которой начать"
: formatCut(deps?.getCandles?.() || []);
}

}

function captureView(){

const ts =
deps?.getChart?.()?.timeScale?.();

if(!ts?.getVisibleLogicalRange){
return null;
}

const range =
ts.getVisibleLogicalRange();

if(
!range ||
!Number.isFinite(range.from) ||
!Number.isFinite(range.to)
){
return null;
}

let barSpacing =
null;

try{
barSpacing =
Number(ts.options?.().barSpacing);
}catch{
barSpacing = null;
}

return {
from: range.from,
to: range.to,
barSpacing
};

}

function restoreView(view){

if(!view){
return;
}

const ts =
deps?.getChart?.()?.timeScale?.();

if(!ts){
return;
}

try{
if(
Number.isFinite(view.barSpacing) &&
view.barSpacing > 0
){
ts.applyOptions({
barSpacing: view.barSpacing
});
}
}catch{
/* ignore */
}

try{
ts.setVisibleLogicalRange({
from: view.from,
to: view.to
});
}catch{
/* ignore */
}

}

function keepView(gen, view){

restoreView(view);
requestAnimationFrame(() => {
if(gen !== paintGen){
return;
}
restoreView(view);
});

}

function showCut(){

if(!deps || cutTime == null){
return;
}

const candles = deps.getCandles?.() || [];
const shown = replayVisibleCandles(candles).length;

if(!shown){
return;
}

const gen = ++paintGen;
const view = captureView();

try{
deps.applySlice?.();
}catch{
/* chart disposed */
}

restoreView(view);

try{
deps.rebuild?.();
}catch{
/* ignore */
}

restoreView(view);
keepView(gen, view);
syncUi();

}

function pause(){

playing = false;
clearTimer();
syncUi();

}

function schedule(){

clearTimer();

if(!playing){
return;
}

const delay = Math.max(40, Math.round(800 / speed));

timer = setTimeout(() => {
timer = 0;

if(!playing){
return;
}

if(!stepForward()){
pause();
return;
}

schedule();
}, delay);

}

function stepForward(){

const candles = deps?.getCandles?.() || [];
const shown = replayVisibleCandles(candles);

if(
!shown.length ||
shown.length >= candles.length
){
return false;
}

const next = candles[shown.length];
const nextTime = Number(next?.time);

if(!Number.isFinite(nextTime)){
return false;
}

cutTime = nextTime;
phase = "ready";
showCut();
return shown.length + 1 < candles.length;

}

function beginPick(){

pause();
cutTime = null;
phase = "pick";
syncUi();

}

export function stopTerminalReplay(options){

const restore = options?.restore !== false;
const wasCut = cutTime != null;
const view = wasCut ? captureView() : null;
pause();
phase = "off";
cutTime = null;
syncUi();

if(!wasCut || !deps || !restore){
return;
}

const gen = ++paintGen;

try{
deps.restoreLive?.();
}catch{
/* ignore */
}

try{
deps.rebuild?.();
}catch{
/* ignore */
}

keepView(gen, view);

}

function onChartClick(param){

if(phase !== "pick" || !deps){
return;
}

const tool = deps.getDrawTool?.();

if(
tool &&
tool !== "cursor"
){
const status = statusEl();
if(status){
status.textContent = "Для выбора свечи включите курсор";
}
return;
}

const time = Number(param?.time);

if(!Number.isFinite(time)){
return;
}

const candles = deps.getCandles?.() || [];
const shown = candlesUpToTime(candles, time);

if(!shown.length){
return;
}

cutTime = Number(shown[shown.length - 1].time);
phase = "ready";
showCut();

}

function onPlayClick(){

if(cutTime == null){
return;
}

if(playing){
pause();
return;
}

const candles = deps.getCandles?.() || [];

if(replayVisibleCandles(candles).length >= candles.length){
return;
}

playing = true;
syncUi();
schedule();

}

function onSpeedChange(event){

const next = Number(event.target?.value);

if(!Number.isFinite(next) || next <= 0){
return;
}

speed = next;

if(playing){
schedule();
}

}

export function mountTerminalReplay(nextDeps){

deps = nextDeps || null;

const btn = document.getElementById("terminal-replay-btn");
const chart = deps?.getChart?.();

btn?.addEventListener("click", () => {
if(phase === "off"){
beginPick();
return;
}
stopTerminalReplay();
});

document.getElementById("terminal-replay-play")?.addEventListener("click", onPlayClick);
document.getElementById("terminal-replay-step")?.addEventListener("click", () => {
if(cutTime == null){
return;
}
pause();
stepForward();
});
document.getElementById("terminal-replay-close")?.addEventListener("click", () => {
stopTerminalReplay();
});
document.getElementById("terminal-replay-speed")?.addEventListener("change", onSpeedChange);

try{
chart?.subscribeClick?.(onChartClick);
}catch{
/* ignore */
}

syncUi();

}
