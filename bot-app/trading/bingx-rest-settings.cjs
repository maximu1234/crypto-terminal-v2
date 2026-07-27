/**
 * BingX symbol leverage / margin settings (REST).
 */

"use strict";

let stripSymbolSuffix = null;
let signedRequest = null;
let toBingxSymbol = null;
let isHedgeMode = null;
let getAssetMode = null;
let ensureAccountDefaults = null;
let PRIORITY = null;

function bindBingxSettingsDeps(deps) {
  stripSymbolSuffix = deps.stripSymbolSuffix;
  signedRequest = deps.signedRequest;
  toBingxSymbol = deps.toBingxSymbol;
  isHedgeMode = deps.isHedgeMode;
  getAssetMode = deps.getAssetMode;
  ensureAccountDefaults = deps.ensureAccountDefaults;
  PRIORITY = deps.PRIORITY;
}

async function getSymbolPositionSettings(symbol) {
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }
  const hedge = await isHedgeMode();
  const assetMode = await getAssetMode();
  const levResult = await signedRequest(
    "GET",
    "/openApi/swap/v2/trade/leverage",
    { symbol: toBingxSymbol(sym) },
    { priority: PRIORITY.normal }
  );
  const marginResult = await signedRequest(
    "GET",
    "/openApi/swap/v2/trade/marginType",
    { symbol: toBingxSymbol(sym) },
    { priority: PRIORITY.normal }
  );
  const levData = levResult.data?.data ?? levResult.data ?? {};
  const marginData = marginResult.data?.data ?? marginResult.data ?? {};
  return {
    ok: true,
    symbol: sym,
    leverage: Number(levData.longLeverage ?? levData.leverage ?? 0) || null,
    marginMode:
      String(marginData.marginType || "").toUpperCase() === "ISOLATED"
        ? "isolated"
        : "cross",
    hedgeMode: hedge,
    assetMode
  };
}

async function applySymbolPositionSettings(symbol, settings = {}) {
  await ensureAccountDefaults();
  const sym = stripSymbolSuffix(symbol);
  if (!sym) {
    return { ok: false, message: "Symbol required" };
  }

  const notes = [];
  const bingxSym = toBingxSymbol(sym);

  const marginMode = String(settings.marginMode || "cross").toLowerCase();
  const marginType = marginMode === "isolated" ? "ISOLATED" : "CROSSED";
  const marginResult = await signedRequest(
    "POST",
    "/openApi/swap/v2/trade/marginType",
    {
      symbol: bingxSym,
      marginType
    }
  );
  if (marginResult.ok) {
    notes.push(`margin:${marginType}`);
  }

  const leverage = Number(settings.leverage);
  if (Number.isFinite(leverage) && leverage > 0) {
    const hedge = await isHedgeMode();
    if (hedge) {
      for (const side of ["LONG", "SHORT"]) {
        const levResult = await signedRequest(
          "POST",
          "/openApi/swap/v2/trade/leverage",
          {
            symbol: bingxSym,
            side,
            leverage: String(Math.round(leverage))
          }
        );
        if (levResult.ok) {
          notes.push(`leverage:${side}:${Math.round(leverage)}`);
        }
      }
    } else {
      const levResult = await signedRequest(
        "POST",
        "/openApi/swap/v2/trade/leverage",
        {
          symbol: bingxSym,
          side: "BOTH",
          leverage: String(Math.round(leverage))
        }
      );
      if (levResult.ok) {
        notes.push(`leverage:${Math.round(leverage)}`);
      }
    }
  }

  return { ok: true, notes };
}

module.exports = {
  bindBingxSettingsDeps,
  getSymbolPositionSettings,
  applySymbolPositionSettings
};
