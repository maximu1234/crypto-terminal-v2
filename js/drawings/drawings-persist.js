/**
 * LocalStorage / IndexedDB load/save + shape normalization for drawings.
 * Payloads go through drawings-kv (memory + IndexedDB; cross-tab BroadcastChannel).
 */
import {
STROKE,
createRectangleToolDefaults
} from "./constants.js?v=14";

import {
ensureFibLevelsVisible,
finalizeFibLevels,
isFibType,
isFibExtType,
resolveFibTrendLineColor
} from "./fib-spec.js?v=18";

import {
isPositionType,
positionEntryPrice
} from "./position.js?v=11";

import {
ensureBrushShape
} from "./brush.js?v=2";

import {
normalizeRectangleShape
} from "./arrow-rect.js?v=4";

import {
isFvpType,
normalizeFvpShape,
createFvpToolDefaults
} from "./fixed-volume-profile.js?v=3";

import {
normalizeTextShape
} from "./text.js?v=3";

import {
ensureChannelLevelsVisible
} from "./channel-spec.js?v=2";

import {
isElliottType,
normalizeElliottShape
} from "./elliott-spec.js?v=23";

import {
drawingsStorageKey
} from "../drawings-exchange-key.js?v=5";

import {
drawingsKvGet,
drawingsKvSet,
ensureDrawingsKvReady
} from "../drawings-kv.js?v=3";

void ensureDrawingsKvReady();

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

if(
!isElliottType(
shape.type
)
){
shape.color =
shape.color ||
STROKE;
}

shape.lineWidth =
shape.lineWidth ||
1;

shape.locked =
!!shape.locked;

if(
isFibType(
shape.type
)
){

shape.fibLevels =
ensureFibLevelsVisible(
finalizeFibLevels(
shape.fibLevels ??
shape.levels,
shape.type
),
shape.type
);

shape.fibShowTrendLine =
typeof shape.fibShowTrendLine ===
"boolean"
? shape.fibShowTrendLine
: typeof shape.showFibTrend ===
"boolean"
? !!shape.showFibTrend
: isFibExtType(
shape.type
);

shape.fibShowLabels =
typeof shape.fibShowLabels ===
"boolean"
? shape.fibShowLabels
: true;

shape.fibTrendLineColor =
resolveFibTrendLineColor(
shape.fibTrendLineColor
);

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

const rectFactory =
createRectangleToolDefaults();

normalizeRectangleShape(
shape,
{
fillColor:
shape.fillColor ||
shape.color ||
rectFactory.fillColor,
fillOpacity:
Number.isFinite(
Number(
shape.fillOpacity
)
)
? Number(
shape.fillOpacity
)
: rectFactory.fillOpacity,
medianColor:
shape.medianColor ||
shape.color ||
rectFactory.medianColor
}
);

}

if(
isFvpType(
shape.type
)
){

normalizeFvpShape(
shape,
createFvpToolDefaults()
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

if(
shape.type ===
"text"
){

normalizeTextShape(
shape
);

}

if(
shape.type ===
"channel"
){

shape.channelLevels =
ensureChannelLevelsVisible(
shape.channelLevels
);

}

if(
isElliottType(
shape.type
)
){

normalizeElliottShape(
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
drawingsKvSet(
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
drawingsKvGet(
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
drawingsKvGet(
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
drawingsKvGet(
drawingsStorageKey(
sym,
{
tfSuffix:
`_${tf}`
}
)
) ||
drawingsKvGet(
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
drawingsKvSet(
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

drawingsKvSet(
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

drawingsKvSet(
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
