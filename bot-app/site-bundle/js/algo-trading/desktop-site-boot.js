/**
 * Desktop-only algo background jobs. Single import from site-boot.js so the
 * plugin can be dropped without extra core wiring (dynamic import + catch).
 */
export function bootAlgoDesktopBackgroundJobs(){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
return;
}

void import(
"./optimize-universe-background.js?v=2"
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
"./bot-alert-bridge.js?v=6"
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
