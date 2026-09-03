import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isUnifiedAccount,
  accountMarginToTradeMargin,
  wantedAccountSetMarginMode,
  isSwitchIsolatedForbidden,
  formatSetMarginModeReasons
} = require("../desktop/trading/algo-bybit-uta-margin.cjs");

test("UTA status 3–6 is unified; classic 1 is not", () => {
  assert.equal(isUnifiedAccount(1), false);
  assert.equal(isUnifiedAccount(3), true);
  assert.equal(isUnifiedAccount(5), true);
  assert.equal(isUnifiedAccount(6), true);
  assert.equal(isUnifiedAccount(0), false);
  assert.equal(isUnifiedAccount("5"), true);
});

test("account ISOLATED_MARGIN maps to isolated; PM/cross stay cross", () => {
  assert.equal(accountMarginToTradeMargin("ISOLATED_MARGIN"), "isolated");
  assert.equal(accountMarginToTradeMargin("REGULAR_MARGIN"), "cross");
  assert.equal(accountMarginToTradeMargin("PORTFOLIO_MARGIN"), "cross");
  assert.equal(accountMarginToTradeMargin(""), "cross");
});

test("wanted isolated sets account ISOLATED_MARGIN, not per-symbol tradeMode", () => {
  assert.equal(wantedAccountSetMarginMode("isolated"), "ISOLATED_MARGIN");
  assert.equal(wantedAccountSetMarginMode("cross"), "REGULAR_MARGIN");
});

test("switch-isolated forbidden is retCode 100028 or unified account message", () => {
  assert.equal(
    isSwitchIsolatedForbidden({ retCode: 100028, message: "fail" }),
    true
  );
  assert.equal(
    isSwitchIsolatedForbidden({
      message: "не выставил isolated (unified account is forbidden)"
    }),
    true
  );
  assert.equal(
    isSwitchIsolatedForbidden({ retCode: 10001, message: "leverage invalid" }),
    false
  );
});

test("set-margin-mode reasons append from Bybit result.reasons", () => {
  assert.equal(
    formatSetMarginModeReasons({
      result: {
        reasons: [
          { reasonMsg: "No existing borrowings" },
          { reasonCode: "3400000", reasonMsg: "" }
        ]
      }
    }),
    "No existing borrowings; 3400000"
  );
  assert.equal(formatSetMarginModeReasons({ result: { reasons: [] } }), "");
});
