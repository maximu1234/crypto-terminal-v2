/**
 * Live OHLC rollover and kline coalescing.
 * A closed bar must not wait for the next WS kline: open the new one on
 * wall-clock / ticker, and never drop a newer kline when an older confirm
 * arrives in the same flush window.
 */

/** 1970-01-05 00:00 UTC — first Monday after Unix epoch. */
export const UNIX_MONDAY_OPEN_SEC = 4 * 86400;

const DAY_SEC = 86400;
const WEEK_SEC = 604800;
const ALIGN_SLACK_SEC = 120;
const UNIX_THURSDAY_OFFSET_SEC = 3 * DAY_SEC;

export function liveBarPeriodSec(tf){

const map = {
"1": 60,
"5": 300,
"15": 900,
"60": 3600,
"240": 14400,
"D": DAY_SEC,
"W": WEEK_SEC
};

return map[tf] || 900;

}

/**
 * Next bar open from the last exchange bar.
 * D: UTC midnight when last is on that grid; otherwise last + 1d (session offset).
 * W: Monday 00:00 UTC grid — never Unix-week Thursday (`floor(t/604800)`).
 */
export function nextOhlcOpenTime(lastOpenSec, periodSec){

const open = Number(lastOpenSec);
const period = Math.max(1, Math.floor(Number(periodSec) || 0));

if(!Number.isFinite(open) || !period){
return null;
}

if(period === DAY_SEC){
const rem = ((open % DAY_SEC) + DAY_SEC) % DAY_SEC;

if(rem <= ALIGN_SLACK_SEC){
return open - rem + DAY_SEC;
}

if(rem >= DAY_SEC - ALIGN_SLACK_SEC){
return open + (DAY_SEC - rem) + DAY_SEC;
}

return open + DAY_SEC;
}

if(period === WEEK_SEC){
const rem = (
((open - UNIX_MONDAY_OPEN_SEC) % WEEK_SEC) +
WEEK_SEC
) % WEEK_SEC;
const weekStart = open - rem;

if(rem <= ALIGN_SLACK_SEC || rem >= WEEK_SEC - ALIGN_SLACK_SEC){
return weekStart + WEEK_SEC;
}

if(Math.abs(rem - UNIX_THURSDAY_OFFSET_SEC) <= ALIGN_SLACK_SEC){
return weekStart + WEEK_SEC;
}

return open + WEEK_SEC;
}

return open + period;

}

function isOhlcBar(bar){

return !!(
bar &&
bar.time != null &&
Number.isFinite(Number(bar.close))
);

}

export function lastOhlcIndex(rows){

if(!Array.isArray(rows)){
return -1;
}

for(let i = rows.length - 1; i >= 0; i--){
if(isOhlcBar(rows[i])){
return i;
}
}

return -1;

}

export function lastOhlcBar(rows){

const idx = lastOhlcIndex(rows);

return idx < 0 ? null : rows[idx];

}

export function ensureOhlcRollover(
candles,
periodSec,
nowSec = Date.now() / 1000
){

const period = Math.max(1, Math.floor(Number(periodSec) || 0));

if(!Array.isArray(candles) || !candles.length || !period){
return false;
}

const now = Number(nowSec);

if(!Number.isFinite(now)){
return false;
}

let changed = false;
let guard = 0;

while(guard++ < 8){
const idx = lastOhlcIndex(candles);

if(idx < 0){
break;
}

const last = candles[idx];
const open = Number(last.time);

if(!Number.isFinite(open)){
break;
}

const nextOpen = nextOhlcOpenTime(open, period);

if(nextOpen == null){
break;
}

if(now < nextOpen){
break;
}

const px = Number(last.close);

if(!Number.isFinite(px) || px <= 0){
break;
}

const nextBar = {
time: nextOpen,
open: px,
high: px,
low: px,
close: px,
volume: 0
};
const existing = candles[idx + 1];

if(existing && Number(existing.time) === nextOpen){
if(!isOhlcBar(existing)){
candles[idx + 1] = nextBar;
changed = true;
continue;
}

break;
}

candles.splice(idx + 1, 0, nextBar);
changed = true;
}

return changed;

}

