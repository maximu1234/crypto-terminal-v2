/**
 * Раскладка Y-центров плашек на ценовой шкале без перекрытия.
 * Цена на плашке остаётся исходной; сдвигается только позиция отрисовки.
 *
 * @param {number[]} idealYs — идеальные Y (пиксели, сверху вниз)
 * @param {number} lineHeight — высота одной плашки
 * @param {number} chartHeight — высота области графика
 * @param {{ fixedBands?: { centerY: number, height: number }[] }} [opts]
 * @returns {number[]} Y для отрисовки (тот же порядок, что idealYs)
 */
export function layoutScaleLabelYs(
idealYs,
lineHeight,
chartHeight,
opts = {}
){

const th =
Number(lineHeight) ||
18;

const chartH =
Math.max(
th,
Number(chartHeight) ||
0
);

const fixedBands =
Array.isArray(opts.fixedBands)
? opts.fixedBands.filter(
band=>
Number.isFinite(band?.centerY) &&
Number.isFinite(band?.height) &&
band.height > 0
)
: [];

const minCenter =
th / 2;
const maxCenter =
Math.max(
minCenter,
chartH - th / 2
);

if(
!Array.isArray(idealYs) ||
!idealYs.length
){
return [];
}

const order =
idealYs
.map((y, i)=>({
y: Number(y),
i
}))
.filter(o=>Number.isFinite(o.y))
.sort((a, b)=>a.y - b.y);

if(!order.length){
return idealYs.map(()=>NaN);
}

const ys =
order.map(o=>o.y);
const ideals =
order.map(o=>o.y);

stackMovableLabels(
ys,
th
);

for(
const band of fixedBands
){
assignAroundFixedBand(
ys,
ideals,
th,
band
);
stackMovableLabels(
ys,
th
);
}

shiftClusterToChart(
ys,
th,
chartH
);

for(
const band of fixedBands
){
assignAroundFixedBand(
ys,
ideals,
th,
band
);
stackMovableLabels(
ys,
th
);
}

for(
let i = 0;
i < ys.length;
i++
){

ys[i] =
Math.min(
maxCenter,
Math.max(
minCenter,
ys[i]
)
);

}

for(
const band of fixedBands
){
assignAroundFixedBand(
ys,
ideals,
th,
band
);
stackMovableLabels(
ys,
th
);
}

const out =
new Array(idealYs.length);

order.forEach((o, idx)=>{
out[o.i] = ys[idx];
});

for(
let i = 0;
i < idealYs.length;
i++
){

if(
out[i] == null
){
out[i] = NaN;
}

}

return out;

}

function bandEdges(
band
){

const half =
band.height / 2;

return {
top: band.centerY - half,
bottom: band.centerY + half
};

}

function overlapsBand(
yCenter,
th,
band
){

const lTop =
yCenter - th / 2;
const lBottom =
yCenter + th / 2;
const {
top,
bottom
} =
bandEdges(band);

return (
lBottom > top &&
lTop < bottom
);

}

function stackMovableLabels(
ys,
th
){

for(
let i = 1;
i < ys.length;
i++
){

const floor =
ys[i - 1] + th;

if(
ys[i] < floor
){
ys[i] = floor;
}

}

for(
let i = ys.length - 2;
i >= 0;
i--
){

const ceil =
ys[i + 1] - th;

if(
ys[i] > ceil
){
ys[i] = ceil;
}

}

for(
let i = 1;
i < ys.length;
i++
){

const floor =
ys[i - 1] + th;

if(
ys[i] < floor
){
ys[i] = floor;
}

}

}

function assignAroundFixedBand(
ys,
ideals,
th,
band
){

const {
top,
bottom
} =
bandEdges(band);

const aboveIdx = [];
const belowIdx = [];

for(
let i = 0;
i < ys.length;
i++
){

if(
!overlapsBand(
ys[i],
th,
band
)
){
continue;
}

if(
ideals[i] <= band.centerY
){
aboveIdx.push(i);
}else{
belowIdx.push(i);
}

}

aboveIdx.sort(
(a, b)=>ideals[b] - ideals[a]
);
belowIdx.sort(
(a, b)=>ideals[a] - ideals[b]
);

let slot =
top - th / 2;

for(
const i of aboveIdx
){

ys[i] = slot;
slot -= th;

}

slot =
bottom + th / 2;

for(
const i of belowIdx
){

ys[i] = slot;
slot += th;

}

}

function shiftClusterToChart(
ys,
th,
chartH
){

if(
!ys.length
){
return;
}

const clusterTop =
ys[0] - th / 2;
const clusterBottom =
ys[ys.length - 1] + th / 2;

if(
clusterTop < 0
){

const shift =
-clusterTop;

for(
let i = 0;
i < ys.length;
i++
){
ys[i] += shift;
}

}

if(
clusterBottom > chartH
){

const shift =
clusterBottom - chartH;

for(
let i = 0;
i < ys.length;
i++
){
ys[i] -= shift;
}

}

}

/** Высота HUD текущей цены (2 строки по 16px). */
export const CHART_PRICE_HUD_FALLBACK_HEIGHT =
32;
