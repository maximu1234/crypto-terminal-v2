/**
 * Facade → PnL share активной биржи.
 */
import {
  getLoadedTradeExchangeModules
} from "./trade/module-router.js?v=16";

function mod() {
  return getLoadedTradeExchangeModules();
}

const SHARE_ICON_V = 2;

export const PNL_SHARE_CONTROL_HTML =
`<span class="trade-book-share" data-action="share-pnl" role="button" tabindex="-1" aria-label="Поделиться PnL" title="Поделиться PnL">
<img class="trade-book-share-icon trade-book-share-icon--off" src="/assets/share_off.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
<img class="trade-book-share-icon trade-book-share-icon--on" src="/assets/share_on.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
</span>`;

export const PNL_SHARE_BUTTON_HTML =
`<button type="button" class="trade-book-share" data-action="share-pnl" aria-label="Поделиться PnL" title="Поделиться PnL">
<img class="trade-book-share-icon trade-book-share-icon--off" src="/assets/share_off.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
<img class="trade-book-share-icon trade-book-share-icon--on" src="/assets/share_on.png?v=${SHARE_ICON_V}" width="14" height="14" alt="">
</button>`;

export function buildDiaryPayload(...args) {
  return mod()?.buildDiaryPayload?.(...args) || null;
}

export async function openPnlShareModal(...args) {
  const fn = mod()?.openPnlShareModal;
  if (typeof fn !== "function") {
    return;
  }
  return fn(...args);
}

export async function openPnlShareDiaryModal(...args) {
  const fn = mod()?.openPnlShareDiaryModal;
  if (typeof fn !== "function") {
    return;
  }
  return fn(...args);
}
