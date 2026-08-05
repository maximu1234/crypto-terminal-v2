/**
 * Локальное время на оси Lightweight Charts (без сдвига данных свечей).
 * Данные остаются UTC unix; подписи оси/crosshair — в TZ браузера.
 */

/**
 * @param {unknown} time
 * @returns {Date|null}
 */
export function chartTimeToDate(
time
){

if(
time ==
null
){
return null;
}

if(
typeof time ===
"object" &&
time !==
null &&
"year" in
time
){

const y =
Number(
time.year
);
const m =
Number(
time.month
);
const d =
Number(
time.day
);

if(
!Number.isFinite(
y
) ||
!Number.isFinite(
m
) ||
!Number.isFinite(
d
)
){
return null;
}

return new Date(
Date.UTC(
y,
m -
1,
d
)
);

}

const n =
Number(
time
);

if(
!Number.isFinite(
n
)
){
return null;
}

return new Date(
n *
1000
);

}

/**
 * Crosshair / localization.timeFormatter
 * @param {unknown} time
 * @returns {string}
 */
export function formatChartCrosshairTimeLocal(
time
){

const date =
chartTimeToDate(
time
);

if(
!date ||
Number.isNaN(
date.getTime()
)
){
return "";
}

if(
typeof time ===
"object" &&
time !==
null &&
"year" in
time
){
return date.toLocaleDateString(
undefined,
{
year:
"numeric",
month:
"short",
day:
"numeric"
}
);
}

return date.toLocaleString(
undefined,
{
year:
"numeric",
month:
"short",
day:
"numeric",
hour:
"2-digit",
minute:
"2-digit",
hour12:
false
}
);

}

/**
 * timeScale.tickMarkFormatter
 * TickMarkType: Year=0, Month=1, DayOfMonth=2, Time=3, TimeWithSeconds=4
 * @param {unknown} time
 * @param {number} tickMarkType
 * @param {string} [locale]
 * @returns {string}
 */
export function formatChartTickMarkLocal(
time,
tickMarkType,
locale
){

const date =
chartTimeToDate(
time
);

if(
!date ||
Number.isNaN(
date.getTime()
)
){
return "";
}

const loc =
locale ||
(
typeof navigator !==
"undefined"
? navigator.language
: undefined
);
const type =
Number(
tickMarkType
);

if(
type ===
0
){
return date.toLocaleDateString(
loc,
{
year:
"numeric"
}
);
}

if(
type ===
1
){
return date.toLocaleDateString(
loc,
{
month:
"short"
}
);
}

if(
type ===
2
){
return date.toLocaleDateString(
loc,
{
day:
"numeric"
}
);
}

if(
type ===
4
){
return date.toLocaleTimeString(
loc,
{
hour:
"2-digit",
minute:
"2-digit",
second:
"2-digit",
hour12:
false
}
);
}

if(
typeof time ===
"object" &&
time !==
null &&
"year" in
time
){
return date.toLocaleDateString(
loc,
{
day:
"numeric",
month:
"short"
}
);
}

return date.toLocaleTimeString(
loc,
{
hour:
"2-digit",
minute:
"2-digit",
hour12:
false
}
);

}

/**
 * Options fragment for LightweightCharts.createChart / applyOptions.
 * @returns {{ localization: object, timeScale: { tickMarkFormatter: Function } }}
 */
export function chartLocalTimeOptions(){

return {
localization:{
locale:
typeof navigator !==
"undefined"
? navigator.language
: "en-US",
timeFormatter:
formatChartCrosshairTimeLocal
},
timeScale:{
tickMarkFormatter:
formatChartTickMarkLocal
}
};

}

/**
 * Merge local-time display into createChart options (UTC candle data unchanged).
 * @param {object} [options]
 * @returns {object}
 */
export function withChartLocalTime(
options =
{}
){

const local =
chartLocalTimeOptions();
const prev =
options &&
typeof options ===
"object"
? options
: {};

return {
...prev,
localization:{
...(
prev.localization ||
{}
),
...local.localization
},
timeScale:{
...(
prev.timeScale ||
{}
),
tickMarkFormatter:
prev.timeScale?.tickMarkFormatter ||
local.timeScale.tickMarkFormatter
}
};

}
