import test from "node:test";
import assert from "node:assert/strict";

import {
collectTemplateApplyTargets
} from "../js/drawings/draw-templates.js";

test("fib template applies to every selected fib of the same type", ()=>{

const first = { id: "a", type: "fib" };
const second = { id: "b", type: "fib" };
const trend = { id: "c", type: "trendline" };

const targets =
collectTemplateApplyTargets({
type: "fib",
selectedIds: ["a", "b", "c"],
drawings: [first, second, trend],
primary: first
});

assert.deepEqual(
targets.map(shape=>shape.id),
["a", "b"]
);

});

test("a single selection still receives the template", ()=>{

const fib = { id: "a", type: "fib" };

const targets =
collectTemplateApplyTargets({
type: "fib",
selectedIds: ["a"],
drawings: [fib],
primary: fib
});

assert.deepEqual(
targets,
[fib]
);

});

test("fib retracement template does not restyle a selected extension", ()=>{

const fib = { id: "a", type: "fib" };
const ext = { id: "b", type: "fib-ext" };

const targets =
collectTemplateApplyTargets({
type: "fib",
selectedIds: ["a", "b"],
drawings: [fib, ext],
primary: fib
});

assert.deepEqual(
targets.map(shape=>shape.id),
["a"]
);

});
