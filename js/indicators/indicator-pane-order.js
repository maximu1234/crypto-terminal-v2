/** Порядок панелей снизу вверх. Шкала времени живёт на графике цены, не на индикаторе. */
export const INDICATOR_PANE_STACK_BOTTOM_FIRST =
[
"rsi",
"ao",
"macd",
"volume"
];

export function isBottomIndicatorPane(
paneId
){

for(
const id of INDICATOR_PANE_STACK_BOTTOM_FIRST
){

const wrap =
document.getElementById(
`${id}-wrap`
);

if(
wrap &&
!wrap.classList.contains(
"indicator-pane-hidden"
)
){
return id ===
paneId;
}

}

return false;

}
