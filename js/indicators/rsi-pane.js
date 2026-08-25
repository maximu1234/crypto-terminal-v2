/**
 * RSI — панель под графиком; не учитывается в лимите индикаторов.
 * Настройки: период, перекупленность / перепроданность, таймфрейм (как Supertrend).
 */
import {
formatHtfTfLegend,
htfTfSelectHtml,
normalizeHtfTf
} from "./htf-project.js?v=5";

export const RSI_PANE_ID =
"rsi";

export function defaultRsiPaneSettings(){

return {
period:
14,
overbought:
70,
oversold:
30,
tf:
""
};

}

function clampInt(
value,
min,
max,
fallback
){

const n =
Math.round(
Number(
value
)
);

if(
!Number.isFinite(
n
)
){
return fallback;
}

return Math.min(
max,
Math.max(
min,
n
)
);

}

export function normalizeRsiPaneSettings(
raw
){

const base =
defaultRsiPaneSettings();
const next =
{
period:
clampInt(
raw?.period,
2,
999,
base.period
),
overbought:
clampInt(
raw?.overbought,
1,
99,
base.overbought
),
oversold:
clampInt(
raw?.oversold,
1,
99,
base.oversold
),
tf:
normalizeHtfTf(
raw?.tf
)
};

if(
next.oversold >=
next.overbought
){
next.oversold =
Math.max(
1,
next.overbought -
1
);
}

return next;

}

export function createRsiPaneIndicator(
getHost,
settingsStore
){

let enabled =
false;
let settings =
defaultRsiPaneSettings();

function readSettings(){

settings =
normalizeRsiPaneSettings(
settingsStore?.read?.(
RSI_PANE_ID,
defaultRsiPaneSettings()
) ||
defaultRsiPaneSettings()
);

}

function persistSettings(
patch
){

settings =
normalizeRsiPaneSettings(
settingsStore?.write?.(
RSI_PANE_ID,
patch
) ||
patch
);

}

function notifyHost(){

getHost?.()?.onRsiSettingsChange?.(
{
...settings
}
);

}

function getLegendText(){

return `RSI ${settings.period} close${formatHtfTfLegend(
settings.tf
)}`;

}

function wrapEl(){

return document.getElementById(
"rsi-wrap"
);

}

function applyVisibility(){

const wrap =
wrapEl();

wrap?.classList.toggle(
"indicator-pane-hidden",
!enabled
);

getHost?.()?.setRsiPaneActive?.(
enabled
);

}

function enable(){

if(
enabled
){
return;
}

readSettings();
enabled =
true;
applyVisibility();
notifyHost();

}

function disable(){

enabled =
false;
applyVisibility();

}

function applySettings(
stored
){

settings =
normalizeRsiPaneSettings(
stored ||
settings
);
notifyHost();

}

function syncViewport(
ctx
){

if(
!enabled
){
return;
}

const chart =
getHost?.()?.rsiChart;

if(
!chart ||
!ctx?.mainChart
){
return;
}

const {
applyCoinsChartViewport
} =
ctx;

applyCoinsChartViewport?.(
ctx.mainChart,
chart,
ctx.candles,
ctx.tf,
ctx.chartWidth,
ctx.realCandleCount,
ctx.visibleBarsCap
);

getHost?.()?.layoutRsiBand?.();

}

function onResize(
width
){

if(
!enabled
){
return;
}

const chart =
getHost?.()?.rsiChart;

const paneHeight =
wrapEl()?.getBoundingClientRect().height ||
0;

if(
!chart ||
paneHeight <
2
){
return;
}

chart.applyOptions(
{
width,
height:
paneHeight
}
);

getHost?.()?.layoutRsiBand?.();

}

function populateSettingsDialog(
root
){

readSettings();

root.innerHTML =
`
<div class="ind-rsi-settings">
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Длина</span>
<input type="number" class="chart-indicator-settings-input" min="2" max="999" step="1" data-key="period" value="${settings.period}" inputmode="numeric"/>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Перекупленность</span>
<input type="number" class="chart-indicator-settings-input" min="1" max="99" step="1" data-key="overbought" value="${settings.overbought}" inputmode="numeric"/>
</label>
<label class="chart-indicator-settings-field">
<span class="chart-indicator-settings-field-label">Перепроданность</span>
<input type="number" class="chart-indicator-settings-input" min="1" max="99" step="1" data-key="oversold" value="${settings.oversold}" inputmode="numeric"/>
</label>
${htfTfSelectHtml(
settings.tf
)}
</div>
<div class="chart-indicator-settings-reset-row">
<button type="button" class="chart-indicator-settings-reset">Сбросить в дефолт</button>
</div>
`;

function commit(){

const next =
{
...settings
};

root.querySelectorAll(
"[data-key]"
).forEach(
el=>{

const key =
el.dataset.key;

if(
el.tagName ===
"SELECT"
){
next[
key
] =
el.value;
return;
}

const n =
Number(
el.value
);

if(
Number.isFinite(
n
)
){
next[
key
] =
n;
}

}
);

persistSettings(
next
);
applySettings(
settings
);

}

root.querySelectorAll(
"input, select"
).forEach(
el=>{
el.addEventListener(
"change",
commit
);
}
);

root.querySelector(
".chart-indicator-settings-reset"
)?.addEventListener(
"click",
()=>{

persistSettings(
defaultRsiPaneSettings()
);
applySettings(
settings
);
populateSettingsDialog(
root
);

}
);

}

return {
id:
RSI_PANE_ID,
label:
"RSI",
legendLabel:
"RSI 14 close",
settingsDialogTitle:
"RSI",
settingsDialogClass:
"chart-indicator-settings-dialog--compact",
exemptFromLimit:
true,
defaultEnabled:
true,
supportsSettingsDialog:
true,
getLegendLabel:
getLegendText,
getSettings:()=>
({
...settings
}),
populateSettingsDialog,
applySettings,
enable,
disable,
isEnabled:()=>
enabled,
getChart:()=>
enabled
? getHost?.()?.rsiChart
: null,
syncViewport,
onResize,
destroy:()=>{
disable();
}
};

}
