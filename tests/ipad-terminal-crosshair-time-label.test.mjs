import "./helpers/stub-browser.mjs";
import assert from "node:assert/strict";
import test from "node:test";

import {
resolveCrosshairPlotTime,
updateCrosshairAxisLabels
} from "../js/chart/chart-dom-crosshair.js";

function mockTimeLabel(){

const classes =
new Set([
"hidden"
]);

return {
textContent:"",
style:{
left:"",
removeProperty(
name
){
if(
name ===
"left"
){
this.left =
"";
}
}
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
},
has(
name
){
return classes.has(
name
);
}
},
_classes: classes
};

}

test("time axis label follows the vertical plot x when bar time is known", ()=>{

const timeLabelEl =
mockTimeLabel();

updateCrosshairAxisLabels({
param:{
time: 1_704_067_200,
point:{
x: 240,
y: 12
}
},
timeLabelEl,
snappedX: 240,
plotY: 12
});

assert.equal(
timeLabelEl.style.left,
"240px"
);
assert.equal(
timeLabelEl._classes.has(
"hidden"
),
false
);
assert.ok(
timeLabelEl.textContent.length >
0
);

});

test("time axis label stays hidden until a plot time exists", ()=>{

const timeLabelEl =
mockTimeLabel();

updateCrosshairAxisLabels({
param:{
time: null,
point:{
x: 240,
y: 12
}
},
timeLabelEl,
snappedX: 240,
plotY: 12
});

assert.equal(
timeLabelEl._classes.has(
"hidden"
),
true
);

});

test("plot time prefers the main scale, then the linked indicator scale", ()=>{

const mainChart = {
timeScale(){
return {
coordinateToTime(
x
){
return x ===
80
? 1_100
: null;
}
};
}
};

const linkedChart = {
timeScale(){
return {
coordinateToTime(){
return 2_200;
}
};
}
};

assert.equal(
resolveCrosshairPlotTime(
80,
[
mainChart,
linkedChart
]
),
1_100
);

assert.equal(
resolveCrosshairPlotTime(
12,
[
mainChart,
linkedChart
]
),
2_200
);

assert.equal(
resolveCrosshairPlotTime(
12,
[
{
timeScale(){
return {
coordinateToTime(){
return null;
}
};
}
}
]
),
null
);

});
