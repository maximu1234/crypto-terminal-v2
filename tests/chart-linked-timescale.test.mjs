import assert from "node:assert/strict";
import test from "node:test";

const {
linkPairedChartTimeScales
} = await import("../js/chart/chart-factory.js");

function mockChart(range){

let current = {
from: range.from,
to: range.to
};
const listeners = [];

const timeScale = {
getVisibleLogicalRange(){
return {
from: current.from,
to: current.to
};
},
setVisibleLogicalRange(next){
current = {
from: next.from,
to: next.to
};
for(const cb of listeners){
cb(current);
}
},
applyOptions(){},
options(){
return {
barSpacing: 8,
rightOffset: 12
};
},
subscribeVisibleLogicalRangeChange(cb){
listeners.push(cb);
return cb;
},
unsubscribeVisibleLogicalRangeChange(cb){
const i = listeners.indexOf(cb);
if(i >= 0){
listeners.splice(i, 1);
}
},
width(){
return 200;
}
};

return {
timeScale(){
return timeScale;
},
priceScale(){
return {
width(){
return 55;
},
applyOptions(){}
};
},
range(){
return {
from: current.from,
to: current.to
};
}
};

}

test("main pan always copies the visible range onto the linked pane", ()=>{

const main = mockChart({ from: 10, to: 40 });
const linked = mockChart({ from: 10, to: 40 });
const unlink = linkPairedChartTimeScales(
main,
linked,
undefined,
{
linkedDrivesMain: false
}
);

main.timeScale().setVisibleLogicalRange({
from: 20,
to: 50
});

assert.deepEqual(
linked.range(),
{
from: 20,
to: 50
}
);

unlink();

});

test("linked pane setData-style range change does not move main", ()=>{

const main = mockChart({ from: 10, to: 40 });
const linked = mockChart({ from: 10, to: 40 });
const unlink = linkPairedChartTimeScales(
main,
linked,
undefined,
{
linkedDrivesMain: false
}
);

linked.timeScale().setVisibleLogicalRange({
from: 0,
to: 8
});

assert.deepEqual(
main.range(),
{
from: 10,
to: 40
}
);

unlink();

});

test("dragging the linked pane moves the main chart", ()=>{

const main = mockChart({ from: 10, to: 40 });
const linked = mockChart({ from: 10, to: 40 });
const el = new EventTarget();
const unlink = linkPairedChartTimeScales(
main,
linked,
undefined,
{
linkedDrivesMain: false,
linkedEl: el
}
);

el.dispatchEvent(
Object.assign(
new Event("pointerdown"),
{
button: 0
}
)
);

linked.timeScale().setVisibleLogicalRange({
from: 4,
to: 18
});

assert.deepEqual(
main.range(),
{
from: 4,
to: 18
}
);

unlink();

});

test("wheel on the linked pane moves the main chart", ()=>{

const main = mockChart({ from: 10, to: 40 });
const linked = mockChart({ from: 10, to: 40 });
const el = new EventTarget();
const unlink = linkPairedChartTimeScales(
main,
linked,
undefined,
{
linkedDrivesMain: false,
linkedEl: el
}
);

el.dispatchEvent(
new Event("wheel")
);

linked.timeScale().setVisibleLogicalRange({
from: 12,
to: 30
});

assert.deepEqual(
main.range(),
{
from: 12,
to: 30
}
);

unlink();

});
