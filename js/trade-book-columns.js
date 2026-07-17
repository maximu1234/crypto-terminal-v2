/**
 * Facade → ширины колонок активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=13";

function mod() {
  return getLoadedTradeExchangeModules();
}

export const POSITION_COLUMN_WIDTHS =
  Object.freeze({});
export const ORDER_COLUMN_WIDTHS =
  Object.freeze({});
export const ALERT_COLUMN_WIDTHS =
  Object.freeze({});

export function readPositionColumnWidths(...args) {
  return mod()?.readPositionColumnWidths?.(...args) || {};
}

export function applyPositionColumnLayout(...args) {
  return mod()?.applyPositionColumnLayout?.(...args);
}

export function wirePositionColumnResize(...args) {
  return mod()?.wirePositionColumnResize?.(...args);
}

export function applyOrderColumnLayout(...args) {
  return mod()?.applyOrderColumnLayout?.(...args);
}

export function wireOrderColumnResize(...args) {
  return mod()?.wireOrderColumnResize?.(...args);
}

export function applyAlertColumnLayout(...args) {
  return mod()?.applyAlertColumnLayout?.(...args);
}

export function wireAlertColumnResize(...args) {
  return mod()?.wireAlertColumnResize?.(...args);
}

export function columnResizeHandle(...args) {
  return mod()?.columnResizeHandle?.(...args) || null;
}
