/**
 * Блокирует стандартное браузерное меню (Save Image, Inspect…).
 * Кастомные меню (шкала, рисунки) сами вызывают preventDefault в своих обработчиках.
 */
export function initSuppressNativeContextMenu(){

document.addEventListener(
"contextmenu",
e=>{

const t =
e.target;

if(
t instanceof HTMLInputElement ||
t instanceof HTMLTextAreaElement ||
t instanceof HTMLSelectElement
){
return;
}

if(
t?.closest?.(
'input, textarea, select, [contenteditable="true"]'
)
){
return;
}

e.preventDefault();

},
{ capture:true }
);

}
