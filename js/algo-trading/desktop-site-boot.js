/**
 * Desktop-only algo background jobs. Single import from site-boot.js so the
 * plugin can be dropped without extra core wiring (dynamic import + catch).
 * Gated by «Включить АлгоТрейдинг» in System settings.
 */
import {
shouldRunAlgoBackgroundJobs
} from "../desktop-feature-nav-prefs.js?v=3";

export function bootAlgoDesktopBackgroundJobs(){

if(
!shouldRunAlgoBackgroundJobs()
){
return;
}

void import(
"./optimize-universe-background.js?v=5"
).then(
m=>
m.resumeAlgoOptimizeUniverseJob?.()
).catch(
err=>{
console.warn(
"[algo desktop-site-boot] optimize universe:",
err
);
}
);

void import(
"./bot-alert-bridge.js?v=7"
).then(
m=>
m.mountAlgoBotAlertBridge?.()
).catch(
err=>{
console.warn(
"[algo desktop-site-boot] bot alert bridge:",
err
);
}
);

}

export function stopAlgoDesktopBackgroundJobs(){

void import(
"./optimize-universe-background.js?v=5"
).then(
m=>
m.stopAlgoOptimizeUniverseJob?.()
).catch(
err=>{
console.warn(
"[algo desktop-site-boot] stop optimize universe:",
err
);
}
);

void import(
"./bot-alert-bridge.js?v=7"
).then(
m=>
m.unmountAlgoBotAlertBridge?.()
).catch(
err=>{
console.warn(
"[algo desktop-site-boot] unmount bot alert bridge:",
err
);
}
);

}
