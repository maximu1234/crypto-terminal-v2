/**
 * Снимает focus после выбора в select и кнопках-триггерах выпадашек.
 * Electron/macOS оставляет оранжевое кольцо, если не вызвать blur().
 */
export function initFocusBlurAfterPick(
root =
document
){

if(
root.__focusBlurAfterPick
){
return;
}

root.__focusBlurAfterPick =
true;

root.addEventListener(
"change",
event=>{

const target =
event.target;

if(
target?.tagName ===
"SELECT"
){
target.blur();
}

},
true
);

root.addEventListener(
"click",
event=>{

const target =
event.target;

if(
!(
target instanceof Element
)
){
return;
}

const refreshBtn =
target.closest(
"[data-refresh-ms]"
);

if(
refreshBtn
){
queueMicrotask(
()=>{
refreshBtn.blur();
}
);
return;
}

const menuItem =
target.closest(
".screener-mobile-menu-item, .screener-header-pick-item"
);

if(
!menuItem
){
return;
}

queueMicrotask(
()=>{

menuItem.blur();

const wrap =
menuItem.closest(
".screener-mobile-select-wrap, .screener-header-pick-wrap, .coins-tf-mobile-wrap"
);

wrap?.querySelector(
"button"
)?.blur();

}
);

},
true
);

}
