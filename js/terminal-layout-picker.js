/**
 * Выбор раскладки графиков на странице Терминал (1–4 виджета, одна монета).
 */
const LAYOUT_OPTIONS =
[
{
count:
1,
icon:
"/assets/terminal-layout/layout-1.png",
label:
"1 график"
},
{
count:
2,
icon:
"/assets/terminal-layout/layout-2.png",
label:
"2 графика"
},
{
count:
3,
icon:
"/assets/terminal-layout/layout-3.png",
label:
"3 графика"
},
{
count:
4,
icon:
"/assets/terminal-layout/layout-4.png",
label:
"4 графика"
}
];

function layoutIcon(
count
){

return LAYOUT_OPTIONS.find(
opt=>
opt.count ===
count
)?.icon ||
LAYOUT_OPTIONS[
0
].icon;

}

export function mountTerminalLayoutPicker(
{
getCount,
onSelect
}
){

const anchor =
document.querySelector(
".coins-header-desktop #header-settings-wrap"
) ||
document.querySelector(
".coins-header-desktop .menu a.active"
);

if(
!anchor ||
!anchor.parentElement
){
return;
}

const wrap =
document.createElement(
"div"
);
wrap.className =
"coins-layout-picker-wrap";
wrap.innerHTML =
`
<button type="button" class="coins-layout-picker-btn" aria-haspopup="menu" aria-expanded="false" title="Раскладка графиков" aria-label="Раскладка графиков">
<img class="coins-layout-picker-icon" data-role="icon" src="${layoutIcon(getCount())}" width="35" height="32" alt="">
</button>
<div class="coins-layout-picker-menu hidden" role="menu" aria-label="Количество графиков">
${LAYOUT_OPTIONS.map(
opt=>`
<button type="button" class="coins-layout-picker-item" role="menuitem" data-layout-count="${opt.count}" title="${opt.label}" aria-label="${opt.label}">
<img src="${opt.icon}" width="35" height="32" alt="">
</button>`
).join("")}
</div>`;

if(
anchor.id ===
"header-settings-wrap"
){
anchor.parentElement.insertBefore(
wrap,
anchor.nextSibling
);
}else{
anchor.parentElement.appendChild(
wrap
);
}

const btn =
wrap.querySelector(
".coins-layout-picker-btn"
);
const menu =
wrap.querySelector(
".coins-layout-picker-menu"
);
const iconEl =
wrap.querySelector(
"[data-role=icon]"
);

function closeMenu(){

menu?.classList.add(
"hidden"
);
btn?.setAttribute(
"aria-expanded",
"false"
);

}

function syncIcon(){

if(
iconEl
){
iconEl.src =
layoutIcon(
getCount()
);
}

wrap.querySelectorAll(
".coins-layout-picker-item"
).forEach(
item=>{
item.classList.toggle(
"is-active",
Number(
item.dataset.layoutCount
) ===
getCount()
);
}
);

}

btn?.addEventListener(
"click",
e=>{
e.stopPropagation();
const open =
!menu?.classList.contains(
"hidden"
);
document.querySelectorAll(
".coins-layout-picker-menu"
).forEach(
el=>{
el.classList.add(
"hidden"
);
}
);

btn?.addEventListener(
"mousedown",
event=>{
if(
event.button ===
0
){
event.preventDefault();
}
},
true
);

btn?.addEventListener(
"keydown",
event=>{
if(
event.code === "Space" ||
event.code === "Enter"
){
event.preventDefault();
}
},
true
);
if(
open
){
closeMenu();
return;
}
menu?.classList.remove(
"hidden"
);
btn?.setAttribute(
"aria-expanded",
"true"
);
syncIcon();
}
);

menu?.querySelectorAll(
"[data-layout-count]"
).forEach(
item=>{
item.addEventListener(
"click",
e=>{
e.stopPropagation();
const count =
Number(
item.dataset.layoutCount
);
closeMenu();
if(
!count ||
count ===
getCount()
){
return;
}
onSelect?.(
count
);
syncIcon();
queueMicrotask(
()=>{
item.blur();
btn?.blur();
}
);
}
);
}
);

document.addEventListener(
"click",
e=>{
if(
e.target.closest(
".coins-layout-picker-wrap"
)
){
return;
}
closeMenu();
}
);

document.addEventListener(
"keydown",
e=>{
if(
e.key ===
"Escape"
){
closeMenu();
}
}
);

return {
syncIcon,
closeMenu
};

}
