/**
 * Панель рисования всегда видна в DOM; гостю — только подсказка по клику (drawings.js).
 */
export function ensureDrawToolsVisible(){

document.querySelectorAll(
"#draw-toolbar, .widget-draw-tools"
).forEach(el=>{
el.classList.remove(
"hidden"
);
});

}

if(
typeof document !== "undefined"
){

if(
document.readyState === "loading"
){

document.addEventListener(
"DOMContentLoaded",
ensureDrawToolsVisible
);

}else{

ensureDrawToolsVisible();

}

window.addEventListener(
"draw-tools-access-changed",
ensureDrawToolsVisible
);

}
