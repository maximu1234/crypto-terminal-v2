/**
 * Phone-only viewport gate. Mutually exclusive with tablet/.app.
 * Electron .app never counts as phone (no mobile redirect / pages).
 *
 * Landscape phones are wide (≥768) but short — use the shorter edge so a
 * rotate+reload does not treat the device as iPad/desktop.
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

/** Shorter layout edge in CSS px (orientation-stable phone vs tablet). */
function viewportShortSidePx() {
  const w = Number(window.innerWidth) || 0;
  const h = Number(window.innerHeight) || 0;
  if (w <= 0 || h <= 0) {
    return 0;
  }
  return Math.min(w, h);
}

/**
 * Phones stay phones in landscape (short side ~320–500).
 * Real tablets keep short side ≥ ~744 even in landscape.
 */
const PHONE_SHORT_SIDE_MAX = 520;

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
    const touch =
      (typeof navigator !== "undefined" && navigator.maxTouchPoints >= 1) ||
      window.matchMedia("(pointer: coarse)").matches;
    if (!touch) {
      return false;
    }

    const shortSide = viewportShortSidePx();
    if (shortSide > 0 && shortSide <= PHONE_SHORT_SIDE_MAX) {
      return true;
    }

    /* Narrow portrait / odd layouts: still phone if not a tablet gate */
    if (isTabletChartViewport()) {
      return false;
    }
    if (window.matchMedia("(pointer: coarse) and (max-width: 767px)").matches) {
      return true;
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
      return true;
    }
    return false;
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
