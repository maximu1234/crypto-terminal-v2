#!/usr/bin/env node
/**
 * Unit tests: draw-undo stack (Cmd+Z snapshots).
 */
import {
test
} from "node:test";

import assert from "node:assert/strict";

import {
cloneDrawingsForUndo,
drawingsUndoSnapshotsEqual,
createDrawUndoStack
} from "../js/drawings/draw-undo.js";

const norm =
shape=>({
...shape,
id: String(shape.id)
});

test(
"drawUndo: recordIfChanged pushes baseline on change",
()=>{

const undo =
createDrawUndoStack();
const a =
[{ id: "1", type: "trendline" }];
const b =
[{ id: "1", type: "trendline", color: "#fff" }];

undo.syncBaseline(
cloneDrawingsForUndo(
a,
norm
)
);
undo.recordIfChanged(
cloneDrawingsForUndo(
b,
norm
)
);

assert.equal(
undo.canUndo(),
true
);

const prev =
undo.pop();

assert.deepEqual(
prev,
cloneDrawingsForUndo(
a,
norm
)
);

}
);

test(
"drawUndo: replay skips record",
()=>{

const undo =
createDrawUndoStack();
const a =
[{ id: "1" }];
const b =
[{ id: "2" }];

undo.syncBaseline(
cloneDrawingsForUndo(
a,
norm
)
);
undo.setReplay(
true
);
undo.recordIfChanged(
cloneDrawingsForUndo(
b,
norm
)
);
undo.setReplay(
false
);

assert.equal(
undo.canUndo(),
false
);

}
);

test(
"drawingsUndoSnapshotsEqual ignores reference equality",
()=>{

const one =
[{ id: "x" }];
const two =
[{ id: "x" }];

assert.equal(
drawingsUndoSnapshotsEqual(
one,
two
),
true
);

}
);
