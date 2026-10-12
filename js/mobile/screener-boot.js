/**
 * Boot /m-screener.html — phone only.
 */
import {
  waitForSiteCssReady
} from "../site-css-gate.js?v=2f1bf426";
import {
  loadLightweightCharts
} from "../charts-lib-boot.js?v=04885614";
import {
  redirectNonPhoneFromMobile
} from "./viewport.js?v=662114e7";
import {
  mountMobileNav
} from "./nav.js?v=4b83ad99";
import {
  mountMobileScreenerPage
} from "./screener-page.js?v=339be806";

async function boot() {
  if (redirectNonPhoneFromMobile("/screener.html")) {
    return;
  }
  await waitForSiteCssReady();
  await loadLightweightCharts();
  mountMobileNav("screener");
  const root = document.getElementById("mobile-screener-root");
  if (root) {
    await mountMobileScreenerPage(root);
  }
}

boot().catch((err) => {
  console.error("[mobile screener boot]", err);
});
