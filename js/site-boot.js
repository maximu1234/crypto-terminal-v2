import {
initAlertMonitor
} from "./alert-monitor.js?v=19";

import {
ensureCloudReady
} from "./auth-ui.js?v=9";

import {
initAlertsCloudSync
} from "./alerts-cloud-sync.js?v=14";

import {
rebuildAlertRegistryFromStorage
} from "./alerts.js?v=16";

initAlertMonitor();
initAlertsCloudSync();
void ensureCloudReady()
.then(()=>{
rebuildAlertRegistryFromStorage();
})
.catch(err=>{
console.warn("cloud init failed:", err);
});
