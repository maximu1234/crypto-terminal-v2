/**
 * Header toggle for «Стакан для скальпинга» (desktop Terminal only).
 * Mounted before chart layout buttons (inside layout picker wrap).
 */
import {
isScalpingDomEnabled,
setScalpingDomEnabled
} from "./prefs.js?v=4";

const WRAP_CLASS =
"scalping-dom-header-toggle-wrap";

const INPUT_ID =
"scalping-dom-header-toggle";

export function isScalpingDomSettingsAvailable(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

function findLayoutPicker(){

return (
document.querySelector(
"#header #header-controls .coins-layout-picker-wrap"
) ||
document.querySelector(
".coins-layout-picker-wrap"
)
);

}

function syncInput(
input
){

if(
input
){
input.checked =
isScalpingDomEnabled();
}

}

function bindInput(
input
){

if(
!input ||
input.dataset.bound ===
"1"
){
return;
}

input.dataset.bound =
"1";

input.addEventListener(
"change",
()=>{

setScalpingDomEnabled(
!!input.checked
);

}
);

}

/**
 * Mount checkbox + separator before layout icons.
 * Retries until layout picker exists (Terminal header boots async).
 */
export function mountScalpingDomHeaderToggle(){

if(
!isScalpingDomSettingsAvailable()
){
return {
refresh:()=>{}
};
}

const existing =
document.querySelector(
`.${WRAP_CLASS}`
);

if(
existing
){
const input =
existing.querySelector(
`#${INPUT_ID}`
);
bindInput(
input
);
syncInput(
input
);

const picker =
findLayoutPicker();

if(
picker &&
existing.parentElement !==
picker
){
picker.insertBefore(
existing,
picker.firstChild
);
}

return {
refresh:()=>
syncInput(
input
)
};
}

const picker =
findLayoutPicker();

if(
!picker
){
let tries =
0;
const waitTimer =
setInterval(
()=>{
tries++;
if(
findLayoutPicker()
){
clearInterval(
waitTimer
);
mountScalpingDomHeaderToggle();
return;
}
if(
tries >=
40
){
clearInterval(
waitTimer
);
}
},
100
);
return {
refresh:()=>{}
};
}

const wrap =
document.createElement(
"div"
);
wrap.className =
WRAP_CLASS;
wrap.innerHTML =
`<label class="scalping-dom-header-toggle" title="Стакан">` +
`<input type="checkbox" class="scalping-dom-header-toggle-input" id="${INPUT_ID}" aria-label="Стакан" />` +
`</label>` +
`<span class="scalping-dom-header-toggle-sep" aria-hidden="true"></span>`;

picker.insertBefore(
wrap,
picker.firstChild
);

const input =
wrap.querySelector(
`#${INPUT_ID}`
);
bindInput(
input
);
syncInput(
input
);

return {
refresh:()=>
syncInput(
input
)
};

}

export function unmountScalpingDomHeaderToggle(){

document.querySelectorAll(
`.${WRAP_CLASS}`
).forEach(
el=>
el.remove()
);

}
