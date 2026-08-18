import test from "node:test";
import assert from "node:assert/strict";

import {
fibSettingsHtml,
setFibLevelColorButton,
mergeFibLevelsAfterGlobalChange
} from "../js/drawings/draw-fib-settings.js";

test("fibSettingsHtml has trend line and level grid", ()=>{

const html =
fibSettingsHtml();

assert.match(
html,
/class="fib-settings"/
);
assert.match(
html,
/id="fib-show-trend-line"/
);
assert.match(
html,
/fib-global-line-style-btn/
);
assert.match(
html,
/id="fib-level-rows-root"/
);

});

test("setFibLevelColorButton stores a custom hex on the button", ()=>{

const classes =
new Set();
const btn =
{
dataset:{},
style:{
background:
""
},
classList:{
add(
name
){
classes.add(
name
);
},
remove(
name
){
classes.delete(
name
);
}
}
};

setFibLevelColorButton(
btn,
"#ef4444",
"#3b82f6"
);
assert.equal(
btn.dataset.customColor,
"#ef4444"
);
assert.equal(
btn.style.background,
"#ef4444"
);
assert.equal(
classes.has(
"has-custom"
),
true
);

});

test("mergeFibLevelsAfterGlobalChange can clear per-level colors", ()=>{

const shape =
{
fibLevels:[
{
v:
0.5,
enabled:
true,
color:
"#ffffff",
lineWidth:
2
}
],
fibShowTrendLine:
false
};
const panel =
{
fibLevels:[
{
v:
0.5,
enabled:
true,
fillBg:
false,
color:
"#ffffff",
lineStyle:
"solid",
lineWidth:
2
}
],
fibShowTrendLine:
true
};

mergeFibLevelsAfterGlobalChange(
shape,
panel,
{
clearColors:
true,
clearWidths:
false
}
);

assert.equal(
shape.fibShowTrendLine,
true
);
assert.equal(
shape.fibLevels[
0
].color,
undefined
);
assert.equal(
shape.fibLevels[
0
].lineWidth,
2
);

});
