/**
 * Терминал: чеклист анализа у левого тулбара.
 * Локально, не привязан к тикеру, не алго.
 */
const STORAGE_KEY =
"terminal_checklist_v1";
const MIN_ITEMS =
3;
const MAX_ITEMS =
10;

const CHECKLIST_ICON_SVG =
`<svg class="terminal-checklist-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M5 7h3M5 12h3M5 17h3"/>
<path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M11 7h8M11 12h8M11 17h8"/>
</svg>`;

/** @type {{ items: string[], open: boolean }} */
let state =
{
items: [
"",
"",
""
],
open:
false
};

let paneEl =
null;
let btnEl =
null;
let panelEl =
null;
let listEl =
null;
let addBtnEl =
null;
let mounted =
false;

function readStore(){

try{
const raw =
localStorage.getItem(
STORAGE_KEY
);

if(
!raw
){
return;
}

const parsed =
JSON.parse(
raw
);

if(
!parsed ||
typeof parsed !==
"object"
){
return;
}

if(
Array.isArray(
parsed.items
)
){
state.items =
normalizeItems(
parsed.items,
true
);
}

state.open =
!!parsed.open;
}catch{
/* ignore */
}

}

function writeStore(){

try{
localStorage.setItem(
STORAGE_KEY,
JSON.stringify(
{
items:
state.items,
open:
state.open
}
)
);
}catch{
/* ignore */
}

}

/**
 * @param {unknown} raw
 * @param {boolean} dropEmptyExtras
 * @returns {string[]}
 */
function normalizeItems(
raw,
dropEmptyExtras
){

const list =
Array.isArray(
raw
)
? raw.map(
item=>
String(
item ??
""
)
)
: [];

while(
list.length <
MIN_ITEMS
){
list.push(
""
);
}

const head =
list.slice(
0,
MIN_ITEMS
);
const extras =
list.slice(
MIN_ITEMS,
MAX_ITEMS
);
const keptExtras =
dropEmptyExtras
? extras.filter(
item=>
item.trim() !==
""
)
: extras;

return head.concat(
keptExtras
).slice(
0,
MAX_ITEMS
);

}

function compactExtras(){

const next =
normalizeItems(
state.items,
true
);

if(
next.length ===
state.items.length &&
next.every(
(
item,
i
)=>
item ===
state.items[
i
]
)
){
return;
}

state.items =
next;
writeStore();
renderRows();

}

function renderRows(){

if(
!listEl
){
return;
}

listEl.replaceChildren();

state.items.forEach(
(
value,
index
)=>{

const row =
document.createElement(
"label"
);
row.className =
"terminal-checklist-row";

const num =
document.createElement(
"span"
);
num.className =
"terminal-checklist-num";
num.textContent =
`${index + 1}.`;

const input =
document.createElement(
"input"
);
input.type =
"text";
input.className =
"terminal-checklist-input";
input.value =
value;
input.setAttribute(
"aria-label",
`Пункт ${index + 1}`
);
input.addEventListener(
"input",
()=>{
state.items[
index
] =
input.value;
writeStore();
}
);

row.append(
num,
input
);
listEl.append(
row
);

}
);

if(
addBtnEl
){
addBtnEl.hidden =
state.items.length >=
MAX_ITEMS;
}

}

function setOpen(
open
){

if(
!open
){
state.items =
normalizeItems(
state.items,
true
);
}

state.open =
!!open;
writeStore();
renderRows();

if(
panelEl
){
panelEl.hidden =
!state.open;
}

if(
btnEl
){
btnEl.classList.toggle(
"active",
state.open
);
btnEl.setAttribute(
"aria-expanded",
state.open
? "true"
: "false"
);
}

}

function addItem(){

if(
state.items.length >=
MAX_ITEMS
){
return;
}

state.items =
state.items.concat(
""
);
writeStore();
renderRows();
setOpen(
true
);

const inputs =
listEl?.querySelectorAll(
"input"
);
const last =
inputs?.[
inputs.length -
1
];
last?.focus();

}

function onToggle(
event
){

event.preventDefault();
event.stopPropagation();
setOpen(
!state.open
);

}

export function mountTerminalChecklist(){

if(
mounted
){
return;
}

const toolbar =
document.getElementById(
"draw-toolbar"
);
paneEl =
toolbar?.closest(
".coins-chart-pane"
);

if(
!toolbar ||
!paneEl
){
return;
}

mounted =
true;
readStore();

btnEl =
document.createElement(
"button"
);
btnEl.type =
"button";
btnEl.className =
"draw-btn terminal-checklist-btn";
btnEl.title =
"Чеклист";
btnEl.setAttribute(
"aria-label",
"Чеклист"
);
btnEl.setAttribute(
"aria-expanded",
"false"
);
btnEl.setAttribute(
"aria-controls",
"terminal-checklist-panel"
);
btnEl.innerHTML =
CHECKLIST_ICON_SVG;
btnEl.addEventListener(
"pointerdown",
event=>{
event.stopPropagation();
}
);
btnEl.addEventListener(
"click",
onToggle
);
toolbar.append(
btnEl
);

panelEl =
document.createElement(
"div"
);
panelEl.id =
"terminal-checklist-panel";
panelEl.className =
"terminal-checklist-panel";
panelEl.hidden =
true;

const head =
document.createElement(
"div"
);
head.className =
"terminal-checklist-head";

const title =
document.createElement(
"h2"
);
title.className =
"terminal-checklist-title";
title.textContent =
"Чеклист";

const closeBtn =
document.createElement(
"button"
);
closeBtn.type =
"button";
closeBtn.className =
"terminal-checklist-close";
closeBtn.title =
"Закрыть";
closeBtn.setAttribute(
"aria-label",
"Закрыть чеклист"
);
closeBtn.textContent =
"×";
closeBtn.addEventListener(
"click",
()=>
setOpen(
false
)
);

head.append(
title,
closeBtn
);

listEl =
document.createElement(
"div"
);
listEl.className =
"terminal-checklist-list";

addBtnEl =
document.createElement(
"button"
);
addBtnEl.type =
"button";
addBtnEl.className =
"terminal-checklist-add";
addBtnEl.title =
"Добавить пункт";
addBtnEl.setAttribute(
"aria-label",
"Добавить пункт"
);
addBtnEl.textContent =
"+";
addBtnEl.addEventListener(
"click",
addItem
);

panelEl.append(
head,
listEl,
addBtnEl
);
panelEl.addEventListener(
"focusout",
event=>{

if(
panelEl.contains(
event.relatedTarget
)
){
return;
}

compactExtras();

}
);
paneEl.append(
panelEl
);

renderRows();
setOpen(
state.open
);

}
