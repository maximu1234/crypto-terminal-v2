const STORAGE_SL = "trade_calc_stop_loss_pct";
const STORAGE_RISK = "trade_calc_risk_usd";

const elStop = document.getElementById("stop-loss-pct");
const elRisk = document.getElementById("risk-usd");
const elResult = document.getElementById("calc-result");

function loadValues(){

const sl =
localStorage.getItem(STORAGE_SL);
const risk =
localStorage.getItem(STORAGE_RISK);

if(sl){
elStop.value = sl;
}

if(risk){
elRisk.value = risk;
}

}

function saveValues(sl, risk){

localStorage.setItem(
STORAGE_SL,
String(sl)
);

localStorage.setItem(
STORAGE_RISK,
String(risk)
);

}

function formatInt(n){

return Math.round(n)
.toLocaleString("ru-RU");

}

function calculateVolume(){

const stopLossPercent =
parseFloat(
String(
elStop.value
).replace(",",".")
);

const riskAmount =
parseFloat(
String(
elRisk.value
).replace(",",".")
);

if(
Number.isNaN(stopLossPercent) ||
stopLossPercent <=
0 ||
Number.isNaN(riskAmount) ||
riskAmount <=
0
){

elResult.classList.add(
"calc-result--error"
);

elResult.innerHTML = `
<strong>Результат</strong>
<span class="calc-result-value">
Введите положительные числа: стоп в % и сумму риска в $.
</span>
`;

return;
}

elResult.classList.remove(
"calc-result--error"
);

saveValues(
stopLossPercent,
riskAmount
);

const volume =
Math.round(
(riskAmount * 100) /
stopLossPercent
);

elResult.innerHTML = `
<strong>Сумма входа (объём позиции)</strong>
<span class="calc-result-value">${formatInt(volume)} $</span>
`;

}

function init(){

loadValues();

[
elStop,
elRisk
].forEach(input=>{

input.addEventListener(
"input",
()=> calculateVolume()
);

input.addEventListener(
"keypress",
e=>{

if(
e.key ===
"Enter"
){
e.preventDefault();
calculateVolume();
}

}

);

});

calculateVolume();

elStop.focus();

}

init();
