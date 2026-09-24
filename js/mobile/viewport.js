/**
 * Phone-only viewport gate. Mutually exclusive with isTabletChartViewport (≥768 coarse).
 * Electron .app never counts as phone (no mobile redirect / pages).
 */
import {
  isTabletChartViewport
} from "../chart/chart-options.js?v=7";

export function isDesktopAppShell() {
  try {
    return !!globalThis.window?.cryptoTerminalDesktop?.isDesktop;
  } catch {
    return false;
  }
}

/**
 * @returns {boolean}
 */
export function isPhoneMobileViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  if (isDesktopAppShell()) {
    return false;
  }
  try {
    if (isTabletChartViewport()) {
      return false;
    }
    if (window.matchMedia("(pointer: coarse) and (max-width: 767px)").matches) {
      return typeof navigator !== "undefined" && navigator.maxTouchPoints >= 1;
    }
    if (typeof navigator === "undefined" || navigator.maxTouchPoints < 1) {
      return false;
    }
    if (!window.matchMedia("(max-width: 767px)").matches) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function redirectPhoneTo(path) {
  if (!isPhoneMobileViewport()) {
    return false;
  }
  const target = String(path || "");
  if (!target || location.pathname === target) {
    return false;
  }
  location.replace(target);
  return true;
}

export function redirectNonPhoneFromMobile(desktopPath) {
  if (isPhoneMobileViewport()) {
    return false;
  }
  const target = String(desktopPath || "/screener.html");
  location.replace(target);
  return true;
}
