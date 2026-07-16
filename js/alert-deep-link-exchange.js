import {
getActiveExchangeId,
setActiveExchangeId,
getExchangeDefinition
} from "./market-api.js?v=2";

import {
isKnownExchangeId
} from "./exchanges/context.js?v=1";

import {
cssUrl
} from "./asset-manifest.js?v=2";

import {
ALERT_DEEP_LINK_EXCHANGE_PARAM,
buildAlertChartUrl,
parseAlertDeepLinkExchange
} from "./alert-deep-link-url.js?v=2";

export {
ALERT_DEEP_LINK_EXCHANGE_PARAM,
buildAlertChartUrl,
parseAlertDeepLinkExchange
};

export function clearAlertDeepLinkParams(){

try{

const params =
new URLSearchParams(
window.location.search
);

params.delete(
"symbol"
);
params.delete(
"tf"
);
params.delete(
ALERT_DEEP_LINK_EXCHANGE_PARAM
);

const qs =
params.toString();
const next =
`${window.location.pathname || "/"}${qs ? `?${qs}` : ""}`;

history.replaceState(
null,
"",
next
);

}catch{
/* ignore */
}

}

function ensureConfirmStyles(){

if(
document.querySelector(
'link[data-alert-exchange-confirm-css="1"]'
)
){
return;
}

const link =
document.createElement(
"link"
);

link.rel =
"stylesheet";
link.href =
cssUrl(
"trade-exchange-settings.css"
);
link.dataset.alertExchangeConfirmCss =
"1";
document.head.appendChild(
link
);

}

export function showAlertExchangeSwitchConfirm(
exchangeName
){

ensureConfirmStyles();

return new Promise(
resolve=>{

const safeName =
String(
exchangeName ||
""
).trim() ||
"биржу";

const overlay =
document.createElement(
"div"
);

overlay.className =
"trade-exchange-confirm-overlay";
overlay.innerHTML =
`
<div class="trade-exchange-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="alert-exchange-switch-title">
<p id="alert-exchange-switch-title" class="trade-exchange-confirm-message">Перейти на биржу ${safeName}?</p>
<div class="trade-exchange-confirm-actions">
<button type="button" class="trade-exchange-confirm-cancel" data-action="cancel">Отмена</button>
<button type="button" class="trade-exchange-confirm-yes" data-action="yes">Да</button>
</div>
</div>`;

document.body.appendChild(
overlay
);

const finish =
confirmed=>{

overlay.remove();
document.removeEventListener(
"keydown",
onKey
);
resolve(
confirmed
);

};

const onKey =
event=>{

if(
event.key ===
"Escape"
){
finish(
false
);
}

};

document.addEventListener(
"keydown",
onKey
);

overlay.addEventListener(
"click",
event=>{

const action =
event.target.closest(
"[data-action]"
)?.dataset.action;

if(
action ===
"yes"
){
finish(
true
);
return;
}

if(
action ===
"cancel" ||
event.target ===
overlay
){
finish(
false
);
}

}
);

overlay.querySelector(
".trade-exchange-confirm-cancel"
)?.focus();

}
);

}

export async function confirmAlertExchangeSwitch(
exchangeId
){

const target =
String(
exchangeId ||
""
).trim().toLowerCase();

if(
!target ||
!isKnownExchangeId(
target
)
){
return true;
}

if(
target ===
getActiveExchangeId()
){
return true;
}

const name =
getExchangeDefinition(
target
).name;

return showAlertExchangeSwitchConfirm(
name
);

}

/**
 * @param {{ exchangeId?: string, silentSwitch?: boolean }} opts
 * @returns {Promise<{ proceed: boolean, switched: boolean }>}
 */
export async function gateAlertExchangeNavigation(
opts = {}
){

const target =
String(
opts.exchangeId ||
""
).trim().toLowerCase();

if(
!target ||
!isKnownExchangeId(
target
)
){
return {
proceed:
true,
switched:
false
};
}

if(
target ===
getActiveExchangeId()
){
return {
proceed:
true,
switched:
false
};
}

const ok =
await confirmAlertExchangeSwitch(
target
);

if(
!ok
){
return {
proceed:
false,
switched:
false
};
}

setActiveExchangeId(
target,
{
silent:
!!opts.silentSwitch
}
);

return {
proceed:
true,
switched:
true
};

}

/**
 * Terminal URL deep link: confirm/switch exchange before chart load.
 * @param {{ silentSwitch?: boolean }} [opts]
 * @returns {Promise<boolean>} false = cancel URL navigation
 */
export async function resolveUrlExchangeDeepLink(
opts = {}
){

if(
typeof window ===
"undefined"
){
return true;
}

const params =
new URLSearchParams(
window.location.search
);
const symbol =
String(
params.get(
"symbol"
) ||
""
).trim();
const urlExchange =
parseAlertDeepLinkExchange(
params
);

if(
!symbol ||
!urlExchange
){
return true;
}

const gate =
await gateAlertExchangeNavigation({
exchangeId:
urlExchange,
silentSwitch:
!!opts.silentSwitch
});

if(
!gate.proceed
){
clearAlertDeepLinkParams();
return false;
}

return true;

}
