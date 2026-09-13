import test from "node:test";
import assert from "node:assert/strict";

import {
computePlusMenuPosition
} from "../js/trade-order-plus-menu-pos.js";

import {
isPriceScalePlusChromeTarget
} from "../js/tablet-gesture-policy.js";

import {
isFineChartPointerType
} from "../js/drawings/touch-placement-policy.js";

test("plus menu sits left of the plus, not at the wrap origin", ()=>{

const pos =
computePlusMenuPosition({
wrapWidth: 800,
wrapHeight: 400,
plusLeft: 740,
plusTop: 180,
plusWidth: 32,
plusHeight: 32,
menuWidth: 140,
menuHeight: 90
});

assert.ok(
pos.left >
4
);
assert.ok(
pos.left <
740
);
assert.ok(
pos.top >
4
);
assert.ok(
pos.top <
180 + 16
);

});

test("plus menu falls back when layout reports a zero-size box", ()=>{

const pos =
computePlusMenuPosition({
wrapWidth: 800,
wrapHeight: 400,
plusLeft: 740,
plusTop: 180,
plusWidth: 32,
plusHeight: 32,
menuWidth: 0,
menuHeight: 0
});

assert.equal(
pos.left,
740 - 140 - 8
);
assert.ok(
pos.top >
4
);

});

test("plus / order menu are chart chrome, not pan/probe targets", ()=>{

assert.equal(
isPriceScalePlusChromeTarget({
target:{
closest:(
sel
)=>
sel.includes(
".price-alert-scale-plus"
)
}
}
),
true
);
assert.equal(
isPriceScalePlusChromeTarget({
target:{
closest:()=>
null
}
}
),
false
);

});

test("iPad mouse is a fine pointer for plus hover", ()=>{

assert.equal(
isFineChartPointerType(
"mouse"
),
true
);
assert.equal(
isFineChartPointerType(
"touch"
),
false
);

});
