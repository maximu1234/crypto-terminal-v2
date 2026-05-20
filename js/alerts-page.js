import {
clearAlertOnDrawing,
clearAllDrawings,
countAllDrawings,
formatAlertDate,
getAlertsSorted,
loadAlerts,
removeAlertByShapeId,
removeAllAlerts,
saveAlerts
} from "./alerts.js";

import { formatPrice } from "./chart.js";

const tbody =
document.getElementById("alerts-tbody");

const emptyEl =
document.getElementById("alerts-empty");

const tableWrap =
document.getElementById("alerts-table-wrap");

const deleteAllCb =
document.getElementById("alerts-delete-all");

const clearDrawingsAction =
document.getElementById("alerts-clear-drawings-action");

const clearDrawingsStatus =
document.getElementById("alerts-clear-drawings-status");

let clearDrawingsSuccessTimer = null;

function displaySymbol(symbol){

if(!symbol){
return "—";
}

return symbol.endsWith("USDT")
? `${symbol.replace(/USDT$/, "")}/USDT`
: symbol;

}

function render(){

const alerts =
getAlertsSorted();

deleteAllCb.checked = false;

if(!alerts.length){

emptyEl.classList.remove("hidden");
tableWrap.classList.add("hidden");
tbody.innerHTML = "";
updateClearDrawingsUi();
return;

}

emptyEl.classList.add("hidden");
tableWrap.classList.remove("hidden");

tbody.innerHTML =
alerts.map(alert=>`

<tr data-shape-id="${alert.shapeId}">

<td>${formatAlertDate(alert.createdAt)}</td>

<td>
<a class="alerts-symbol-link" href="coins.html?symbol=${encodeURIComponent(alert.symbol)}">
${displaySymbol(alert.symbol)}
</a>
</td>

<td class="alerts-price">${formatPrice(alert.price)}</td>

<td class="alerts-col-delete">
<label class="alerts-row-delete">
<input type="checkbox" class="alerts-delete-one" data-shape-id="${alert.shapeId}" data-symbol="${alert.symbol}" title="Удалить алерт"/>
</label>
</td>

</tr>

`).join("");

tbody.querySelectorAll(".alerts-delete-one").forEach(cb=>{

cb.addEventListener("change", ()=>{

if(!cb.checked){
return;
}

removeOne(cb.dataset.symbol, cb.dataset.shapeId);

});

});

updateClearDrawingsUi();

}

function updateClearDrawingsUi(){

const count =
countAllDrawings();

if(!clearDrawingsAction){
return;
}

if(count > 0){

clearDrawingsAction.innerHTML =
`<button type="button" class="alerts-clear-drawings-link">Удалить</button>`;

const btn =
clearDrawingsAction.querySelector("button");

btn.onclick = e=>{
e.preventDefault();
clearAllDrawings();
rebuildRegistryFromDrawings();
render();
showClearDrawingsSuccess();
};

}else{

clearDrawingsAction.innerHTML =
`<span class="alerts-clear-drawings-text">Удалить</span>`;

}

}

function showClearDrawingsSuccess(){

if(!clearDrawingsStatus){
return;
}

clearDrawingsStatus.textContent =
"Успешно удалено";

clearDrawingsStatus.classList.remove("hidden");

if(clearDrawingsSuccessTimer){
clearTimeout(clearDrawingsSuccessTimer);
}

clearDrawingsSuccessTimer =
setTimeout(()=>{

clearDrawingsStatus.classList.add("hidden");
clearDrawingsStatus.textContent = "";
clearDrawingsSuccessTimer = null;

}, 4000);

}

function removeOne(symbol, shapeId){

clearAlertOnDrawing(symbol, shapeId);
removeAlertByShapeId(shapeId);
render();

}

deleteAllCb?.addEventListener("change", ()=>{

if(!deleteAllCb.checked){
return;
}

const alerts =
loadAlerts();

alerts.forEach(alert=>{
clearAlertOnDrawing(alert.symbol, alert.shapeId);
});

removeAllAlerts();
deleteAllCb.checked = false;
render();

});

function rebuildRegistryFromDrawings(){

const merged = [];

for(let i = 0; i < localStorage.length; i++){

const key =
localStorage.key(i);

if(!key?.startsWith("drawings_")){
continue;
}

const legacy =
key.slice("drawings_".length).match(
/^(.+)_(1|5|15|60|240|D)$/
);

const symbol =
legacy
? legacy[1]
: key.slice("drawings_".length);

try{

const drawings =
JSON.parse(localStorage.getItem(key) || "[]");

if(!Array.isArray(drawings)){
continue;
}

drawings
.filter(
d=>
d.type === "hray" &&
d.isAlert
)
.forEach(d=>{

merged.push({
id:d.id,
shapeId:d.id,
symbol,
price:Number(d.price),
createdAt:
Number(d.alertCreatedAt) ||
Date.now()
});

});

}catch{}

}

saveAlerts(merged);

}

window.addEventListener("alerts-changed", render);

rebuildRegistryFromDrawings();
render();
