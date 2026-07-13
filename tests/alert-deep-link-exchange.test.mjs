import test from "node:test";
import assert from "node:assert/strict";
import {
  ALERT_DEEP_LINK_EXCHANGE_PARAM,
  buildAlertChartUrl,
  parseAlertDeepLinkExchange
} from "../js/alert-deep-link-url.js";

test("buildAlertChartUrl includes exchange param", () => {
  const url =
    buildAlertChartUrl({
      symbol:
      "BTCUSDT.P",
      tf:
      "240",
      exchangeId:
      "bingx"
    });

  assert.match(
    url,
    /^\/terminal\.html\?/
  );
  assert.match(
    url,
    /symbol=BTCUSDT/
  );
  assert.match(
    url,
    /tf=240/
  );
  assert.match(
    url,
    new RegExp(
      `${ALERT_DEEP_LINK_EXCHANGE_PARAM}=bingx`
    )
  );
});

test("parseAlertDeepLinkExchange reads known exchange", () => {
  const params =
    new URLSearchParams(
      "symbol=ETHUSDT&tf=60&exchange=bybit"
    );

  assert.equal(
    parseAlertDeepLinkExchange(
      params
    ),
    "bybit"
  );
});

test("parseAlertDeepLinkExchange ignores unknown exchange", () => {
  const params =
    new URLSearchParams(
      "exchange=binance"
    );

  assert.equal(
    parseAlertDeepLinkExchange(
      params
    ),
    ""
  );
});
