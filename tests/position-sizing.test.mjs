import test from "node:test";
import assert from "node:assert/strict";

import {
  calcPositionVolumeUsd,
  formatVolumeUsd
} from "../js/position-sizing.js";

test("position volume keeps cents instead of rounding to a whole dollar", () => {
  const volume = calcPositionVolumeUsd(1, 15.17);
  assert.equal(volume, 6.59);
  assert.equal(formatVolumeUsd(volume), "6,59");
  assert.equal(formatVolumeUsd(5.1), "5,10");
  assert.equal(formatVolumeUsd(5.2), "5,20");
});
