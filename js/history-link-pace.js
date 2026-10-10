/**
 * Slow public-history link: background pages shrink so the chart
 * stays movable while the off-screen tail arrives.
 * The first visible window still uses the full page size.
 */

const SLOW_BYTES_PER_SEC = 150_000;
const ROW_BYTES = 96;
const SLOW_HOLD_MS = 60_000;
const MIN_SAMPLE_ROWS = 20;

let slowUntil = 0;

export function resetHistoryLinkPace(){
slowUntil = 0;
}

export function noteHistoryTransfer(
rowCount,
elapsedMs,
now = Date.now()
){

const rows =
Number(rowCount);
const ms =
Number(elapsedMs);

if(
!(rows >= MIN_SAMPLE_ROWS) ||
!(ms > 0)
){
return;
}

const rate =
(rows * ROW_BYTES) /
(ms / 1000);

if(
rate <
SLOW_BYTES_PER_SEC
){
slowUntil =
now +
SLOW_HOLD_MS;
return;
}

if(
rate >
SLOW_BYTES_PER_SEC * 2
){
slowUntil = 0;
}

}

export function isSlowHistoryLink(
now = Date.now()
){
return now < slowUntil;
}

export function slowHistoryPageLimit(
now = Date.now()
){
return isSlowHistoryLink(now)
? 50
: 1000;
}

export function clampHistoryPageLimit(
value
){

const n =
Math.floor(
Number(value)
);

if(
!Number.isFinite(n) ||
n <= 0
){
return 1000;
}

return Math.min(
1000,
Math.max(1, n)
);

}
