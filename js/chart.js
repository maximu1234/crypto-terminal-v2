export function createCandlestickChart(container){

const chart =
LightweightCharts.createChart(
container,
{

layout:{
background:{ color:"#0b1220" },
textColor:"#d1d5db"
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{

borderColor:"#1f2937",

mode:1,

autoScale:true,

entireTextOnly:false,

minimumWidth:90,

scaleMargins:{
top:0.12,
bottom:0.12
}

},

timeScale:{
borderColor:"#1f2937",
timeVisible:true,
rightOffset:20
},

crosshair:{
mode:0
}

});

const series =
chart.addCandlestickSeries({

upColor:"#22c55e",
downColor:"#ef4444",
borderVisible:false,
wickUpColor:"#22c55e",
wickDownColor:"#ef4444",

priceLineVisible:true,

lastValueVisible:true

});

return {

chart,
series

};

}

export function createRSIChart(container){

const chart =
LightweightCharts.createChart(
container,
{

layout:{
background:{ color:"transparent" },
textColor:"#797b85"
},

grid:{
vertLines:{ color:"#161b26" },
horzLines:{ color:"#161b26" }
},

rightPriceScale:{

borderColor:"#1f2937",

minimumWidth:60,

scaleMargins:{
top:0.2,
bottom:0.2
}

},

timeScale:{
visible:false
},

crosshair:{
mode:0
}

});

const series =
chart.addLineSeries({

color:"#a39cb9",
lineWidth:2

});

[30,50,70].forEach(level=>{

series.createPriceLine({

price:level,
color:"#797b85",
lineStyle:
LightweightCharts.LineStyle.Dashed,
lineWidth:1,
axisLabelVisible:true

});

});

return {

chart,
series

};

}
