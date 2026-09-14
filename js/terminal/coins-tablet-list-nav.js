/**
 * iPad Terminal: list Up/Down buttons vs Positions panel.
 * Both are appended to #list from different async boots — pin a stable order.
 */

export function resolveCoinsTabletListNavSlot(
list
){

if(
!list
){
return null;
}

const pane =
list.querySelector(
".coins-list-pane"
);

if(
pane
){
return {
parent: pane,
before: null
};
}

const split =
list.querySelector(
".trade-book-split-resize"
);

if(
split
){
return {
parent: list,
before: split
};
}

const panel =
list.querySelector(
"#trade-book-panel"
);

if(
panel
){
return {
parent: list,
before: panel
};
}

return {
parent: list,
before: null
};

}

export function placeCoinsTabletListNav(
nav,
list
){

if(
!nav ||
!list
){
return;
}

const slot =
resolveCoinsTabletListNavSlot(
list
);

if(
!slot?.parent
){
return;
}

if(
slot.before
){
slot.parent.insertBefore(
nav,
slot.before
);
return;
}

slot.parent.appendChild(
nav
);

}
