import {
initAlertMonitor
} from "./alert-monitor.js?v=17";

import {
ensureCloudReady
} from "./auth-ui.js?v=9";

import {
initAlertsCloudSync
} from "./alerts-cloud-sync.js?v=10";

initAlertMonitor();
initAlertsCloudSync();
void ensureCloudReady().catch(err=>{
console.warn("cloud init failed:", err);
});
