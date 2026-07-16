/**
 * Per-exchange trade UI policy — keep exchange quirks out of shared trade-*.js.
 * Add a new exchange = new policy file + register in index.
 */
import {
  getActiveExchangeId
} from "../../market-api.js?v=2";

import bybitPolicy from "./bybit-trade-policy.js?v=1";
import bingxPolicy from "./bingx-trade-policy.js?v=10";

const POLICIES = {
  bybit: bybitPolicy,
  bingx: bingxPolicy
};

export function getTradeExchangePolicy(exchangeId) {
  const id = exchangeId || getActiveExchangeId();
  return POLICIES[id] || bybitPolicy;
}

export function isTradeExchange(id) {
  return getTradeExchangePolicy().id === id;
}
