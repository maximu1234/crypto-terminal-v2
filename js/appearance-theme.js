/**
 * Цвета интерфейса. В localStorage лежат только отличия от дефолта.
 */
export const APPEARANCE_STORAGE_KEY =
"appearance-theme-v1";

export const APPEARANCE_EVENT =
"appearance-theme-changed";

export const APPEARANCE_FIELDS =
Object.freeze([
{
group: "Фоны",
id: "appBg",
label: "Сайт и шапка",
css: "--app-bg",
fallback: "#16181f"
},
{
group: "Фоны",
id: "chartBg",
label: "График",
css: "--app-chart-bg",
fallback: "#141721"
},
{
group: "Фоны",
id: "widgetBg",
label: "Виджет на Вотчлисте",
css: "--appearance-widget-bg",
fallback: "#16181f"
},
{
group: "Фоны",
id: "screenerWidgetBg",
label: "Виджет на Скринере",
css: "--appearance-screener-widget-bg",
fallback: "#141721"
},
{
group: "Фоны",
id: "widgetHeaderBg",
label: "Шапка виджета",
css: "--appearance-widget-header",
fallback: "#13181e"
},
{
group: "Фоны",
id: "terminalPanelBg",
label: "Панели Терминала",
css: "--appearance-terminal-panel",
fallback: "#0f0f0f"
},
{
group: "Фоны",
id: "terminalSeparator",
label: "Разделитель блоков Терминала",
css: "--appearance-terminal-separator",
fallback: "#2e2e30"
},
{
group: "Фоны",
id: "widgetBorder",
label: "Рамка виджета",
css: "--appearance-widget-border",
fallback: "#1f2937"
},
{
group: "Фоны",
id: "inputBg",
label: "Поле ввода",
css: "--app-input",
fallback: "#171b21"
},
{
group: "Текст",
id: "text",
label: "Основной",
css: "--appearance-text",
fallback: "#e5e7eb"
},
{
group: "Текст",
id: "muted",
label: "Приглушённый и меню",
css: "--appearance-muted",
fallback: "#9ca3af"
},
{
group: "Текст",
id: "scaleText",
label: "Подписи шкалы",
css: "--appearance-scale-text",
fallback: "#d1d5db"
},
{
group: "Свечи",
id: "candleUp",
label: "Растущая",
css: "--appearance-candle-up",
fallback: "#459782"
},
{
group: "Свечи",
id: "candleDown",
label: "Падающая",
css: "--appearance-candle-down",
fallback: "#ef4444"
},
{
group: "Плашка цены",
id: "priceHudUp",
label: "Рост",
css: "--appearance-price-hud-up",
fallback: "#16a34a"
},
{
group: "Плашка цены",
id: "priceHudDown",
label: "Падение",
css: "--appearance-price-hud-down",
fallback: "#dc2626"
},
{
group: "Плашка цены",
id: "priceHudText",
label: "Цифры",
css: "--appearance-price-hud-text",
fallback: "#d1d5db"
},
{
group: "Изменение",
id: "coinChangeUp",
label: "Плюс в списке Терминала",
css: "--appearance-coin-up",
fallback: "#459782"
},
{
group: "Изменение",
id: "coinChangeDown",
label: "Минус в списке Терминала",
css: "--appearance-coin-down",
fallback: "#ef4444"
},
{
group: "Изменение",
id: "changeUp",
label: "Плюс",
css: "--appearance-change-up",
fallback: "#22c55e"
},
{
group: "Изменение",
id: "changeDown",
label: "Минус",
css: "--appearance-change-down",
fallback: "#ef4444"
},
{
group: "Прочее",
id: "toolActive",
label: "Выбранный инструмент",
css: "--appearance-tool-active",
fallback: "#363a45"
},
{
group: "Прочее",
id: "lineColor",
label: "Линия графика",
css: "--appearance-line",
fallback: "#5b9cf6"
}
]);

const FIELD_BY_ID =
new Map(
APPEARANCE_FIELDS.map(
field=>[
field.id,
field
]
)
);

export function normalizeAppearanceHex(
raw
){

const hex =
String(raw || "")
.trim()
.toLowerCase();

return /^#[0-9a-f]{6}$/.test(hex)
? hex
: "";

}

export function readAppearanceOverrides(){

try{
const raw =
localStorage.getItem(
APPEARANCE_STORAGE_KEY
);

if(!raw){
return {};
}

const parsed =
JSON.parse(raw);

if(
!parsed ||
typeof parsed !== "object"
){
return {};
}

const out = {};

for(const field of APPEARANCE_FIELDS){
const hex =
normalizeAppearanceHex(
parsed[field.id]
);

if(hex && hex !== field.fallback){
out[field.id] = hex;
}
}

return out;
}catch{
return {};
}

}

export function appearanceTheme(
overrides =
readAppearanceOverrides()
){

const theme = {};

for(const field of APPEARANCE_FIELDS){
theme[field.id] =
overrides[field.id] ||
field.fallback;
}

return theme;

}

export function appearanceColor(
id
){

const field =
FIELD_BY_ID.get(id);

if(!field){
return "";
}

return appearanceTheme()[id] ||
field.fallback;

}

export function appearanceHasOverrides(){

return Object.keys(
readAppearanceOverrides()
).length > 0;

}

function writeOverrides(
overrides
){

try{
if(
!overrides ||
!Object.keys(overrides).length
){
localStorage.removeItem(
APPEARANCE_STORAGE_KEY
);
return;
}

localStorage.setItem(
APPEARANCE_STORAGE_KEY,
JSON.stringify(overrides)
);
}catch{
/* ignore quota / private mode */
}

}

export function applyAppearanceTheme(
theme =
appearanceTheme()
){

if(
typeof document === "undefined" ||
typeof document.documentElement?.style?.setProperty !==
"function"
){
return theme;
}

const root =
document.documentElement;

for(const field of APPEARANCE_FIELDS){
root.style.setProperty(
field.css,
theme[field.id] || field.fallback
);
}

return theme;

}

function publish(
previous,
theme
){

applyAppearanceTheme(theme);

if(typeof window === "undefined"){
return;
}

window.dispatchEvent(
new CustomEvent(
APPEARANCE_EVENT,
{
detail:{
previous,
theme
}
}
)
);

}

export function setAppearanceColor(
id,
raw
){

const field =
FIELD_BY_ID.get(id);
const hex =
normalizeAppearanceHex(raw);

if(!field || !hex){
return appearanceTheme();
}

const previous =
appearanceTheme();
const overrides =
readAppearanceOverrides();

if(hex === field.fallback){
delete overrides[id];
}else{
overrides[id] = hex;
}

writeOverrides(overrides);
const theme =
appearanceTheme(overrides);
publish(previous, theme);
return theme;

}

export function resetAppearanceTheme(){

const previous =
appearanceTheme();

writeOverrides({});
const theme =
appearanceTheme({});
publish(previous, theme);
return theme;

}

if(typeof document !== "undefined"){
applyAppearanceTheme();
}
