/**
 * Boot /m-terminal.html — phone only.
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
  mountMobileTerminalPage
} from "./terminal-page.js?v=073bc484";

async function boot() {
  if (redirectNonPhoneFromMobile("/terminal.html")) {
    return;
  }
  await waitForSiteCssReady();
  await loadLightweightCharts();
  mountMobileNav("terminal");
  const root = document.getElementById("mobile-terminal-root");
  if (root) {
    await mountMobileTerminalPage(root);
  }
}

boot().catch((err) => {
  console.error("[mobile terminal boot]", err);
});
