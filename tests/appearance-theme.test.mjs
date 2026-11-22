import assert from "node:assert/strict";
import test from "node:test";

import {
APPEARANCE_FIELDS,
appearanceTheme,
normalizeAppearanceHex,
setAppearanceColor,
resetAppearanceTheme
} from "../js/appearance-theme.js";

test("appearance defaults stay the current interface colors", () => {
  const theme = appearanceTheme({});

  assert.equal(theme.appBg, "#16181f");
  assert.equal(theme.chartBg, "#141721");
  assert.equal(theme.widgetBg, "#16181f");
  assert.equal(theme.screenerWidgetBg, "#141721");
  assert.equal(theme.widgetHeaderBg, "#13181e");
  assert.equal(theme.terminalPanelBg, "#0f0f0f");
  assert.equal(theme.terminalSeparator, "#2e2e30");
  assert.equal(theme.widgetBorder, "#1f2937");
  assert.equal(theme.inputBg, "#171b21");
  assert.equal(theme.text, "#e5e7eb");
  assert.equal(theme.muted, "#9ca3af");
  assert.equal(theme.scaleText, "#d1d5db");
  assert.equal(theme.candleUp, "#459782");
  assert.equal(theme.candleDown, "#ef4444");
  assert.equal(theme.priceHudUp, "#16a34a");
  assert.equal(theme.priceHudDown, "#dc2626");
  assert.equal(theme.priceHudText, "#d1d5db");
  assert.equal(theme.coinChangeUp, "#459782");
  assert.equal(theme.coinChangeDown, "#ef4444");
  assert.equal(theme.changeUp, "#22c55e");
  assert.equal(theme.changeDown, "#ef4444");
  assert.equal(theme.toolActive, "#363a45");
  assert.equal(theme.lineColor, "#5b9cf6");
  assert.equal(APPEARANCE_FIELDS.length, 23);
});

test("appearance hex keeps only #rrggbb", () => {
  assert.equal(normalizeAppearanceHex("#AbC"), "");
  assert.equal(normalizeAppearanceHex("red"), "");
  assert.equal(normalizeAppearanceHex("#459782"), "#459782");
});

test("appearance override and reset use localStorage", () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: key => {
      store.delete(key);
    }
  };
  globalThis.document = {
    documentElement: {
      style: {
        setProperty(){}
      }
    }
  };

  const theme = setAppearanceColor("chartBg", "#112233");
  assert.equal(theme.chartBg, "#112233");
  assert.equal(appearanceTheme().chartBg, "#112233");

  const restored = resetAppearanceTheme();
  assert.equal(restored.chartBg, "#141721");
  assert.equal(store.size, 0);

  delete globalThis.localStorage;
  delete globalThis.document;
});
