import { readEnv } from "../config.js";
import { verifySiteGateToken } from "./gate-token.js";
import {
  clearTradeKeys,
  keysStatus,
  loadTradeKeys,
  saveTradeKeys,
  tradeKeysReady,
  volumeLooksMounted
} from "./keys-store.js";
import * as bybit from "./bybit-ops.js";
import { restartTradePrivateStream } from "./stream.js";

function desktopOnly() {
  return {
    ok: false,
    message: "Только в приложении"
  };
}

export async function runTradeRpc(method, payload = {}) {
  const name = String(method || "");
  if (payload?.exchangeId && payload.exchangeId !== "bybit") {
    return { ok: false, message: "Web trading: только Bybit" };
  }

  switch (name) {
    case "getStatus":
      return keysStatus("bybit");
    case "getRateLimitBackoffMs":
      return 0;
    case "setActiveExchange":
      return "bybit";
    case "saveKeys": {
      const apiKey = String(payload.apiKey || "").trim();
      const apiSecret = String(payload.apiSecret || "").trim();
      if (!apiKey) {
        return { ok: false, message: "API key is required" };
      }
      if (!apiSecret) {
        return { ok: false, message: "API secret is required" };
      }
      saveTradeKeys("bybit", {
        apiKey,
        apiSecret,
        testnet: !!payload.testnet
      });
      const wallet = await bybit.getWalletBalance();
      if (!wallet.ok) {
        clearTradeKeys("bybit");
        return {
          ok: false,
          message: wallet.message || "Ключи не приняты Bybit"
        };
      }
      restartTradePrivateStream();
      return { ok: true, ...keysStatus("bybit") };
    }
    case "clearKeys":
      clearTradeKeys("bybit");
      restartTradePrivateStream();
      return { ok: true, ...keysStatus("bybit") };
    case "getWalletBalance":
      return bybit.getWalletBalance();
    case "getPositions":
      return bybit.getPositions();
    case "getOpenOrders":
      return bybit.getOpenOrders();
    case "getPosition":
      return bybit.getPosition(payload.symbol);
    case "closePosition":
      return bybit.closePosition(payload.symbol);
    case "cancelPositionStop":
      return bybit.cancelPositionStop(payload.symbol, payload.target);
    case "setPositionStop":
      return bybit.setPositionStop(
        payload.symbol,
        payload.target,
        payload.price
      );
    case "placeOrder":
      return bybit.placeOrder(payload);
    case "cancelOrder":
      return bybit.cancelOrder(payload.symbol, payload.orderId);
    case "amendOrder":
      return bybit.amendOrder(payload);
    case "openPosition":
      return bybit.openPosition(
        payload.symbol,
        payload.side,
        payload.volumeUsdt,
        payload
      );
    case "getSymbolPositionSettings":
      return bybit.getSymbolPositionSettings(payload.symbol);
    case "applySymbolPositionSettings":
      return bybit.applySymbolPositionSettings(payload.symbol, payload);
    case "pingBybit":
      return bybit.pingBybit();
    case "reconcileOrdersOnPositionOpen":
    case "reconcileOrdersOnPositionClose":
      return { ok: true };
    case "replayStream":
    case "requestStreamSeed":
      restartTradePrivateStream();
      return { ok: true };
    case "getStreamSnapshot": {
      const [pos, orders] = await Promise.all([
        bybit.getPositions(),
        bybit.getOpenOrders()
      ]);
      return {
        ok: true,
        positions: pos.positions || [],
        orders: orders.orders || []
      };
    }
    case "getClosedPnl":
    case "enrichClosedPnlTrades":
    case "getTradeDiaryDetail":
    case "generatePnlShareCard":
    case "savePnlShareCard":
    case "discardPnlShareCard":
      return desktopOnly();
    default:
      return { ok: false, message: `Unknown method ${name}` };
  }
}

export function tradeHealth() {
  return {
    keysConfigured: !!loadTradeKeys("bybit"),
    keysKey: tradeKeysReady(),
    volume: volumeLooksMounted()
  };
}

export function verifyTradeRequest(req) {
  const secret = readEnv("SITE_GATE_SECRET");
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ")
    ? auth.slice(7).trim()
    : "";
  return verifySiteGateToken(secret, token);
}
