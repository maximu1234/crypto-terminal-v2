/**
 * LocalStorage load/save + shape normalization for drawings.
 * Phase 3 split from drawings/init.js.
 */
import {
STROKE,
RECT_DEFAULT_FILL_COLOR,
RECT_DEFAULT_FILL_OPACITY
} from "./constants.js?v=8";

import {
ensureFibLevelsVisible,
finalizeFibLevels
} from "./fib-spec.js?v=12";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=1";

import {
normalizeRectangleShape
} from "./arrow-rect.js?v=2";

const LEGACY_TF_KEYS =
Object.freeze([
"1",
"5",
"15",
"60",
"240",
"D"
]);

export function stripAlertFromShape(
shape
){

const cleaned = {
...shape,
isAlert: false
};

delete cleaned.alertCreatedAt;
delete cleaned.alertTf;
delete cleaned.alertSymbol;

if(
cleaned.savedColor
){
cleaned.color =
cleaned.savedColor;
delete cleaned.savedColor;
}

if(
cleaned.savedLineWidth !=
null
){
cleaned.lineWidth =
cleaned.savedLineWidth;
delete cleaned.savedLineWidth;
}

return cleaned;

}

export function createDrawingsPersist(
deps
){

const {
getSymbol,
canUseDrawings,
isCloudSyncEnabled,
getDrawings,
setDrawings,
getSelectedId,
setSelectedId,
syncDrawUndoBaseline,
drawUndo,
cloneDrawingsForUndo,
initialPositionTpSl,
bumpDrawingsLocalRevision,
scheduleDrawingsCloudPush,
touchStorageSnap
} =
deps;

function normalizeShape(
shape
){

shape.color =
shape.color ||
STROKE;
shape.lineWidth =
shape.lineWidth ||
1;

if(
shape.type ===
"fib"
){

shape.fibLevels =
ensureFibLevelsVisible(
finalizeFibLevels(
shape.fibLevels ??
shape.levels
)
);

shape.fibShowTrendLine =
typeof shape.fibShowTrendLine ===
"boolean"
? shape.fibShowTrendLine
: typeof shape.showFibTrend ===
"boolean"
? !!shape.showFibTrend
: false;

delete shape.levels;
delete shape.showFibTrend;

}

if(
isPositionType(
shape.type
)
){

if(
!shape.p1 ||
!shape.p2
){
return shape;
}

const entry =
positionEntryPrice(
shape
);
const init =
initialPositionTpSl(
shape.type,
entry
);

shape.tpPrice =
Number(
shape.tpPrice
) ||
init.tpPrice;
shape.slPrice =
Number(
shape.slPrice
) ||
init.slPrice;
shape.p1.price =
entry;
shape.p2.price =
entry;

const risk =
Number(
shape.riskUsd
);

if(
Number.isFinite(
risk
) &&
risk >
0
){
shape.riskUsd =
risk;
}else{
delete shape.riskUsd;
}

}

if(
shape.type ===
"rectangle"
){

normalizeRectangleShape(
shape,
{
showFill: true,
fillColor: RECT_DEFAULT_FILL_COLOR,
fillOpacity: RECT_DEFAULT_FILL_OPACITY,
medianColor:
shape.color ||
STROKE,
medianLineWidth: 1,
medianLineStyle: "dashed"
}
);

}

return shape;

}

function normalizeDrawingShape(
shape
){

try{
return stripAlertFromShape(
normalizeShape(
shape
)
);
}catch(
err
){
console.warn(
"normalize drawing shape",
err,
shape?.type,
shape?.id
);
return shape;
}

}

function storageKey(){

return `drawings_${getSymbol()}`;

}

function sanitizeDrawingsForCurrentSymbol(){

let dirty =
false;

const prev =
getDrawings();
const next =
prev
.map(
shape=>{

if(
shape.type !==
"hray" ||
!shape.isAlert
){
return shape;
}

dirty =
true;
return stripAlertFromShape(
shape
);

}
)
.filter(
shape=>
!String(
shape?.id ||
""
).startsWith(
"pa_"
)
);

if(
next.length !==
prev.length
){
dirty =
true;
}

setDrawings(
next
);

if(
dirty
){

try{
localStorage.setItem(
storageKey(),
JSON.stringify(
getDrawings()
)
);
}catch{
/* ignore */
}

}

}

function loadDrawings(){

if(
!canUseDrawings()
){
setDrawings(
[]
);
setSelectedId(
null
);
syncDrawUndoBaseline();
return;
}

const key =
storageKey();

try{

let raw =
localStorage.getItem(
key
);

if(
!raw
){

const merged =
[];
const seen =
new Set();
const sym =
getSymbol();

LEGACY_TF_KEYS.forEach(
tf=>{

try{

const legacy =
JSON.parse(
localStorage.getItem(
`drawings_${sym}_${tf}`
) ||
"[]"
);

legacy.forEach(
shape=>{

if(
!seen.has(
shape.id
)
){
seen.add(
shape.id
);
merged.push(
shape
);
}

}
);

}catch{
/* ignore */
}

}
);

setDrawings(
merged.map(
shape=>
normalizeDrawingShape(
shape
)
)
);

sanitizeDrawingsForCurrentSymbol();

if(
getDrawings().length
){
localStorage.setItem(
storageKey(),
JSON.stringify(
getDrawings()
)
);
}

syncDrawUndoBaseline();
return;

}

setDrawings(
JSON.parse(
raw
).map(
shape=>
normalizeDrawingShape(
shape
)
)
);

}catch{

setDrawings(
[]
);

}

sanitizeDrawingsForCurrentSymbol();
syncDrawUndoBaseline();

}

function saveDrawings(
options = {}
){

setDrawings(
getDrawings().map(
shape=>{
if(
shape?.isAlert
){
return stripAlertFromShape(
shape
);
}
return shape;
}
)
);

if(
!options.skipUndoRecord &&
!drawUndo.replay
){

drawUndo.recordIfChanged(
cloneDrawingsForUndo(
getDrawings(),
normalizeDrawingShape
)
);

}

localStorage.setItem(
storageKey(),
JSON.stringify(
getDrawings()
)
);

touchStorageSnap();

if(
canUseDrawings()
){
bumpDrawingsLocalRevision();
scheduleDrawingsCloudPush();
}else if(
isCloudSyncEnabled()
){
console.warn(
"[drawings] сохранено только локально — войдите в аккаунт (шестерёнка), чтобы строки попали в Supabase."
);
}

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{
detail:{
symbol: getSymbol(),
local: true
}
}
)
);

}

function persistDrawingsForSymbol(
sym
){

if(
!sym ||
!canUseDrawings()
){
return;
}

try{

localStorage.setItem(
`drawings_${sym}`,
JSON.stringify(
getDrawings()
)
);

bumpDrawingsLocalRevision();
scheduleDrawingsCloudPush();

}catch{
/* ignore */
}

}

return {
storageKey,
normalizeDrawingShape,
loadDrawings,
saveDrawings,
sanitizeDrawingsForCurrentSymbol,
persistDrawingsForSymbol
};

}
