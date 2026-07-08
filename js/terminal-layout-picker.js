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
"#header #header-controls"
);

if(
!anchor
){
let tries =
0;
const waitTimer =
setInterval(
()=>{
const nextAnchor =
document.querySelector(
"#header #header-controls"
);
if(
nextAnchor
){
clearInterval(
waitTimer
);
mountTerminalLayoutPicker(
{
getCount,
onSelect
}
);
return;
}
tries++;
if(
tries >=
20
){
clearInterval(
waitTimer
);
}
},
100
);
return {
syncIcon:
()=>{},
closeMenu:
()=>{}
};
}

const existing =
anchor.querySelector(
".coins-layout-picker-wrap"
) ||
document.querySelector(
".coins-layout-picker-wrap"
);

if(
existing
){
const api =
{
syncIcon(){
existing.querySelectorAll(
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
},
closeMenu:
()=>{}
};

api.syncIcon();

return api;
}

const wrap =
document.createElement(
"div"
);
wrap.className =
"coins-layout-picker-wrap";
wrap.innerHTML =
`${LAYOUT_OPTIONS.map(
opt=>`
<button type="button" class="coins-layout-picker-item" role="button" data-layout-count="${opt.count}" title="${opt.label}" aria-label="${opt.label}">
<img src="${opt.icon}" width="35" height="32" alt="">
</button>`
).join("")}`;

anchor.appendChild(
wrap
);

function syncIcon(){

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

const closeMenu =
()=>{};

wrap.querySelectorAll(
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

syncIcon();

return {
syncIcon,
closeMenu:
()=>{}
};

}
