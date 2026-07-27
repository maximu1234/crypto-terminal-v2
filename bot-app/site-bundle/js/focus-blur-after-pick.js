/**
 * Снимает focus после выбора в select, checkbox/radio и кнопках-триггерах выпадашек.
 * Иначе Electron/macOS оставляет кольцо фокуса, а Пробел снова переключает контрол
 * вместо глобальных хоткеев (листание страниц скринера, список монет и т.д.).
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
return;
}

if(
target?.tagName ===
"INPUT" &&
(
target.type ===
"checkbox" ||
target.type ===
"radio"
)
){
queueMicrotask(
()=>{
target.blur();
}
);
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
".screener-header-pick-item"
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
".screener-header-pick-wrap"
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
