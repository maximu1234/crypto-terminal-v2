import test from "node:test";
import assert from "node:assert/strict";

import {
layoutScaleLabelYs
} from "../js/drawings/scale-label-layout.js";

test(
"layoutScaleLabelYs: без перекрытия при близких Y",
()=>{

const th =
18;
const ys =
layoutScaleLabelYs(
[100, 102, 104],
th,
400
);

assert.equal(ys.length, 3);
assert.equal(ys[0], 100);
assert.equal(ys[1], 118);
assert.equal(ys[2], 136);

for(
let i = 1;
i < ys.length;
i++
){
assert.ok(
ys[i] - ys[i - 1] >= th
);
}

}
);

test(
"layoutScaleLabelYs: далёкие метки не сдвигаются",
()=>{

const th =
18;
const ys =
layoutScaleLabelYs(
[50, 200],
th,
400
);

assert.deepEqual(ys, [50, 200]);

}
);

test(
"layoutScaleLabelYs: сохраняет порядок индексов",
()=>{

const th =
18;
const ys =
layoutScaleLabelYs(
[300, 100, 101],
th,
500
);

assert.equal(ys[0], 300);
assert.equal(ys[1], 100);
assert.equal(ys[2], 118);

}
);

test(
"layoutScaleLabelYs: обходит фиксированную плашку текущей цены сверху",
()=>{

const th =
18;
const hud = {
centerY: 100,
height: 32
};
const ys =
layoutScaleLabelYs(
[98],
th,
400,
{
fixedBands: [hud]
}
);

assert.equal(ys[0], 75);

}
);

test(
"layoutScaleLabelYs: обходит фиксированную плашку текущей цены снизу",
()=>{

const th =
18;
const hud = {
centerY: 100,
height: 32
};
const ys =
layoutScaleLabelYs(
[102],
th,
400,
{
fixedBands: [hud]
}
);

assert.equal(ys[0], 125);

}
);

test(
"layoutScaleLabelYs: несколько меток и HUD без перекрытий",
()=>{

const th =
18;
const hud = {
centerY: 100,
height: 32
};
const ys =
layoutScaleLabelYs(
[98, 99, 102],
th,
400,
{
fixedBands: [hud]
}
);

assert.equal(ys[0], 57);
assert.equal(ys[1], 75);
assert.equal(ys[2], 134);

for(
const band of [
{ centerY: 100, height: 32 }
]
){
for(
const y of ys
){
const lTop = y - th / 2;
const lBottom = y + th / 2;
const bTop = band.centerY - band.height / 2;
const bBottom = band.centerY + band.height / 2;
assert.ok(
lBottom <= bTop ||
lTop >= bBottom
);
}

}

for(
let i = 0;
i < ys.length;
i++
){
for(
let j = i + 1;
j < ys.length;
j++
){
assert.ok(
Math.abs(ys[i] - ys[j]) >= th
);
}

}

}
);
