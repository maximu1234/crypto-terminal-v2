/**
 * Песочница: тестовая страница маркеров сделок на ETHUSDT.P.
 * Не подключается к terminal / trade-desktop-boot.
 */
import {
createSandboxChart
} from "./chart.js?v=7";

const gateEl =
document.getElementById(
"trade-markers-test-gate"
);
const appEl =
document.getElementById(
"trade-markers-test-app"
);
const statusEl =
document.getElementById(
"trade-markers-test-status"
);
const chartEl =
document.getElementById(
"trade-markers-test-chart"
);
const tfBar =
document.getElementById(
"trade-markers-test-tf"
);
const showCheckbox =
document.getElementById(
"trade-markers-test-show"
);
const refreshBtn =
document.getElementById(
"trade-markers-test-refresh"
);

let chartCtrl =
null;
let busy =
false;

function isDesktop(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

function setStatus(
text,
isError =
false
){

if(
!statusEl
){
return;
}

statusEl.textContent =
text ||
"";
statusEl.classList.toggle(
"is-error",
!!isError
);

}

function setActiveTf(
tf
){

tfBar?.querySelectorAll(
"[data-tf]"
).forEach(
btn=>{
btn.classList.toggle(
"active",
btn.dataset.tf ===
tf
);
}
);

}

async function loadTf(
tf
){

if(
!chartCtrl ||
busy
){
return;
}

busy =
true;
setStatus(
"Загрузка…"
);

try{

const result =
await chartCtrl.loadTf(
tf
);

setActiveTf(
tf
);

if(
!result.ok
){
setStatus(
result.message ||
"Нет данных графика",
true
);
return;
}

setStatus(
`${result.candleCount} свечей · ${result.message}`
);

}catch(
err
){

setStatus(
err?.message ||
String(
err
),
true
);

}finally{
busy =
false;
}

}

async function refreshMarkers(){

if(
!chartCtrl ||
busy
){
return;
}

busy =
true;

try{

const info =
await chartCtrl.refreshMarkers();

setStatus(
`Обновлено · ${info.message}`
);

}catch(
err
){

setStatus(
err?.message ||
String(
err
),
true
);

}finally{
busy =
false;
}

}

async function boot(){

if(
!isDesktop()
){

gateEl?.classList.remove(
"hidden"
);
appEl?.classList.add(
"hidden"
);
return;
}

gateEl?.classList.add(
"hidden"
);
appEl?.classList.remove(
"hidden"
);

chartCtrl =
createSandboxChart(
chartEl,
{
onMarkersReady(
info
){

if(
!info
){
return;
}

setStatus(
`${info.candleCount || 0} свечей · ${info.message}`
);

}
}
);

const initial =
await chartCtrl.mount();

setActiveTf(
"240"
);

if(
initial.ok
){
setStatus(
`${initial.candleCount} свечей · график готов`
);
}else{
setStatus(
initial.message ||
"Ошибка загрузки",
true
);
}

showCheckbox?.addEventListener(
"change",
async ()=>{

if(
!chartCtrl ||
busy
){
return;
}

const enabled =
!!showCheckbox.checked;

busy =
true;

if(
enabled
){
setStatus(
"Загрузка маркеров…"
);
}else{
setStatus(
"Маркеры скрыты"
);
}

try{

const info =
await chartCtrl.setShowMarkers(
enabled
);

if(
info
){
setStatus(
enabled
? info.message
: "Маркеры скрыты"
);
}

}catch(
err
){

showCheckbox.checked =
!enabled;
setStatus(
err?.message ||
String(
err
),
true
);

}finally{
busy =
false;
}

}
);

refreshBtn?.addEventListener(
"click",
()=>{
void refreshMarkers();
}
);

tfBar?.addEventListener(
"click",
e=>{

const btn =
e.target.closest(
"[data-tf]"
);

if(
!btn
){
return;
}

void loadTf(
btn.dataset.tf
);

}
);

window.addEventListener(
"beforeunload",
()=>{
chartCtrl?.destroy();
}
);

}

void boot();
