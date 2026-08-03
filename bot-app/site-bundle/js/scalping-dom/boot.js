/**
 * Public API for scalping DOM plugin.
 * Mount only on desktop Terminal when preference is enabled.
 */
import {
cssUrl
} from "../asset-manifest.js?v=2";

import {
isTerminalPageOnly
} from "../page-routes.js?v=5";

import {
ensureScalpingDomStylesheet,
mountScalpingDomHost,
removeScalpingDomStylesheet,
unmountScalpingDomHost
} from "./host.js?v=2";

import {
createDepthFeed
} from "./depth-feed.js?v=21";

import {
createLadderUi
} from "./ladder-ui.js?v=24";

import {
isScalpingDomEnabled,
SCALPING_DOM_PREF_EVENT
} from "./prefs.js?v=4";

import {
mountScalpingDomHeaderToggle
} from "./settings-ui.js?v=27";

let mounted =
false;
let feed =
null;
let ui =
null;
let prefListenerBound =
false;

function isDesktopShell(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

function canMount(){

return (
isDesktopShell() &&
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
isDesktopShell() &&
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
