import test from "node:test";
import assert from "node:assert/strict";

import {
parseRectFillSwatch,
rectSettingsHtml
} from "../js/drawings/draw-rect-settings.js";

test("rectSettingsHtml has border, median and fill controls", ()=>{

const html =
rectSettingsHtml();

assert.match(
html,
/class="rect-settings"/
);
assert.match(
html,
/rect-border-style-btn/
);
assert.match(
html,
/rect-show-median/
);
assert.match(
html,
/rect-show-fill/
);
assert.match(
html,
/rect-fill-color-btn/
);

});

test("parseRectFillSwatch reads hex as opaque fill", ()=>{

const parsed =
parseRectFillSwatch(
"#3b82f6"
);

assert.equal(
parsed.fillColor,
"#3b82f6"
);
assert.equal(
parsed.fillOpacity,
1
);

});

test("parseRectFillSwatch falls back when the swatch is empty", ()=>{

const parsed =
parseRectFillSwatch(
""
);

assert.equal(
typeof parsed.fillColor,
"string"
);
assert.ok(
parsed.fillColor.length >
0
);
assert.equal(
typeof parsed.fillOpacity,
"number"
);

});
