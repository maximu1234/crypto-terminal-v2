import test from "node:test";
import assert from "node:assert/strict";

import {
resolveCoinsTabletListNavSlot
} from "../js/terminal/coins-tablet-list-nav.js";

test("tablet list nav sits in the coins pane above the positions panel", ()=>{

const pane = {
id: "pane"
};
const split = {
id: "split"
};
const panel = {
id: "panel"
};
const list = {
querySelector(
sel
){

if(
sel ===
".coins-list-pane"
){
return pane;
}

if(
sel ===
".trade-book-split-resize"
){
return split;
}

if(
sel ===
"#trade-book-panel"
){
return panel;
}

return null;

}
};

const slot =
resolveCoinsTabletListNavSlot(
list
);

assert.equal(
slot.parent,
pane
);
assert.equal(
slot.before,
null
);

});

test("without a pane, tablet list nav inserts before the positions split", ()=>{

const split = {
id: "split"
};
const panel = {
id: "panel"
};
const list = {
querySelector(
sel
){

if(
sel ===
".coins-list-pane"
){
return null;
}

if(
sel ===
".trade-book-split-resize"
){
return split;
}

if(
sel ===
"#trade-book-panel"
){
return panel;
}

return null;

}
};

const slot =
resolveCoinsTabletListNavSlot(
list
);

assert.equal(
slot.parent,
list
);
assert.equal(
slot.before,
split
);

});

test("without trade chrome, tablet list nav stays on the coin list", ()=>{

const list = {
querySelector(){
return null;
}
};

const slot =
resolveCoinsTabletListNavSlot(
list
);

assert.equal(
slot.parent,
list
);
assert.equal(
slot.before,
null
);

});
