const defaults = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT"
];

let currentLayout =
  parseInt(localStorage.getItem("layout"))
  || 4;

function setLayout(count){

  currentLayout = count;

  localStorage.setItem(
    "layout",
    count
  );

  render();

}

function render(){

  const grid = document.getElementById("grid");

  grid.className =
    "grid grid-" + currentLayout;

  let html = "";

  for(let i=0;i<currentLayout;i++){

    html += `
      <div class="chart-card">

        <div
          id="chart_${i}"
          class="chart"
        ></div>

        <div
          id="overlay_${i}"
          class="overlay active"
        >
          <svg></svg>
        </div>

      </div>
    `;

  }

  grid.innerHTML = html;

  for(let i=0;i<currentLayout;i++){

    createChart(i);

    initOverlay(i);

    setTimeout(() => {
      restoreObjects(i);
    }, 1000);

  }

}

function createChart(index){

  const state =
    getChartState(index);

  const symbol =
    state.symbol
    || defaults[index];

  const interval =
    state.interval
    || "15";

  new TradingView.widget({

    autosize:true,

    symbol:
      "BYBIT:" + symbol + ".P",

    interval,

    timezone:"Etc/UTC",

    theme:"dark",

    style:"1",

    locale:"en",

    toolbar_bg:"#111827",

    allow_symbol_change:true,

    hide_side_toolbar:true,

    withdateranges:false,

    details:false,

    hotlist:false,

    calendar:false,

    studies:[
      "RSI@tv-basicstudies"
    ],

    disabled_features:[
      "volume_force_overlay",
      "header_compare",
      "header_symbol_search",
      "display_market_status",
      "show_interval_dialog_on_key_press"
    ],

    overrides:{

      "paneProperties.background":
        "#0b1220",

      "paneProperties.vertGridProperties.color":
        "#161b26",

      "paneProperties.horzGridProperties.color":
        "#161b26",

      "symbolWatermarkProperties.transparency":
        90,

      "scalesProperties.textColor":
        "#AAA",

      "mainSeriesProperties.priceAxisProperties.log":
        true,

      "mainSeriesProperties.candleStyle.upColor":
        "#22c55e",

      "mainSeriesProperties.candleStyle.downColor":
        "#ef4444"

    },

    studies_overrides:{

      "rsi.plot.color":
        "#a855f7"

    },

    container_id:
      "chart_" + index

  });

}

render();

setTool("select");
