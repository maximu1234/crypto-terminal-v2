import {
mountTradingViewAdvancedChart
} from "./tv-embed.js?v=1";

const host =
document.getElementById(
"btc-d-tv-host"
);

if(
host
){
mountTradingViewAdvancedChart(
host
);
}
