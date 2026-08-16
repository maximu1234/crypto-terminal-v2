import test from "node:test";
import assert from "node:assert/strict";

import {
isTextTool,
clampTextFontSize,
normalizeTextShape,
createTextToolDefaults,
migrateTextToolDefaults,
measureTextBox,
measureTextEditorCssSize,
hitTestTextBody,
TEXT_DEFAULT_SIZE,
TEXT_DEFAULT_CONTENT,
TEXT_DEFAULT_COLOR,
TEXT_FONT_FAMILY
} from "../js/drawings/text.js";

test("text tool defaults: Arial 20 white", () => {
  const d = createTextToolDefaults();
  assert.equal(d.fontSize, 20);
  assert.equal(d.color, TEXT_DEFAULT_COLOR);
  assert.equal(TEXT_DEFAULT_SIZE, 20);
  assert.equal(TEXT_FONT_FAMILY, "Arial");
  assert.equal(TEXT_DEFAULT_CONTENT, "Текст");
});

test("clampTextFontSize stays in 8..96", () => {
  assert.equal(clampTextFontSize(1), 8);
  assert.equal(clampTextFontSize(200), 96);
  assert.equal(clampTextFontSize("20"), 20);
  assert.equal(clampTextFontSize(null), 20);
});

test("normalizeTextShape fills time/price/text/font", () => {
  const shape = normalizeTextShape({
    type: "text",
    time: 10,
    price: 100
  });
  assert.equal(shape.text, "Текст");
  assert.equal(shape.fontSize, 20);
  assert.equal(shape.fontFamily, "Arial");
  assert.equal(shape.p1.time, 10);
  assert.equal(shape.color, TEXT_DEFAULT_COLOR);
});

test("migrateTextToolDefaults restores missing fields", () => {
  const migrated = migrateTextToolDefaults({ color: "#ff0000" });
  assert.equal(migrated.fontSize, 20);
  assert.equal(migrated.color, "#ff0000");
});

test("isTextTool", () => {
  assert.equal(isTextTool("text"), true);
  assert.equal(isTextTool("hline"), false);
});

test("hitTestTextBody uses measured box around anchor", () => {
  const shape = normalizeTextShape({
    type: "text",
    time: 1,
    price: 2,
    text: "Hi",
    fontSize: 20
  });
  const toXY = (pt) =>
    pt && pt.time === 1 && pt.price === 2 ? { x: 100, y: 80 } : null;
  const box = measureTextBox(null, shape, { x: 100, y: 80 });
  assert.ok(box.w > 0 && box.h > 0);
  assert.equal(hitTestTextBody(100 + 2, 80, shape, toXY), true);
  assert.equal(hitTestTextBody(400, 400, shape, toXY), false);
});

test("toolbar icon data includes text", async () => {
  const { DRAW_TOOL_ICON_DATA } = await import("../js/draw-toolbar-icon-data.js");
  assert.ok(String(DRAW_TOOL_ICON_DATA.text || "").startsWith("data:image/png;base64,"));
});

test("editor css size grows with longer text and extra lines", () => {
  const shape = normalizeTextShape({
    type: "text",
    time: 1,
    price: 2,
    fontSize: 20
  });
  const short = measureTextEditorCssSize(shape, "A");
  const long = measureTextEditorCssSize(shape, "Надпись длинная для проверки");
  const twoLine = measureTextEditorCssSize(shape, "A\nB");
  assert.ok(long.width > short.width);
  assert.ok(twoLine.height > short.height);
  assert.ok(short.width >= 48);
  assert.ok(short.height >= 24);
});

test("templates treat text as eligible and keep fontSize", async () => {
  const {
    isTemplateEligibleType,
    extractStyleSnapshot,
    buildFactoryDefaultSnapshot
  } = await import("../js/drawings/draw-templates.js");
  assert.equal(isTemplateEligibleType("text"), true);
  const snap = extractStyleSnapshot(
    { type: "text", color: "#abcabc", fontSize: 24, text: "X" },
    "text"
  );
  assert.equal(snap.color, "#abcabc");
  assert.equal(snap.fontSize, 24);
  assert.equal(snap.lineWidth, undefined);
  const factory = buildFactoryDefaultSnapshot("text");
  assert.equal(factory.fontSize, 20);
});
