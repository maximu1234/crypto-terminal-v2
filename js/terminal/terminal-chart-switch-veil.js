/**
 * Coins page — veil overlay while switching symbol (charts-stack-panes: candles + indicators).
 *
 * Крышка сплошная, пока свечи и индикаторы не встали в финальный масштаб.
 * Снимается одним кадром, без промежуточного «крупные свечи / длинный RSI».
 */
export function createCoinsChartSwitchVeil(
getChartWrapEl,
getSymbolLoadSeq
){

function stopChartSwitchVeil(){

const chartWrapEl =
getChartWrapEl();

if(
!chartWrapEl
){
return;
}

chartWrapEl.classList.remove(
"chart-switch-loading"
);
chartWrapEl.style.removeProperty(
"--chart-switch-veil-opacity"
);

}

function startChartSwitchVeil(){

const chartWrapEl =
getChartWrapEl();

if(
!chartWrapEl
){
return;
}

stopChartSwitchVeil();

chartWrapEl.classList.add(
"chart-switch-loading"
);
/*
 * Сразу сплошная крышка. Рампа с 0 оставляла первый кадр
 * ярким: свечи и RSI успевали нарисоваться в дефолтном
 * barSpacing и подпрыгнуть уже на глазах.
 */
chartWrapEl.style.setProperty(
"--chart-switch-veil-opacity",
"1"
);

}

function finishChartSwitchVeil(
loadSeq
){

if(
loadSeq !==
getSymbolLoadSeq()
){
return;
}

const chartWrapEl =
getChartWrapEl();

if(
chartWrapEl?.classList.contains(
"chart-switch-loading"
)
){
chartWrapEl.style.setProperty(
"--chart-switch-veil-opacity",
"1"
);
}

requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>{

if(
loadSeq !==
getSymbolLoadSeq()
){
return;
}

stopChartSwitchVeil();

}
);
}
);

}

return {
startChartSwitchVeil,
finishChartSwitchVeil,
stopChartSwitchVeil
};

}
