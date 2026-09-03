/**
 * Bybit UTA margin helpers for Algo Bot.
 * Unified accounts cannot use /v5/position/switch-isolated (retCode 100028).
 * Isolated vs cross is account-wide: POST /v5/account/set-margin-mode.
 */

function isUnifiedAccount(status) {
  const n = Number(status);
  return Number.isFinite(n) && n >= 3;
}

function accountMarginToTradeMargin(marginMode) {
  return String(marginMode || "").toUpperCase() === "ISOLATED_MARGIN"
    ? "isolated"
    : "cross";
}

function wantedAccountSetMarginMode(tradeMargin) {
  return String(tradeMargin || "").toLowerCase() === "isolated"
    ? "ISOLATED_MARGIN"
    : "REGULAR_MARGIN";
}

function isSwitchIsolatedForbidden(result) {
  if (Number(result?.retCode) === 100028) {
    return true;
  }
  const msg = String(result?.message || result?.retMsg || "").toLowerCase();
  return msg.includes("unified account is forbidden");
}

function formatSetMarginModeReasons(data) {
  const reasons = data?.result?.reasons;
  if (!Array.isArray(reasons) || !reasons.length) {
    return "";
  }
  return reasons
    .map((row) => String(row?.reasonMsg || row?.reasonCode || "").trim())
    .filter(Boolean)
    .join("; ");
}

module.exports = {
  isUnifiedAccount,
  accountMarginToTradeMargin,
  wantedAccountSetMarginMode,
  isSwitchIsolatedForbidden,
  formatSetMarginModeReasons
};
