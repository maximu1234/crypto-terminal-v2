/**
 * Soft dismiss for #app-boot-splash (inline in terminal/screener HTML).
 */
export function dismissAppBootSplash(){

const el =
document.getElementById(
"app-boot-splash"
);

if(
!el ||
el.classList.contains(
"dismissed"
)
){
return;
}

el.classList.add(
"dismissed"
);
el.setAttribute(
"aria-hidden",
"true"
);

window.setTimeout(
()=>{
el.remove();
},
720
);

}
