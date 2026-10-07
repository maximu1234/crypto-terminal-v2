import test from "node:test";
import assert from "node:assert/strict";

import {
parseRectFillSwatch,
rectSettingsHtml
} from "../js/drawings/draw-rect-settings.js";

import {
normalizeRectangleShape
} from "../js/drawings/arrow-rect.js";

test("rect settings split the border into horizontal and vertical edges", ()=>{

const html =
rectSettingsHtml();

assert.match(
html,
/class="rect-settings"/
);
assert.match(
html,
/rect-show-horiz/
);
assert.match(
html,
/Horizontal/
);
assert.match(
html,
/rect-horiz-style-btn/
);
assert.match(
html,
/rect-horiz-color-btn/
);
assert.match(
html,
/rect-show-vert/
);
assert.match(
html,
/Vertical/
);
assert.match(
html,
/rect-vert-style-btn/
);
assert.match(
html,
/rect-vert-color-btn/
);
assert.equal(
html.includes("rect-border-style-btn"),
false
);
assert.match(
html,
/rect-show-median/
);
assert.match(
html,
/rect-show-fill/
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

test("old rectangles keep both edge pairs", ()=>{

const shape =
normalizeRectangleShape({
type: "rectangle",
color: "#a855f7",
lineStyle: "solid"
});

assert.equal(shape.showHorizLines, true);
assert.equal(shape.showVertLines, true);
assert.equal(shape.horizColor, "#a855f7");
assert.equal(shape.vertColor, "#a855f7");
assert.equal(shape.horizLineStyle, "solid");
assert.equal(shape.vertLineStyle, "solid");

});

test("saved rectangle defaults keep edge toggles, colors, and line styles", ()=>{

const shape =
normalizeRectangleShape({
type: "rectangle",
color: "#112233",
lineWidth: 1
}, {
showHorizLines: false,
showVertLines: true,
horizLineStyle: "dashed",
vertLineStyle: "dotted",
horizColor: "#ff0000",
vertColor: "#00ff00",
lineStyle: "dashed",
showMedian: true,
medianLineStyle: "dotted"
});

assert.equal(shape.showHorizLines, false);
assert.equal(shape.showVertLines, true);
assert.equal(shape.horizLineStyle, "dashed");
assert.equal(shape.vertLineStyle, "dotted");
assert.equal(shape.horizColor, "#ff0000");
assert.equal(shape.vertColor, "#00ff00");
assert.equal(shape.showMedian, true);
assert.equal(shape.medianLineStyle, "dotted");

});

test("old rectangles keep their own border color and line style", ()=>{

const shape =
normalizeRectangleShape({
type: "rectangle",
color: "#ff0000",
lineStyle: "dashed"
}, {
fillColor: "#ff0000",
fillOpacity: 0.15,
medianColor: "#ff0000"
});

assert.equal(shape.showHorizLines, true);
assert.equal(shape.showVertLines, true);
assert.equal(shape.horizColor, "#ff0000");
assert.equal(shape.vertColor, "#ff0000");
assert.equal(shape.horizLineStyle, "dashed");
assert.equal(shape.vertLineStyle, "dashed");
assert.equal(shape.showMedian, false);

});
