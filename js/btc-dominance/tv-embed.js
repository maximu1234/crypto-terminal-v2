/** TradingView Advanced Chart embed (CRYPTOCAP:BTC.D). */

const TV_SCRIPT_SRC =
"https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

const DEFAULT_OPTS = {
autosize: true,
symbol: "CRYPTOCAP:BTC.D",
interval: "D",
timezone: "Etc/UTC",
theme: "dark",
backgroundColor: "rgba(11, 18, 32, 1)",
gridColor: "rgba(30, 41, 59, 0.6)",
style: "1",
locale: "ru",
enable_publishing: false,
allow_symbol_change: false,
withdateranges: true,
hide_side_toolbar: false,
hide_top_toolbar: false,
save_image: false,
calendar: false,
studies: ["RSI@tv-basicstudies"],
support_host: "https://www.tradingview.com"
};

let activeHost = null;

export function mountTradingViewAdvancedChart(
hostEl,
options = {}
){

if(
!hostEl ||
typeof hostEl.appendChild !== "function"
){
return;
}

if(
activeHost === hostEl &&
hostEl.querySelector(".tradingview-widget-container")
){
return;
}

unmountTradingViewAdvancedChart();

activeHost = hostEl;
hostEl.innerHTML = "";

const wrap =
document.createElement("div");

wrap.className =
"coins-tv-widget tradingview-widget-container";

const widgetSlot =
document.createElement("div");

widgetSlot.className =
"tradingview-widget-container__widget";

wrap.appendChild(widgetSlot);

const script =
document.createElement("script");

script.type = "text/javascript";
script.src = TV_SCRIPT_SRC;
script.async = true;
script.text =
JSON.stringify({
...DEFAULT_OPTS,
...options
});

wrap.appendChild(script);
hostEl.appendChild(wrap);

}

export function unmountTradingViewAdvancedChart(){

if(activeHost){
activeHost.innerHTML = "";
}

activeHost = null;

}
