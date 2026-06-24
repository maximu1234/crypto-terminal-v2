/**
 * Цветовой флаг избранного в шапке виджета (Главная / Терминал).
 */
import {
loadFavoritesGroups,
saveFavoritesGroups,
setFavoriteGroup,
getFavoriteGroup,
canSetBlueFlag,
FLAG_TITLES
} from "./favorites.js?v=2";

import {
persistFavoritesToCloud,
onFavoritesRemoteUpdate
} from "./cloud-sync.js?v=39";

let favorites =
loadFavoritesGroups();

export function getWidgetFlagHtml(){

return `
<div class="screener-flag-wrap">
<button type="button" class="flag screener-flag-btn" data-screener-flag-trigger title="Выбрать флаг" aria-haspopup="true" aria-expanded="false" aria-pressed="false"></button>
<div class="screener-flag-menu hidden" role="menu">
<button type="button" class="flag screener-flag-pick flag--red" data-flag-group="red" title="Красный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--green" data-flag-group="green" title="Зелёный" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--gray" data-flag-group="gray" title="Серый" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick flag--blue" data-flag-group="blue" title="Синий (Терминал)" role="menuitem"></button>
<button type="button" class="flag screener-flag-pick screener-flag-clear" data-flag-group="clear" title="Снять флаг" role="menuitem"></button>
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
? FLAG_TITLES[group]
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
group,
onChanged
){

if(
!symbol
){
return;
}

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
return;
}

saveFavoritesGroups(
favorites
);
persistFavoritesToCloud(
favorites
);
onChanged?.();

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
getSymbol()
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
btn.dataset.flagGroup,
onChanged
);

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
"favorites"
){
return;
}

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
