/**
 * Boot /m-terminal.html — phone only.
 */
import {
  waitForSiteCssReady
} from "../site-css-gate.js?v=1";
import {
  loadLightweightCharts
} from "../charts-lib-boot.js?v=3";
import {
  redirectNonPhoneFromMobile
} from "./viewport.js?v=1";
import {
  mountMobileNav
} from "./nav.js?v=2";
import {
  mountMobileTerminalPage
} from "./terminal-page.js?v=2";

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
