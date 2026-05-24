import {
initAlertMonitor
} from "./alert-monitor.js?v=27";

import {
ensureCloudReady
} from "./auth-ui.js?v=9";

import {
initAlertsCloudSync
} from "./alerts-cloud-sync.js?v=27";

import {
stripAlertFlagsNotInRegistry
} from "./alerts.js?v=27";

initAlertMonitor();
initAlertsCloudSync();
void ensureCloudReady()
.then(()=>{
stripAlertFlagsNotInRegistry();
})
.catch(err=>{
console.warn("cloud init failed:", err);
});
