import {
initAlertMonitor
} from "./alert-monitor.js?v=15";

import {
ensureCloudReady
} from "./auth-ui.js?v=7";

initAlertMonitor();
void ensureCloudReady().catch(err=>{
console.warn("cloud init failed:", err);
});
