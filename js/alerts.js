const STORAGE_KEY = "price_alerts_v1";

export const ALERT_LINE_COLOR = "#facc15";

export const ALERT_LINE_DASH = [8, 6];

export function loadAlerts(){

try{

const raw =
localStorage.getItem(STORAGE_KEY);

if(!raw){
return [];
}

const list =
JSON.parse(raw);

return Array.isArray(list)
? list
: [];

}catch{

return [];

}

}

export function saveAlerts(list){

localStorage.setItem(
STORAGE_KEY,
JSON.stringify(list)
);

window.dispatchEvent(
new CustomEvent(
"alerts-changed"
)
);

}

export function getAlertsSorted(){

return loadAlerts().sort(
(a, b)=>
(b.createdAt || 0) - (a.createdAt || 0)
);

}

export function upsertAlert(entry){

const list =
loadAlerts().filter(
a=>a.shapeId !== entry.shapeId
);

list.push(entry);

saveAlerts(list);

}

export function removeAlertByShapeId(shapeId){

const list =
loadAlerts().filter(
a=>a.shapeId !== shapeId
);

saveAlerts(list);

}

export function removeAllAlerts(){

saveAlerts([]);

}

export function clearAlertOnDrawing(symbol, shapeId){

const key =
`drawings_${symbol}`;

const raw =
localStorage.getItem(key);

if(!raw){
return false;
}

try{

const drawings =
JSON.parse(raw);

const shape =
drawings.find(
d=>d.id === shapeId
);

if(!shape){
return false;
}

shape.isAlert = false;

delete shape.alertCreatedAt;

if(shape.savedColor){
shape.color = shape.savedColor;
delete shape.savedColor;
}

if(shape.savedLineWidth != null){
shape.lineWidth = shape.savedLineWidth;
delete shape.savedLineWidth;
}

localStorage.setItem(
key,
JSON.stringify(drawings)
);

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol } }
)
);

return true;

}catch{

return false;

}

}

export function syncAlertsForSymbol(
symbol,
drawings
){

const others =
loadAlerts().filter(
a=>a.symbol !== symbol
);

const fromDrawings =
(drawings || [])
.filter(
d=>
d.type === "hray" &&
d.isAlert
)
.map(d=>({
id:d.id,
shapeId:d.id,
symbol,
price:Number(d.price),
createdAt:
Number(d.alertCreatedAt) ||
Date.now()
}));

saveAlerts([
...others,
...fromDrawings
]);

}

function isDrawingsStorageKey(key){

if(!key?.startsWith("drawings_")){
return false;
}

const rest =
key.slice("drawings_".length);

if(!rest){
return false;
}

const legacy =
rest.match(
/^(.+)_(1|5|15|60|240|D)$/
);

if(legacy){
return true;
}

if(!rest.includes("_")){
return true;
}

return false;

}

function symbolFromDrawingsKey(key){

const rest =
key.slice("drawings_".length);

const legacy =
rest.match(
/^(.+)_(1|5|15|60|240|D)$/
);

if(legacy){
return legacy[1];
}

return rest;

}

export function countAllDrawings(){

let total = 0;

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!isDrawingsStorageKey(key)){
continue;
}

try{

const drawings =
JSON.parse(localStorage.getItem(key) || "[]");

if(Array.isArray(drawings)){
total += drawings.length;
}

}catch{}

}

return total;

}

export function clearAllDrawings(){

const symbols =
new Set();

const keys = [];

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!isDrawingsStorageKey(key)){
continue;
}

keys.push(key);
symbols.add(symbolFromDrawingsKey(key));

}

keys.forEach(key=>{
localStorage.removeItem(key);
});

removeAllAlerts();

symbols.forEach(symbol=>{

window.dispatchEvent(
new CustomEvent(
"drawings-updated",
{ detail:{ symbol } }
)
);

});

window.dispatchEvent(
new CustomEvent("drawings-cleared-all")
);

return keys.length;

}

export function formatAlertDate(ts){

if(!ts){
return "—";
}

const d =
new Date(ts);

const pad =
n=>String(n).padStart(2, "0");

return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

}
