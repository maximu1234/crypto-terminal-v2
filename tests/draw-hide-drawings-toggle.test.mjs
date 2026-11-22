import assert from "node:assert/strict";
import test from "node:test";

import {
  getDrawToolbarButtonsHtml
} from "../js/draw-ui-shared.js";
import {
  magnetSnapRequested
} from "../js/drawings/draw-magnet.js";

import {
  getWidgetToolbarHtml
} from "../js/watchlist-draw-ui.js";

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

test("watchlist widget menu puts the eye between volume profile and trash", () => {
  const html = getWidgetToolbarHtml();
  const fvp = html.indexOf('data-draw-tool="fvp"');
  const eye = html.indexOf("draw-tool-hide-drawings");
  const trash = html.indexOf("draw-tool-clear-all");

  assert.ok(fvp > 0);
  assert.ok(eye > fvp);
  assert.ok(trash > eye);
});

test("terminal magnet sits before the eye and does not replace Cmd", () => {
  const html = getDrawToolbarButtonsHtml({
    showDrawingsVisibilityToggle: true,
    showMagnetToggle: true
  });
  const fvp = html.indexOf('data-draw-tool="fvp"');
  const magnet = html.indexOf("draw-tool-magnet");
  const eye = html.indexOf("draw-tool-hide-drawings");

  assert.ok(magnet > fvp);
  assert.ok(eye > magnet);
  assert.equal(magnetSnapRequested({ metaKey: true }), true);
  assert.equal(magnetSnapRequested({ sticky: true }), true);
  assert.equal(magnetSnapRequested({}), false);
});

test("other toolbars do not get the eye button", () => {
  const html = getDrawToolbarButtonsHtml({
    compact: true
  });

  assert.equal(html.includes("draw-tool-hide-drawings"), false);
  assert.equal(html.includes("draw-tool-magnet"), false);
  assert.ok(html.includes("draw-tool-clear-all"));
});
