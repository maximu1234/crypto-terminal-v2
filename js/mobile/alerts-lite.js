/**
 * Mobile alerts list/create/remove — thin wrapper over alerts.js registry.
 */
import {
  createPriceAlert,
  getAlertsSorted,
  loadAllAlerts,
  removeAlert,
  formatAlertTicker,
  formatTfLabel
} from "../alerts.js?v=15e48a83";
import {
  initAlertsCloudSync,
  getTelegramChatId
} from "../alerts-cloud-sync.js?v=3c1f57e1";
import {
  isCloudLoggedIn
} from "../cloud-sync.js?v=2aec0d02";

export async function initMobileAlertsLite() {
  initAlertsCloudSync();
  loadAllAlerts();
}

export function listMobileAlerts() {
  return getAlertsSorted() || [];
}

export async function createMobilePriceAlert(symbol, price, tf = "60") {
  if (!isCloudLoggedIn()) {
    return { ok: false, reason: "login" };
  }
  if ((await getTelegramChatId()) == null) {
    return { ok: false, reason: "telegram" };
  }
  const entry = await createPriceAlert(
    String(symbol || "").replace(/\.P$/i, "").toUpperCase(),
    Number(price),
    String(tf || "60"),
    { source: "mobile" }
  );
  if (!entry) {
    return { ok: false, reason: "create" };
  }
  return { ok: true, entry };
}

export function removeMobileAlert(alert) {
  removeAlert(alert?.symbol, alert?.shapeId || alert?.id);
}

export function formatMobileAlertLine(alert) {
  const sym = formatAlertTicker(alert?.symbol) || alert?.symbol || "";
  const tf = formatTfLabel?.(alert?.tf) || alert?.tf || "";
  const price = alert?.price ?? alert?.level ?? "";
  return { sym, tf, price };
}
