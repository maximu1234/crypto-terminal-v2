import { createBybitKlineHub } from "./bybit-kline.js";
import { createBybitTickerHub } from "./bybit.js";
import { createBingxKlineHub } from "./bingx-kline.js";
import { createBingxTickerHub } from "./bingx-ticker.js";
import { normalizeExchangeId } from "./exchange-symbol.js";

export function createMarketHubs() {

const bybitKline =
createBybitKlineHub();
const bingxKline =
createBingxKlineHub();
const bybitTicker =
createBybitTickerHub();
const bingxTicker =
createBingxTickerHub();

function pickKline(
exchangeId
){

return normalizeExchangeId(
exchangeId
) ===
"bingx"
? bingxKline
: bybitKline;

}

function pickTicker(
exchangeId
){

return normalizeExchangeId(
exchangeId
) ===
"bingx"
? bingxTicker
: bybitTicker;

}

return {

ensureKline(
symbol,
tf,
exchangeId = "bybit"
) {
pickKline(
exchangeId
).ensureKline(
symbol,
tf
);
},

ensureSymbol(
symbol,
exchangeId = "bybit"
) {
pickTicker(
exchangeId
).ensureSymbol(
symbol
);
},

onKline(
fn
) {

bybitKline.onKline(
(
symbol,
tf,
candle
) => {
fn(
"bybit",
symbol,
tf,
candle
);
}
);

bingxKline.onKline(
(
symbol,
tf,
candle
) => {
fn(
"bingx",
symbol,
tf,
candle
);
}
);

},

onTick(
fn
) {

bybitTicker.onTick(
(
symbol,
price,
prev
) => {
fn(
"bybit",
symbol,
price,
prev
);
}
);

bingxTicker.onTick(
(
symbol,
price,
prev
) => {
fn(
"bingx",
symbol,
price,
prev
);
}
);

},

getStats() {
return {
bybitTicker:
bybitTicker.getStats?.() ||
null,
bingxTicker:
bingxTicker.getStats?.() ||
null
};
},

close() {
bybitKline.close?.();
bingxKline.close?.();
bybitTicker.close?.();
bingxTicker.close?.();
}

};

}
