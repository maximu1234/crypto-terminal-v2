/**
 * /btc-d.html — статический TV embed в HTML (надёжнее на iPad Safari).
 * Скрипт только подстраховывает: iframe-fallback, если виджет не смонтировался.
 */
import {
isCoarseTouchViewport
} from "../chart/chart-options.js?v=4";

const TV_IFRAME_SRC =
"https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=ru&symbol=CRYPTOCAP%3ABTC.D&interval=D&timezone=Etc%2FUTC&theme=dark&style=1&withdateranges=1&hide_side_toolbar=0&hide_top_toolbar=0&allow_symbol_change=0&save_image=0&calendar=0&studies=%5B%22RSI%40tv-basicstudies%22%5D";

const WATCH_MS =
12000;

function hostHasChart(
host
){

if(
!host
){
return false;
}

return Boolean(
host.querySelector(
"iframe"
)
);

}

function mountIframeFallback(
host
){

if(
!host ||
host.querySelector(
".btc-d-tv-iframe"
)
){
return;
}

const iframe =
document.createElement(
"iframe"
);

iframe.className = "btc-d-tv-iframe";
iframe.title = "BTC.D — TradingView";
iframe.loading = "lazy";
iframe.referrerPolicy = "no-referrer-when-downgrade";
iframe.allow =
"fullscreen";
iframe.src = TV_IFRAME_SRC;

host.innerHTML = "";
host.appendChild(
iframe
);

}

function watchTradingViewMount(){

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
hostHasChart(
host
)
){
return;
}

const deadline =
Date.now() +
WATCH_MS;

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
if(
isCoarseTouchViewport()
){
mountIframeFallback(
host
);
}
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

watchTradingViewMount();
