import assert from "node:assert/strict";
import test from "node:test";

import {
  getDrawToolbarButtonsHtml
} from "../js/draw-ui-shared.js";

test("terminal toolbar puts the eye between volume profile and trash", () => {
  const html = getDrawToolbarButtonsHtml({
    showDrawingsVisibilityToggle: true
  });
  const fvp = html.indexOf('data-draw-tool="fvp"');
  const eye = html.indexOf("draw-tool-hide-drawings");
  const trash = html.indexOf("draw-tool-clear-all");

  assert.ok(fvp > 0);
  assert.ok(eye > fvp);
  assert.ok(trash > eye);
  assert.match(html, /Скрыть рисунки/);
});

test("other toolbars do not get the eye button", () => {
  const html = getDrawToolbarButtonsHtml({
    compact: true
  });

  assert.equal(html.includes("draw-tool-hide-drawings"), false);
  assert.ok(html.includes("draw-tool-clear-all"));
});
