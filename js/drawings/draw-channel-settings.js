/**
 * Parallel Channel levels panel (checkbox + ratio + color), Fib Channel–style.
 */
import {
formatFibInputValue,
parseFibRatioField,
normalizeFibLevelColor
} from "./fib-spec.js?v=15";

import {
setFibLevelColorButton
} from "./draw-fib-settings.js?v=1";

import {
CHANNEL_DEFAULT_COLOR,
DEFAULT_CHANNEL_LEVEL_SPEC,
cloneDefaultChannelRows,
ensureChannelLevelsVisible
} from "./channel-spec.js?v=1";

export function channelSettingsHtml(){

return `
<div class="channel-settings">
<div class="fib-levels-grid channel-levels-grid" id="channel-level-rows-root"></div>
</div>
`;

}

export function mountChannelLevelRows(
root
){

const grid =
root?.querySelector(
"#channel-level-rows-root"
);

if(
!grid
){
return;
}

grid.innerHTML =
"";

DEFAULT_CHANNEL_LEVEL_SPEC.forEach(
(
spec,
i
)=>{

const row =
document.createElement(
"div"
);

row.className =
"fib-level-row channel-level-row";
row.dataset.channelIndex =
String(
i
);

row.innerHTML =
`
<input type="checkbox" class="fib-level-on channel-level-on"/>
<input type="text" class="fib-level-val channel-level-val" autocomplete="off" spellcheck="false"/>
<button type="button" class="fib-level-color-btn channel-level-color-btn" title="Цвет линии" aria-label="Цвет линии"></button>
`;

const on =
row.querySelector(
".channel-level-on"
);
const val =
row.querySelector(
".channel-level-val"
);
const colorBtn =
row.querySelector(
".channel-level-color-btn"
);

if(
on
){
on.checked =
!!spec.enabled;
}

if(
val
){
val.value =
formatFibInputValue(
spec.v
);
}

setFibLevelColorButton(
colorBtn,
null,
CHANNEL_DEFAULT_COLOR
);

grid.appendChild(
row
);

}
);

}

export function fillChannelSettingsPanel(
root,
channelLevels,
fallbackColor
){

if(
!root
){
return;
}

const rows =
ensureChannelLevelsVisible(
channelLevels
);
const baseColor =
normalizeFibLevelColor(
fallbackColor
) ||
CHANNEL_DEFAULT_COLOR;

root.querySelectorAll(
".channel-level-row"
).forEach(
(
row,
i
)=>{

const spec =
rows[
i
] ||
DEFAULT_CHANNEL_LEVEL_SPEC[
i
];
const on =
row.querySelector(
".channel-level-on"
);
const val =
row.querySelector(
".channel-level-val"
);
const colorBtn =
row.querySelector(
".channel-level-color-btn"
);

if(
on
){
on.checked =
!!spec.enabled;
}

if(
val
){
val.value =
formatFibInputValue(
Number.isFinite(
spec.v
)
? spec.v
: DEFAULT_CHANNEL_LEVEL_SPEC[
i
]?.v ??
0
);
}

setFibLevelColorButton(
colorBtn,
normalizeFibLevelColor(
spec.color
),
baseColor
);

}
);

}

export function readChannelSettingsPanel(
root
){

const template =
cloneDefaultChannelRows();

if(
!root
){
return {
channelLevels:
template
};
}

root.querySelectorAll(
".channel-level-row"
).forEach(
(
row,
i
)=>{

if(
i >=
template.length
){
return;
}

const valInp =
row.querySelector(
".channel-level-val"
);
const chk =
row.querySelector(
".channel-level-on"
);
const colorBtn =
row.querySelector(
".channel-level-color-btn"
);
const parsed =
parseFibRatioField(
valInp?.value
);

template[
i
].v =
parsed !=
null
? parsed
: DEFAULT_CHANNEL_LEVEL_SPEC[
i
].v;
template[
i
].enabled =
!!chk?.checked;

const levelColor =
normalizeFibLevelColor(
colorBtn?.dataset.customColor
);

if(
levelColor
){
template[
i
].color =
levelColor;
}else{
delete template[
i
].color;
}

}
);

return {
channelLevels:
ensureChannelLevelsVisible(
template
)
};

}

export function bindChannelSettingsPanel(
root,
{
getAlive,
canApply,
getChannelEditShape,
openColorMenu,
scheduleImmediate,
scheduleDebounced,
signal
}
){

if(
!root
){
return;
}

root.addEventListener(
"mousedown",
e=>{

if(
!getAlive?.()
){
return;
}

const colorBtn =
e.target.closest(
".channel-level-color-btn"
);

if(
!colorBtn
){
return;
}

e.preventDefault();
e.stopPropagation();

const shape =
getChannelEditShape?.();
const fallback =
shape?.color ||
CHANNEL_DEFAULT_COLOR;

openColorMenu?.(
colorBtn,
fallback
);

},
{
capture: true,
signal
}
);

root.addEventListener(
"change",
e=>{

if(
!canApply?.()
){
return;
}

if(
e.target?.classList.contains(
"channel-level-on"
)
){
scheduleImmediate?.();
}

},
{
signal
}
);

root.addEventListener(
"input",
e=>{

if(
!canApply?.()
){
return;
}

if(
e.target?.classList.contains(
"channel-level-val"
)
){
scheduleDebounced?.();
}

},
{
signal
}
);

}
