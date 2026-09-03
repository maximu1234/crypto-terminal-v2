/**
 * Facade → пресеты объёма активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=23";

function mod() {
  return getLoadedTradeExchangeModules();
}

export const TRADE_VOLUME_SLOT_COUNT = 6;
export const TRADE_VOLUME_POSITION_APPLY_SLOT_INDEX =
  TRADE_VOLUME_SLOT_COUNT - 1;

export function getDefaultVolumeSlots(...args) {
  return mod()?.getDefaultVolumeSlots?.(...args) || Array(TRADE_VOLUME_SLOT_COUNT).fill(0);
}

export function saveDefaultVolumePresets(...args) {
  return mod()?.saveDefaultVolumePresets?.(...args);
}

export function switchTradeVolumeSymbol(...args) {
  return mod()?.switchTradeVolumeSymbol?.(...args);
}

export function getTradeVolumePresetsState(...args) {
  return mod()?.getTradeVolumePresetsState?.(...args) || {
    slots: Array(TRADE_VOLUME_SLOT_COUNT).fill(0),
    activeIndex: 0
  };
}

export function getActiveTradeVolumeUsdt(...args) {
  return mod()?.getActiveTradeVolumeUsdt?.(...args) || 0;
}

export function getVolumeStateForSymbol(...args) {
  return mod()?.getVolumeStateForSymbol?.(...args) || {
    slots: Array(TRADE_VOLUME_SLOT_COUNT).fill(0),
    activeIndex: 0
  };
}

export function saveVolumeStateForSymbol(...args) {
  return mod()?.saveVolumeStateForSymbol?.(...args);
}

export function applyPositionVolumeFromDrawing(...args) {
  return mod()?.applyPositionVolumeFromDrawing?.(...args);
}

export function applyPositionVolumeToTradePreset(...args) {
  return mod()?.applyPositionVolumeToTradePreset?.(...args);
}

export function focusActiveVolumePresetInput(...args) {
  return mod()?.focusActiveVolumePresetInput?.(...args);
}

export function wireTradeVolumeDefaultsSettings(...args) {
  return mod()?.wireTradeVolumeDefaultsSettings?.(...args);
}

export function initTradeVolumePresets(...args) {
  return mod()?.initTradeVolumePresets?.(...args);
}