/**
 * @returns {"new"|"last"|"hist"|null}
 */
export function applyLiveOhlcBar(
candles,
bar,
maxLen = 0
){

if(!Array.isArray(candles) || !bar || bar.time == null){
return null;
}

const time = Number(bar.time);

if(!Number.isFinite(time)){
return null;
}

const next = {
...bar,
time
};

if(!candles.length){
candles.push(next);
return "new";
}

const last = candles[candles.length - 1];

if(time === last.time){
candles[candles.length - 1] = next;
return "last";
}

if(time > last.time){
candles.push(next);

if(maxLen && candles.length > maxLen){
candles.shift();
}

return "new";
}

for(let i = candles.length - 2; i >= 0; i--){
if(candles[i].time === time){
candles[i] = next;
return "hist";
}

if(candles[i].time < time){
break;
}
}

return null;

}

export function mergeLiveBarIntoDisplay(
rows,
bar
){

if(!bar || bar.time == null){
return Array.isArray(rows) ? rows : [];
}

const display = Array.isArray(rows) ? rows.slice() : [];
const idx = lastOhlcIndex(display);

if(idx < 0){
return [bar, ...display];
}

const last = display[idx];

if(bar.time === last.time){
display[idx] = bar;
return display;
}

if(bar.time > last.time){
display.splice(idx + 1, 0, bar);
const keepUntil = idx + 1;
return display.filter(
(point, i) => i <= keepUntil || (point?.time != null && point.time > bar.time)
);
}

for(let i = idx - 1; i >= 0; i--){
if(display[i]?.time === bar.time){
display[i] = bar;
break;
}
}

return display;

}

export function ingestLiveOhlcKline(
candles,
candle,
periodSec,
maxLen = 0,
nowSec = Date.now() / 1000
){

const rolled = ensureOhlcRollover(
candles,
periodSec,
nowSec
);
const lenBefore = Array.isArray(candles) ? candles.length : 0;
const kind = applyLiveOhlcBar(
candles,
candle,
maxLen
);
const shifted = Boolean(
kind === "new" &&
maxLen &&
lenBefore >= maxLen
);

return {
rolled,
kind,
shifted
};

}

export function paintLiveOhlcSeries(
series,
candles,
{
kind,
shifted
} = {}
){

if(!series || !Array.isArray(candles) || !candles.length){
return;
}

if(kind === "hist" || shifted){
try{
series.setData(candles);
}catch{
/* ignore */
}

return;
}

const last = lastOhlcBar(candles);

if(!last){
return;
}

applyLiveSeriesUpdate(
series,
last,
() => candles
);

}

export function applyLiveSeriesUpdate(
series,
bar,
rebuildDisplay
){

if(!series || !bar){
return;
}

try{
series.update(bar);
}catch{
const rows =
typeof rebuildDisplay === "function"
? rebuildDisplay()
: null;

if(Array.isArray(rows)){
series.setData(rows);
}
}

}

export function collectKlineRows(data){

if(Array.isArray(data)){
return data.filter(Boolean);
}

return data ? [data] : [];

}

export function queueKlineByTime(
pendingByTopic,
topic,
candle
){

const time = Number(candle?.time);
const close = Number(candle?.close);

if(!Number.isFinite(time) || !Number.isFinite(close)){
return;
}

let byTime = pendingByTopic.get(topic);

if(!byTime){
byTime = new Map();
pendingByTopic.set(topic, byTime);
}

byTime.set(time, {
...candle,
time
});

}

export function takeQueuedKlinesSorted(pendingByTopic){

const out = [];

pendingByTopic.forEach((byTime, topic) => {
const candles = [...byTime.values()].sort((a, b) => a.time - b.time);
out.push({
topic,
candles
});
});

pendingByTopic.clear();
return out;

}
