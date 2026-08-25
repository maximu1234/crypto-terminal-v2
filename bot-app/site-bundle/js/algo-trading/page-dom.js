/**
 * DOM helpers страницы АлгоТрейдинг.
 * Split from js/algo-trading.js — поведение 1:1.
 */
export function bindAlgoNumericField(
el,
commit
){

if(
!el
){
return;
}

el.addEventListener(
"input",
commit
);
el.addEventListener(
"change",
commit
);
el.addEventListener(
"keydown",
event=>{

if(
event.key ===
"Enter"
){
event.preventDefault();
el.blur();
}

}
);

}
