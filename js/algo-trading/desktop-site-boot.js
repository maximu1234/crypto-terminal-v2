/**
 * Desktop-only algo background jobs. Single import from site-boot.js so the
 * plugin can be dropped without extra core wiring (dynamic import + catch).
 * Gated by «Включить АлгоТрейдинг» in System settings.
 */
import {
shouldRunAlgoBackgroundJobs
} from "../desktop-feature-nav-prefs.js?v=4";

import {
isAlgoBotLiteShell
} from "../page-routes.js?v=5";

import {
ALGO_ANALYSIS_BOT_PATTERN_12,
isActiveAnalysisBot,
isAnyAnalysisBotActive
} from "./active-analysis-bot.js?v=4";

export function bootAlgoDesktopBackgroundJobs(){

if(
!shouldRunAlgoBackgroundJobs()
){
return;
}

if(
!isAnyAnalysisBotActive()
){
void stopAlgoDesktopBackgroundJobs();
return;
}

if(
isActiveAnalysisBot(
ALGO_ANALYSIS_BOT_PATTERN_12
)
){
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
}

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

const tasks =
[
import(
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
),
import(
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
)
];

if(
!isAlgoBotLiteShell()
){
tasks.push(
import(
"./bot-bridge.js?v=27"
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
