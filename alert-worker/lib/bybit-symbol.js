/** Bybit linear kline/ticker topics use BTCUSDT, not BTCUSDT.P */
export function normalizeBybitSymbol(symbol) {

  return String(
    symbol || ""
  ).trim().toUpperCase().replace(
    /\.P$/i,
    ""
  );

}
