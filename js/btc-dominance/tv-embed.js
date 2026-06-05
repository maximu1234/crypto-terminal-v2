/** TradingView Advanced Chart — CRYPTOCAP:BTC.D */

const TV_SCRIPT_SRC =
"https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";

const TV_IFRAME_BASE =
"https://www.tradingview-widget.com/embed-widget/advanced-chart/";

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

export function getTradingViewIframeSrc(
options = {}
){

const opts = {
...DEFAULT_OPTS,
...options
};

const params =
new URLSearchParams({
locale: opts.locale,
symbol: opts.symbol,
interval: opts.interval,
timezone: opts.timezone,
theme: opts.theme,
style: String(
opts.style
),
withdateranges: opts.withdateranges
? "1"
: "0",
hide_side_toolbar: opts.hide_side_toolbar
? "0"
: "1",
hide_top_toolbar: opts.hide_top_toolbar
? "0"
: "1",
allow_symbol_change: opts.allow_symbol_change
? "1"
: "0",
save_image: opts.save_image
? "1"
: "0",
calendar: opts.calendar
? "1"
: "0",
autosize: "1"
});

const hashConfig = {
autosize: opts.autosize,
backgroundColor: opts.backgroundColor,
gridColor: opts.gridColor,
enable_publishing: opts.enable_publishing,
support_host: opts.support_host,
studies: opts.studies
};

const hash =
encodeURIComponent(
JSON.stringify(
hashConfig
)
);

return `${TV_IFRAME_BASE}?${params.toString()}#${hash}`;

}

export function mountTradingViewIframe(
hostEl,
options = {}
){

if(
!hostEl ||
typeof hostEl.appendChild !== "function"
){
return;
}

unmountTradingViewAdvancedChart();

activeHost = hostEl;
hostEl.innerHTML = "";

const iframe =
document.createElement(
"iframe"
);

iframe.className = "btc-d-tv-iframe";
iframe.title = "BTC.D — TradingView";
iframe.loading = "eager";
iframe.referrerPolicy = "no-referrer-when-downgrade";
iframe.allow = "fullscreen";
iframe.src =
getTradingViewIframeSrc(
options
);

hostEl.appendChild(
iframe
);

}

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
hostEl.querySelector(
".tradingview-widget-container, .btc-d-tv-iframe"
)
){
return;
}

unmountTradingViewAdvancedChart();

activeHost = hostEl;
hostEl.innerHTML = "";

const wrap =
document.createElement(
"div"
);

wrap.className =
"coins-tv-widget tradingview-widget-container";

const widgetSlot =
document.createElement(
"div"
);

widgetSlot.className =
"tradingview-widget-container__widget";

wrap.appendChild(
widgetSlot
);

const script =
document.createElement(
"script"
);

script.type = "text/javascript";
script.src = TV_SCRIPT_SRC;
script.async = true;
script.innerHTML =
JSON.stringify({
...DEFAULT_OPTS,
...options
});

wrap.appendChild(
script
);
hostEl.appendChild(
wrap
);

}

export function unmountTradingViewAdvancedChart(){

if(
activeHost
){
activeHost.innerHTML = "";
}

activeHost = null;

}
