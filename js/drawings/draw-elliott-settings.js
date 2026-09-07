/**
 * Elliott Waves settings: Degree + Wave visibility.
 */
import {
ELLIOTT_DEGREES,
ELLIOTT_DEFAULT_DEGREE,
createElliottToolDefaults,
normalizeElliottDegree
} from "./elliott-spec.js?v=5";

export function elliottSettingsHtml(){

const options =
ELLIOTT_DEGREES.map(
row=>
`<option value="${row.id}">${row.title}</option>`
).join(
""
);

return `
<div class="elliott-settings">
<label class="elliott-wave-row">
<input type="checkbox" class="elliott-wave-on"/>
<span>Wave</span>
</label>
<label class="popover-label elliott-degree-label">Degree</label>
<select class="elliott-degree" autocomplete="off">
${options}
</select>
</div>
`;

}

export function fillElliottSettingsPanel(
root,
shape
){

if(
!root
){
return;
}

const defaults =
createElliottToolDefaults();
const waveOn =
root.querySelector(
".elliott-wave-on"
);
const degree =
root.querySelector(
".elliott-degree"
);

if(
waveOn
){
waveOn.checked =
shape?.showWave !==
false;
}

if(
degree
){
degree.value =
normalizeElliottDegree(
shape?.degree ||
defaults.degree ||
ELLIOTT_DEFAULT_DEGREE
);
}

}

export function readElliottSettingsPanel(
root
){

const defaults =
createElliottToolDefaults();

if(
!root
){
return defaults;
}

const waveOn =
root.querySelector(
".elliott-wave-on"
);
const degree =
root.querySelector(
".elliott-degree"
);

return {
degree:
normalizeElliottDegree(
degree?.value
),
showWave:
waveOn
? !!waveOn.checked
: true
};

}

export function bindElliottSettingsPanel(
root,
{
canApply,
onApply,
signal
} =
{}
){

if(
!root
){
return;
}

const opts =
{
signal
};

const commit =
()=>{

if(
canApply &&
!canApply()
){
return;
}

onApply?.();

};

root.querySelector(
".elliott-wave-on"
)?.addEventListener(
"change",
commit,
opts
);

root.querySelector(
".elliott-degree"
)?.addEventListener(
"change",
commit,
opts
);

}
