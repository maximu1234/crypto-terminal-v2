/**
 * LocalStorage load/save + shape normalization for drawings.
 * Drawings are local-only — no cloud sync.
 */
import {
STROKE,
createRectangleToolDefaults
} from "./constants.js?v=10";

import {
ensureFibLevelsVisible,
finalizeFibLevels
} from "./fib-spec.js?v=13";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=9";

import {
ensureBrushShape
} from "./brush.js?v=2";

import {
normalizeRectangleShape
} from "./arrow-rect.js?v=2";

import {
drawingsStorageKey
} from "../drawings-exchange-key.js?v=1";

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
getDrawings,
setDrawings,
getSelectedId,
setSelectedId,
syncDrawUndoBaseline,
drawUndo,
cloneDrawingsForUndo,
onDrawUndoPush =
null,
initialPositionTpSl,
touchStorageSnap,
storageKeySuffix = ""
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
createRectangleToolDefaults({
fillColor:
shape.color ||
createRectangleToolDefaults().color,
medianColor:
shape.color ||
createRectangleToolDefaults().color
})
);

}

if(
shape.type ===
"brush"
){

ensureBrushShape(
shape
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

return drawingsStorageKey(
getSymbol(),
{
tfSuffix:
storageKeySuffix
}
);

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

function loadDrawingsFromStorageKey(
key
){

try{

const raw =
localStorage.getItem(
key
);

if(
!raw
){
return false;
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

return true;

}catch{

setDrawings(
[]
);

return false;

}

}

function loadDrawings(){

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
drawingsStorageKey(
sym,
{
tfSuffix:
`_${tf}`
}
)
) ||
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
),
onDrawUndoPush
? {
onPush:
onDrawUndoPush
}
: undefined
);

}

try{

localStorage.setItem(
storageKey(),
JSON.stringify(
getDrawings()
)
);

touchStorageSnap();

}catch{
/* ignore quota / private mode */
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
!sym
){
return;
}

try{

localStorage.setItem(
drawingsStorageKey(
sym
),
JSON.stringify(
getDrawings()
)
);

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
