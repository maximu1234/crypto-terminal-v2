/**
 * Раскладка Y-центров плашек на ценовой шкале без перекрытия.
 * Цена на плашке остаётся исходной; сдвигается только позиция отрисовки.
 *
 * @param {number[]} idealYs — идеальные Y (пиксели, сверху вниз)
 * @param {number} lineHeight — высота одной плашки
 * @param {number} chartHeight — высота области графика
 * @returns {number[]} Y для отрисовки (тот же порядок, что idealYs)
 */
export function layoutScaleLabelYs(
idealYs,
lineHeight,
chartHeight
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
