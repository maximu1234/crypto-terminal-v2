/**
 * Coins page — veil overlay while switching symbol (chart-wrap loading state).
 */
const CHART_SWITCH_VEIL_MAX_MS =
1000;

export function createCoinsChartSwitchVeil(
getChartWrapEl,
getSymbolLoadSeq
){

let chartSwitchVeilRaf =
0;
let chartSwitchStartedAt =
0;

function chartSwitchVeilOpacity(
elapsedMs
){

return Math.min(
elapsedMs /
CHART_SWITCH_VEIL_MAX_MS,
1
);

}

function tickChartSwitchVeil(){

const chartWrapEl =
getChartWrapEl();

if(
!chartWrapEl?.classList.contains(
"chart-switch-loading"
)
){
return;
}

const elapsed =
Date.now() -
chartSwitchStartedAt;

chartWrapEl.style.setProperty(
"--chart-switch-veil-opacity",
String(
chartSwitchVeilOpacity(
elapsed
)
)
);

if(
elapsed <
CHART_SWITCH_VEIL_MAX_MS
){
chartSwitchVeilRaf =
requestAnimationFrame(
tickChartSwitchVeil
);
}

}

function stopChartSwitchVeil(){

if(
chartSwitchVeilRaf
){
cancelAnimationFrame(
chartSwitchVeilRaf
);
chartSwitchVeilRaf =
0;
}

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

chartSwitchStartedAt =
Date.now();
chartWrapEl.classList.add(
"chart-switch-loading"
);
chartWrapEl.style.setProperty(
"--chart-switch-veil-opacity",
"0"
);
chartSwitchVeilRaf =
requestAnimationFrame(
tickChartSwitchVeil
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

if(
chartSwitchVeilRaf
){
cancelAnimationFrame(
chartSwitchVeilRaf
);
chartSwitchVeilRaf =
0;
}

const chartWrapEl =
getChartWrapEl();
const elapsed =
Date.now() -
chartSwitchStartedAt;

if(
chartWrapEl?.classList.contains(
"chart-switch-loading"
)
){
chartWrapEl.style.setProperty(
"--chart-switch-veil-opacity",
String(
chartSwitchVeilOpacity(
elapsed
)
)
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
