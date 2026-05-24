import {
initAlertMonitor
} from "./alert-monitor.js?v=15";

import {
ensureCloudReady
} from "./auth-ui.js?v=4";

initAlertMonitor();
await ensureCloudReady();
