import {
initAlertMonitor
} from "./alert-monitor.js?v=15";

import {
ensureCloudReady
} from "./auth-ui.js?v=9";

import {
initAlertsCloudSync
} from "./alerts-cloud-sync.js?v=4";

initAlertMonitor();
initAlertsCloudSync();
void ensureCloudReady().catch(err=>{
console.warn("cloud init failed:", err);
});
