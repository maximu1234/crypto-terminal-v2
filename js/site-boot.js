import {
initAlertMonitor
} from "./alert-monitor.js?v=23";

import {
ensureCloudReady
} from "./auth-ui.js?v=9";

import {
initAlertsCloudSync
} from "./alerts-cloud-sync.js?v=23";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=23";

initAlertMonitor();
initAlertsCloudSync();
void ensureCloudReady()
.then(()=>{
stripAlertFlagsNotInRegistry();
})
.catch(err=>{
console.warn("cloud init failed:", err);
});
