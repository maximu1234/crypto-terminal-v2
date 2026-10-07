import assert from "node:assert/strict";
import test from "node:test";

import {
  bybitSymbolFromBingxDisplay,
  formatBingxDisplayLabel,
  formatInstrumentFullName,
  formatMoexDisplayName
} from "../js/symbol-display-name.js";

test("crypto and stock full names stay readable", () => {
  assert.equal(
    formatInstrumentFullName("Bitcoin", "BTC", "BTCUSDT"),
    "Bitcoin"
  );
  assert.equal(
    formatInstrumentFullName("Cardano", "ADA", "ADAUSDT"),
    "Cardano"
  );
  assert.equal(
    formatInstrumentFullName("Apple", "AAPL", "AAPLUSDT.P"),
    "Apple"
  );
  assert.equal(
    formatInstrumentFullName("Alchemist AI", "ALCH", "ALCHUSDT"),
    "Alchemist AI"
  );
  assert.equal(
    formatInstrumentFullName("Tesla Inc", "TSLA", "TSLAUSDT"),
    "Tesla Inc"
  );
});

test("bybit slugs become a project name", () => {
  assert.equal(
    formatInstrumentFullName("across-protocol", "ACX", "ACXUSDT"),
    "Across Protocol"
  );
  assert.equal(
    formatInstrumentFullName("act-i-the-ai-prophecy", "ACT", "ACTUSDT"),
    "Act I The AI Prophecy"
  );
});

test("ticker-only names and empty names are hidden", () => {
  assert.equal(
    formatInstrumentFullName("Aave", "AAVE", "AAVEUSDT"),
    ""
  );
  assert.equal(
    formatInstrumentFullName("EURUSD", "EURUSD", "EURUSDUSDT"),
    ""
  );
  assert.equal(
    formatInstrumentFullName("", "UNKNOWN", "UNKNOWNUSDT"),
    ""
  );
});

test("moex names prefer the short company name", () => {
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "Сбербанк",
      LATNAME: "Sberbank",
      NAME: "Сбербанк России ПАО ао"
    }, "SBER"),
    "Сбербанк"
  );
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "ГАЗПРОМ ао",
      LATNAME: "Gazprom"
    }, "GAZP"),
    "Газпром ао"
  );
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "ЯНДЕКС",
      LATNAME: "YANDEX"
    }, "YDEX"),
    "Яндекс"
  );
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "Индекс МосБиржи",
      NAME: "Индекс МосБиржи"
    }, "IMOEX"),
    "Индекс МосБиржи"
  );
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "VEON",
      LATNAME: "VEON Ltd. ORD SHS"
    }, "VEON-RX"),
    "VEON Ltd. ORD SHS"
  );
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "USDRUB_TOM",
      LATNAME: "USDRUB_TOM - USD/RUB"
    }, "USD000UTSTOM"),
    "USDRUB_TOM - USD/RUB"
  );
  assert.equal(
    formatMoexDisplayName({
      SHORTNAME: "SBER"
    }, "SBER"),
    ""
  );
});

test("bingx display label is hidden when it is only a ticker", () => {
  assert.equal(
    formatBingxDisplayLabel("BTC-USDT", "BTCUSDT"),
    ""
  );
  assert.equal(
    formatBingxDisplayLabel("AAPL-USDT", "NCSKAAPL2USDUSDT"),
    ""
  );
  assert.equal(
    formatBingxDisplayLabel("Natural Gas(NG)-USDT", "NCCO7241NATGAS2USDUSDT"),
    "Natural Gas"
  );
  assert.equal(
    formatBingxDisplayLabel("哈基米-USDT", "HAJIMIUSDT"),
    "哈基米"
  );
  assert.equal(
    formatBingxDisplayLabel("US Dollar Index (DXY)-USDT", "NCSIDXY2USDUSDT"),
    "US Dollar Index"
  );
  assert.equal(
    bybitSymbolFromBingxDisplay("AAPL-USDT", "NCSKAAPL2USDUSDT"),
    "AAPLUSDT"
  );
  assert.equal(
    bybitSymbolFromBingxDisplay("GOLD(XAU)-USDT", "NCCOGOLD2USDUSDT"),
    "XAUUSDT"
  );
  assert.equal(
    bybitSymbolFromBingxDisplay("BTC-USDT", "BTCUSDT"),
    ""
  );
});

test("multiplier contracts and gold use a known name", () => {
  assert.equal(
    formatInstrumentFullName("", "1000PEPE", "1000PEPEUSDT"),
    "Pepe"
  );
  assert.equal(
    formatInstrumentFullName("XAU", "XAU", "XAUUSDT"),
    "Gold"
  );
  assert.equal(
    formatInstrumentFullName("Silver", "XAG", "XAGUSDT"),
    "Silver"
  );
});
