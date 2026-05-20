import {
clearAlertOnDrawing,
clearAllDrawings,
clearAlertsHistory,
countAllDrawings,
formatAlertDate,
formatTfLabel,
getAlertsHistorySorted,
getAlertsSorted,
rebuildAlertRegistryFromStorage,
removeAlert,
removeAllAlerts
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

const historyTbody =
document.getElementById("alerts-history-tbody");

const historyEmptyEl =
document.getElementById("alerts-history-empty");

const historyWrap =
document.getElementById("alerts-history-wrap");

const clearHistoryBtn =
document.getElementById("alerts-clear-history");

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

function renderActive(){

const alerts =
getAlertsSorted();

deleteAllCb.checked = false;

if(!alerts.length){

emptyEl.classList.remove("hidden");
tableWrap.classList.add("hidden");
tbody.innerHTML = "";
return;

}

emptyEl.classList.add("hidden");
tableWrap.classList.remove("hidden");

tbody.innerHTML =
alerts.map(alert=>`

<tr data-shape-id="${alert.shapeId}">

<td>${formatAlertDate(alert.createdAt)}</td>

<td>
<a class="alerts-symbol-link" href="/coins.html?symbol=${encodeURIComponent(alert.symbol)}&tf=${encodeURIComponent(alert.tf || "60")}">
${displaySymbol(alert.symbol)}
</a>
</td>

<td class="alerts-tf">${formatTfLabel(alert.tf)}</td>

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

removeOne(
cb.dataset.symbol,
cb.dataset.shapeId
);

});

});

}

function renderHistory(){

const history =
getAlertsHistorySorted();

if(!history.length){

historyEmptyEl.classList.remove("hidden");
historyWrap.classList.add("hidden");
clearHistoryBtn?.classList.add("hidden");
historyTbody.innerHTML = "";
return;

}

historyEmptyEl.classList.add("hidden");
historyWrap.classList.remove("hidden");
clearHistoryBtn?.classList.remove("hidden");

historyTbody.innerHTML =
history.map(alert=>`

<tr>

<td>${formatAlertDate(alert.triggeredAt)}</td>

<td>${formatAlertDate(alert.createdAt)}</td>

<td>
<a class="alerts-symbol-link" href="/coins.html?symbol=${encodeURIComponent(alert.symbol)}&tf=${encodeURIComponent(alert.tf || "60")}">
${displaySymbol(alert.symbol)}
</a>
</td>

<td class="alerts-tf">${formatTfLabel(alert.tf)}</td>

<td class="alerts-price">${formatPrice(alert.price)}</td>

</tr>

`).join("");

}

function render(){

renderActive();
renderHistory();
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
rebuildAlertRegistryFromStorage();
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
removeAlert(symbol, shapeId);
render();

}

deleteAllCb?.addEventListener("change", ()=>{

if(!deleteAllCb.checked){
return;
}

const alerts =
getAlertsSorted();

alerts.forEach(alert=>{
clearAlertOnDrawing(alert.symbol, alert.shapeId);
});

removeAllAlerts();
deleteAllCb.checked = false;
render();

});

clearHistoryBtn?.addEventListener("click", ()=>{

clearAlertsHistory();
render();

});

window.addEventListener("alerts-changed", render);
window.addEventListener("alerts-history-changed", render);

rebuildAlertRegistryFromStorage();
render();
