/**
 * Public API for scalping DOM plugin.
 * Mount only on desktop Terminal when preference is enabled.
 */
import {
cssUrl
} from "../asset-manifest.js?v=28";

import {
isTerminalPageOnly
} from "../page-routes.js?v=6";

import {
ensureScalpingDomStylesheet,
mountScalpingDomHost,
removeScalpingDomStylesheet,
unmountScalpingDomHost
} from "./host.js?v=2";

import {
createDepthFeed
} from "./depth-feed.js?v=39";

import {
createLadderUi
} from "./ladder-ui.js?v=38";

import {
isScalpingDomEnabled,
SCALPING_DOM_PREF_EVENT
} from "./prefs.js?v=4";

import {
mountScalpingDomHeaderToggle
} from "./settings-ui.js?v=28";

let mounted =
false;
let feed =
null;
let ui =
null;
let prefListenerBound =
false;

function isTradeRuntime(){

return !!(
window.cryptoTerminalDesktop?.isDesktop ||
window.cryptoTerminalDesktop?.webTrading
);

}

function canMount(){

return (
isTradeRuntime() &&
isTerminalPageOnly() &&
isScalpingDomEnabled()
);

}

function tearDown(){

feed?.stop();
feed =
null;
ui?.destroy();
ui =
null;
unmountScalpingDomHost();
/* Keep stylesheet — header toggle styles still needed when ladder is off. */
mounted =
false;

}

function refreshStylesheet(){

ensureScalpingDomStylesheet(
cssUrl(
"scalping-dom.css"
)
);

}

function mountNow(){

refreshStylesheet();

if(
mounted
){
return true;
}

const root =
mountScalpingDomHost();

if(
!root
){
return false;
}

ui =
createLadderUi(
root,
{
onSettingsChange:()=>{
feed?.rebuild?.();
},
onViewChange:(
view
)=>{
feed?.setView?.(
view
);
}
}
);
feed =
createDepthFeed(
{
onLadder:
ladder=>{
ui?.render(
ladder
);
},
onSymbol:
symbol=>{
ui?.setSymbol(
symbol
);
},
onStatus:
text=>{
ui?.setStatus(
text
);
}
}
);
feed.start();
mounted =
true;
return true;

}

/**
 * Apply current preference: mount or destroy ladder.
 */
export function applyPreference(){

if(
canMount()
){
mountNow();
return;
}

tearDown();

}

/**
 * Boot hook for Terminal page — header toggle on desktop; ladder if enabled.
 */
export function maybeMount(){

if(
!(
isTradeRuntime() &&
isTerminalPageOnly()
)
){
return;
}

ensurePrefListener();
refreshStylesheet();
mountScalpingDomHeaderToggle();
applyPreference();

}

export function destroy(){

tearDown();
removeScalpingDomStylesheet();

}

function ensurePrefListener(){

if(
prefListenerBound
){
return;
}

prefListenerBound =
true;

window.addEventListener(
SCALPING_DOM_PREF_EVENT,
()=>{

applyPreference();
mountScalpingDomHeaderToggle();

}
);

}
