/**
 * Desktop-only algo background jobs. Single import from site-boot.js so the
 * plugin can be dropped without extra core wiring (dynamic import + catch).
 * Gated by «Включить АлгоТрейдинг» in System settings.
 */
import {
shouldRunAlgoBackgroundJobs
} from "../desktop-feature-nav-prefs.js?v=0fd2425e";

import {
isAlgoBotLiteShell
} from "../page-routes.js?v=4dc7f350";

import {
ALGO_ANALYSIS_BOT_PATTERN_12,
isActiveAnalysisBot
} from "./active-analysis-bot.js?v=c1b8293b";

function stopPatternOptimizeJob(){

return import(
"./optimize-universe-background.js?v=f928635f"
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

}

export function bootAlgoDesktopBackgroundJobs(){

if(
!shouldRunAlgoBackgroundJobs()
){
return;
}

if(
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
)
){
void import(
"./optimize-universe-background.js?v=f928635f"
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
}else{
void stopPatternOptimizeJob();
}

void import(
"./bot-alert-bridge.js?v=8b811f5c"
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

const tasks =
[
import(
"./optimize-universe-background.js?v=f928635f"
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
),
import(
"./bot-alert-bridge.js?v=8b811f5c"
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
)
];

if(
!isAlgoBotLiteShell()
){
tasks.push(
import(
"./bot-bridge.js?v=17baeaa9"
).then(
m=>
m.stopAlgoBotIfRunning?.()
).catch(
err=>{
console.warn(
"[algo desktop-site-boot] stop bot if running:",
err
);
}
)
);
}

return Promise.all(
tasks
);

}
