import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCoinsChartUrl,
  exchangeLabelForTelegram,
  formatAlertMessage
} from "../alert-worker/lib/telegram.js";

test("exchangeLabelForTelegram maps known ids", () => {
  assert.equal(
    exchangeLabelForTelegram("bybit"),
    "Bybit"
  );
  assert.equal(
    exchangeLabelForTelegram("bingx"),
    "BingX"
  );
  assert.equal(
    exchangeLabelForTelegram(""),
    "Bybit"
  );
});

test("formatAlertMessage appends exchange after price", () => {
  const msg =
    formatAlertMessage({
      symbol:
      "GRASSUSDT.P",
      price:
      0.3952,
      tf:
      "15",
      exchange_id:
      "bybit"
    });

  assert.match(
    msg.text,
    /0\.3952 \(Bybit\)/
  );
  assert.match(
    msg.text,
    /Цена пересекла уровень/
  );
  assert.equal(
    msg.parse_mode,
    "HTML"
  );
});

test("formatAlertMessage chart link includes exchange", () => {
  const msg =
    formatAlertMessage({
      symbol:
      "BTCUSDT.P",
      price:
      1,
      tf:
      "60",
      exchange_id:
      "bingx"
    });

  assert.match(
    msg.text,
    /exchange=bingx/
  );
  assert.match(
    msg.text,
    /1\.0000 \(BingX\)/
  );
});

test("buildCoinsChartUrl sets exchange query", () => {
  const url =
    buildCoinsChartUrl(
      "ETHUSDT.P",
      "240",
      "bingx"
    );

  assert.match(
    url,
    /\/open\.html\?/
  );
  assert.match(
    url,
    /symbol=ETHUSDT/
  );
  assert.match(
    url,
    /exchange=bingx/
  );
});
