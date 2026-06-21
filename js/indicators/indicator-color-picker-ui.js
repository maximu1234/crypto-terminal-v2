/**
 * Общий popover палитры (обёртка над mountTvColorPicker).
 */
import {
mountTvColorPicker,
parseDrawColor
} from "../draw-color-palette.js?v=6";

let portal =
null;
let onOutsidePointerDown =
null;

function ensurePortal(){

if(
portal
){
return portal;
}

portal =
document.createElement(
"div"
);
portal.className =
"draw-popover tv-color-popover ind-settings-color-popover hidden";
document.body.appendChild(
portal
);
return portal;

}

export function closeIndicatorColorPicker(){

if(
onOutsidePointerDown
){
document.removeEventListener(
"pointerdown",
onOutsidePointerDown,
true
);
onOutsidePointerDown =
null;
}

if(
!portal
){
return;
}

portal.classList.add(
"hidden"
);
portal.innerHTML =
"";

}

export function openIndicatorColorPicker(
{
anchorEl,
color,
onChange,
onSelect
}
){

if(
!anchorEl
){
return;
}

closeIndicatorColorPicker();

const pop =
ensurePortal();

mountTvColorPicker(
pop,
{
activeColor:
color,
activeOpacity:
100,
onChange,
onSelect:(
next
)=>{
onSelect?.(
next
);
closeIndicatorColorPicker();
}
}
);

pop.classList.remove(
"hidden"
);

const rect =
anchorEl.getBoundingClientRect();
const maxTop =
Math.max(
8,
window.innerHeight -
280
);

pop.style.position =
"fixed";
pop.style.left =
`${Math.round(
Math.min(
rect.left,
window.innerWidth -
240
)
)}px`;
pop.style.top =
`${Math.round(
Math.min(
rect.bottom +
4,
maxTop
)
)}px`;
pop.style.zIndex =
"16000";

onOutsidePointerDown =
event=>{

if(
pop.contains(
event.target
) ||
anchorEl.contains(
event.target
)
){
return;
}

closeIndicatorColorPicker();

};

window.setTimeout(
()=>{
document.addEventListener(
"pointerdown",
onOutsidePointerDown,
true
);
},
0
);

}

export function previewColorHex(
raw
){

const parsed =
parseDrawColor(
raw
);

return parsed?.hex ||
String(
raw ||
"#2196f3"
);

}

export function isValidDrawColor(
raw
){

return !!parseDrawColor(
raw
);

}
