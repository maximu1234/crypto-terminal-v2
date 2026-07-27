/**
 * Загрузка активного торгового модуля (Bybit или BingX). Без общей бизнес-логики.
 */
import {
  getActiveExchangeId
} from "../market-api.js?v=2";

let activeId = null;
let modules = null;
let loadPromise = null;
let loadGeneration = 0;

function normalizeId(exchangeId) {
  return exchangeId === "bingx" ? "bingx" : "bybit";
}

export async function loadTradeExchangeModules(exchangeId) {
  const id = normalizeId(
    exchangeId ?? getActiveExchangeId()
  );

  if (activeId === id && modules) {
    return modules;
  }

  if (loadPromise && activeId === id) {
    return loadPromise;
  }

  const generation = ++loadGeneration;
  const pending = (id === "bingx"
    ? import("./bingx/bundle.js?v=24")
    : import("./bybit/bundle.js?v=10")
  ).then((mod) => {
    if (generation !== loadGeneration) {
      return modules;
    }
    activeId = id;
    modules = mod;
    return mod;
  });

  loadPromise = pending;
  return pending;
}

export function getLoadedTradeExchangeModules() {
  return modules;
}

export function getLoadedTradeExchangeId() {
  return activeId;
}

export function resetTradeExchangeModules() {
  loadGeneration += 1;
  activeId = null;
  modules = null;
  loadPromise = null;
}

export async function initTradeModuleRouter() {
  await loadTradeExchangeModules(getActiveExchangeId());
}

export function getActiveTradeConfig() {
  const mod = getLoadedTradeExchangeModules();
  if (!mod?.getTradeConfig) {
    return null;
  }
  return mod.getTradeConfig();
}

export function tradeExchangeApi(name) {
  const mod = getLoadedTradeExchangeModules();
  if (!mod) {
    return null;
  }
  const fn = mod[name];
  return typeof fn === "function" ? fn : null;
}
