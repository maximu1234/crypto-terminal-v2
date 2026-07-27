/**
 * Цветовой флаг избранного в шапке виджета (Главная / Терминал).
 */
import {
loadFavoritesGroups,
saveFavoritesGroups,
setFavoriteGroup,
getFavoriteGroup,
canSetBlueFlag,
FAVORITES_BY_EXCHANGE_KEY
} from "./favorites.js?v=5";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=50";

import {
EXCHANGE_CHANGED_EVENT
} from "./market-api.js?v=2";

let favorites =
loadFavoritesGroups();

function syncFavoritesFromStorage(){

favorites =
loadFavoritesGroups();

}

export function getWidgetFlagHtml(){

return `
<div class="screener-flag-wrap">
<button type="button" class="flag screener-flag-btn" data-screener-flag-trigger title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="screener-flag-menu hidden" role="menu">
<button type="button" class="flag screener-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--blue" data-flag-group="blue" title="Синий (Терминал)" role="menuitem"></button>
</div>
</div>`;

}

function refreshFlagMenuPickStates(
root,
symbol
){

const blueBtn =
root?.querySelector(
'[data-flag-group="blue"]'
);

if(
!blueBtn
){
return;
}

const full =
!canSetBlueFlag(
symbol,
favorites
);

blueBtn.disabled =
full;
blueBtn.classList.toggle(
"flag-pick--disabled",
full
);
blueBtn.title =
full
? "Максимум 9 монет в Терминале"
: "Синий (Терминал)";

}

export function updateWidgetFlagUi(
root,
symbol
){

syncFavoritesFromStorage();

const group =
getFavoriteGroup(
symbol,
favorites
);

const btn =
root?.querySelector(
"[data-screener-flag-trigger]"
);

if(
!btn
){
return;
}

btn.className =
"flag screener-flag-btn";

if(
group
){
btn.classList.add(
"favorite",
`flag--${group}`
);
}

btn.title =
group
? "Снять флаг"
: "Выбрать флаг";

btn.setAttribute(
"aria-pressed",
group
? "true"
: "false"
);

refreshFlagMenuPickStates(
root,
symbol
);

}

export function closeAllWidgetFlagMenus(
exceptWrap = null
){

document.querySelectorAll(
".screener-flag-wrap"
).forEach(
wrap=>{

if(
wrap ===
exceptWrap
){
return;
}

wrap.querySelector(
".screener-flag-menu"
)?.classList.add(
"hidden"
);

wrap.querySelector(
"[data-screener-flag-trigger]"
)?.setAttribute(
"aria-expanded",
"false"
);

}
);

}

function applyFavoriteGroup(
symbol,
group
){

if(
!symbol
){
return false;
}

syncFavoritesFromStorage();

const before =
JSON.stringify(
favorites
);

if(
group ===
"clear" ||
group ===
null
){
favorites =
setFavoriteGroup(
symbol,
null,
favorites
);
}else{
favorites =
setFavoriteGroup(
symbol,
group,
favorites
);
}

if(
JSON.stringify(
favorites
) ===
before
){
return false;
}

saveFavoritesGroups(
favorites
);
persistFavoritesToCloud(
favorites
);

return true;

}

export function wireWidgetFlagUi(
root,
getSymbol,
onChanged = null
){

const flagWrap =
root.querySelector(
".screener-flag-wrap"
);

const flagTrigger =
flagWrap?.querySelector(
"[data-screener-flag-trigger]"
);

const flagMenu =
flagWrap?.querySelector(
".screener-flag-menu"
);

flagTrigger?.addEventListener(
"click",
e=>{

e.stopPropagation();

const sym =
getSymbol();

if(
flagTrigger.classList.contains(
"favorite"
)
){
closeAllWidgetFlagMenus(
flagWrap
);
flagMenu?.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);

if(
!applyFavoriteGroup(
sym,
"clear"
)
){
favorites =
setFavoriteGroup(
sym,
null,
loadFavoritesGroups()
);
saveFavoritesGroups(
favorites
);
persistFavoritesToCloud(
favorites
);
}

onChanged?.();
updateWidgetFlagUi(
root,
sym
);
return;
}

const open =
!flagMenu?.classList.contains(
"hidden"
);

closeAllWidgetFlagMenus(
flagWrap
);

if(
open
){
flagMenu?.classList.add(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"false"
);
}else{
flagMenu?.classList.remove(
"hidden"
);
flagTrigger.setAttribute(
"aria-expanded",
"true"
);
refreshFlagMenuPickStates(
root,
sym
);
}

}
);

flagMenu?.querySelectorAll(
"[data-flag-group]"
).forEach(
btn=>{

btn.addEventListener(
"click",
e=>{

e.stopPropagation();

applyFavoriteGroup(
getSymbol(),
btn.dataset.flagGroup
);
onChanged?.();

updateWidgetFlagUi(
root,
getSymbol()
);

flagMenu?.classList.add(
"hidden"
);
flagTrigger?.setAttribute(
"aria-expanded",
"false"
);

}
);

}
);

updateWidgetFlagUi(
root,
getSymbol()
);

}

let globalBound =
false;

export function bindWidgetFlagGlobalListeners(
refreshAll
){

if(
globalBound
){
return;
}

globalBound =
true;

onFavoritesRemoteUpdate(
()=>{

favorites =
loadFavoritesGroups();
refreshAll();

}
);

window.addEventListener(
"storage",
e=>{

if(
e.key !==
FAVORITES_BY_EXCHANGE_KEY &&
e.key !==
"favorites"
){
return;
}

favorites =
loadFavoritesGroups();

refreshAll();

}
);

window.addEventListener(
"favorites-local-changed",
()=>{

favorites =
loadFavoritesGroups();

refreshAll();

}
);

window.addEventListener(
EXCHANGE_CHANGED_EVENT,
()=>{

favorites =
loadFavoritesGroups();

refreshAll();

}
);

document.addEventListener(
"click",
e=>{

if(
e.target.closest(
".screener-flag-wrap"
)
){
return;
}

closeAllWidgetFlagMenus();

}
);

}
