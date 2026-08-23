/**
 * Общий HTF (как Supertrend / request.security):
 * считаем индикатор на старшем ТФ и переносим значения на свечи графика.
 */
import {
aggregateCandlesToTf,
fetchHtfCandles
} from "./htf-loader.js?v=3";

import {
calculateRSI,
alignRsiWithCandleTimes
} from "../indicators.js?v=3";

export const HTF_TF_OPTIONS =
[
{
value:
"",
label:
"Текущий"
},
{
value:
"1",
label:
"1m"
},
{
value:
"5",
label:
"5m"
},
{
value:
"15",
label:
"15m"
},
{
value:
"60",
label:
"1h"
},
{
value:
"240",
label:
"4h"
},
{
value:
"D",
label:
"1D"
}
];

const TF_VALUES =
new Set(
HTF_TF_OPTIONS.map(
opt=>
opt.value
)
);

export function normalizeHtfTf(
raw
){

const tf =
String(
raw ??
""
).trim();

return TF_VALUES.has(
tf
)
? tf
: "";

}

export function formatHtfTfLegend(
tf
){

const opt =
HTF_TF_OPTIONS.find(
item=>
item.value ===
normalizeHtfTf(
tf
)
);

if(
!opt ||
!opt.value
){
return "";
}

return ` ${opt.label}`;

}

export function htfTfSelectHtml(
selectedTf
){

const current =
normalizeHtfTf(
selectedTf
);

return `<div class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Таймфрейм</span>
<select class="chart-indicator-settings-select" data-key="tf" data-field="tf">
${HTF_TF_OPTIONS.map(
opt=>
`<option value="${opt.value}" ${opt.value === current ? "selected" : ""}>${opt.label}</option>`
).join(
""
)}
</select>
</div>`;

}

/**
 * Для каждой свечи графика берём последнее HTF-значение с time <= bar.time
 * (как TradingView request.security без lookahead).
 */
export function projectHtfPointsOntoChart(
chartCandles,
htfPoints
){

const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const points =
Array.isArray(
htfPoints
)
? htfPoints
: [];

if(
!chart.length ||
!points.length
){
return [];
}

const out =
[];
let i =
0;

for(
const bar of chart
){

const t =
Number(
bar?.time
);

if(
!Number.isFinite(
t
)
){
continue;
}

while(
i +
1 <
points.length &&
Number(
points[
i +
1
].time
) <=
t
){
i++;
}

const src =
points[
i
];
const srcTime =
Number(
src?.time
);
const value =
Number(
src?.value
);

if(
!Number.isFinite(
srcTime
) ||
srcTime >
t ||
!Number.isFinite(
value
)
){
continue;
}

out.push(
{
time:
t,
value
}
);

}

return out;

}

export function projectHtfRowsOntoChart(
chartCandles,
htfRows
){

const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const rows =
Array.isArray(
htfRows
)
? htfRows
: [];

if(
!chart.length ||
!rows.length
){
return [];
}

const out =
[];
let i =
0;

for(
const bar of chart
){

const t =
Number(
bar?.time
);

if(
!Number.isFinite(
t
)
){
continue;
}

while(
i +
1 <
rows.length &&
Number(
rows[
i +
1
].time
) <=
t
){
i++;
}

const src =
rows[
i
];
const srcTime =
Number(
src?.time
);

if(
!src ||
!Number.isFinite(
srcTime
) ||
srcTime >
t
){
continue;
}

out.push(
{
...src,
time:
t
}
);

}

return out;

}

export async function resolveIndicatorSourceCandles(
{
tf,
chartTf,
chartCandles,
symbol,
loadHistory
}
){

const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const wanted =
normalizeHtfTf(
tf
);
const chartNorm =
String(
chartTf ||
""
).trim();

if(
!wanted ||
wanted ===
chartNorm
){
return {
candles:
chart,
projected:
false
};
}

if(
typeof loadHistory ===
"function" &&
symbol
){

try{
const loaded =
await fetchHtfCandles(
symbol,
wanted,
loadHistory,
chart
);

if(
loaded.length
){
return {
candles:
loaded,
projected:
true
};
}
}catch{
/* fall through to aggregate */
}

}

const aggregated =
aggregateCandlesToTf(
chart,
wanted,
chartNorm
);

if(
aggregated !==
chart &&
aggregated.length
){
return {
candles:
aggregated,
projected:
true
};
}

return {
candles:
chart,
projected:
false
};

}

export async function buildChartRsiPoints(
{
chartCandles,
period,
tf,
chartTf,
symbol,
loadHistory
}
){

const chart =
Array.isArray(
chartCandles
)
? chartCandles
: [];
const resolved =
await resolveIndicatorSourceCandles(
{
tf,
chartTf,
chartCandles:
chart,
symbol,
loadHistory
}
);
const raw =
calculateRSI(
resolved.candles,
period
);

if(
!resolved.projected
){
return alignRsiWithCandleTimes(
chart,
raw,
period
);
}

return projectHtfPointsOntoChart(
chart,
raw
);

}
