/**
 * Facade → активный stream-bridge Bybit или BingX.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=13";

function mod() {
  return getLoadedTradeExchangeModules();
}

export function stopTradeStreamBridge(...args) {
  return mod()?.stopTradeStreamBridge?.(...args);
}

export async function startTradeStreamBridge(...args) {
  const fn = mod()?.startTradeStreamBridge;
  if (typeof fn !== "function") {
    return;
  }
  return fn(...args);
}

export async function initTradeStreamBridge(...args) {
  const fn = mod()?.initTradeStreamBridge;
  if (typeof fn !== "function") {
    return () => {};
  }
  return fn(...args);
}
