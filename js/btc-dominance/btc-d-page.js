/**
 * /btc-d.html — на iPad Safari script-embed TV не создаёт iframe.
 * На touch / tablet сразу iframe; на десктопе — script, с подстраховкой через iframe.
 */
import {
isTabletChartViewport,
isCoarseTouchViewport
} from "../chart/chart-options.js?v=4";

import {
getTradingViewIframeSrc,
mountTradingViewIframe,
mountTradingViewAdvancedChart
} from "./tv-embed.js?v=2";

const SCRIPT_WATCH_MS =
4000;

function hostHasChart(
host
){

if(
!host
){
return false;
}

const iframe =
host.querySelector(
"iframe"
);

if(
!iframe
){
return false;
}

const rect =
iframe.getBoundingClientRect();

return rect.height >=
120 &&
rect.width >=
120;

}

function shouldPreferIframe(){

return (
isTabletChartViewport() ||
isCoarseTouchViewport()
);

}

function mountBtcDChart(){

const host =
document.getElementById(
"btc-d-tv-host"
);

if(
!host
){
return;
}

if(
shouldPreferIframe()
){
mountTradingViewIframe(
host
);
return;
}

if(
host.querySelector(
".btc-d-tv-iframe"
)
){
return;
}

if(
!host.querySelector(
".tradingview-widget-container"
)
){
mountTradingViewAdvancedChart(
host
);
return;
}

if(
hostHasChart(
host
)
){
return;
}

const deadline =
Date.now() +
SCRIPT_WATCH_MS;

const tick =
()=>{

if(
hostHasChart(
host
)
){
return;
}

if(
Date.now() >=
deadline
){
mountTradingViewIframe(
host
);
return;
}

requestAnimationFrame(
tick
);

};

requestAnimationFrame(
tick
);

}

mountBtcDChart();

export {
getTradingViewIframeSrc
};
