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
