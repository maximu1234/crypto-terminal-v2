/**
 * Терминал (desktop): кнопки скриншота графика — копировать / сохранить PNG.
 */

const TF_FILE_LABELS =
{
"1":
"1m",
"5":
"5m",
"15":
"15m",
"60":
"1h",
"240":
"4h",
D:
"D",
W:
"W"
};

const TICKER_BADGE_CLASS =
"chart-snapshot-ticker-badge";
const LOGO_OVERLAY_CLASS =
"chart-snapshot-logo-overlay";
const LOGO_HEIGHT_DIVISOR =
5;
const LOGO_SIZE_SCALE =
0.8;
const LOGO_OPACITY =
0.28;
/** Отступ от левого края ≈ ширина лого (для квадратных). */
const LOGO_OFFSET_LEFT_RATIO =
0.9;
/** Отступ сверху ≈ половина высоты лого. */
const LOGO_OFFSET_TOP_RATIO =
0.5;

function isDesktopSnapshotApi(){

const api =
window.cryptoTerminalDesktop;

return !!(
api?.isDesktop &&
typeof api.chartSnapshotCopy ===
"function" &&
typeof api.chartSnapshotSave ===
"function"
);

}

function captureTargetRect(){

const el =
document.getElementById(
"charts-stack-panes"
);

if(
!el
){
return null;
}

const r =
el.getBoundingClientRect();

return {
x:
Math.round(
r.left
),
y:
Math.round(
r.top
),
width:
Math.round(
r.width
),
height:
Math.round(
r.height
)
};

}

function pad2(
n
){

return String(
n
).padStart(
2,
"0"
);

}

function buildDefaultPngName(
getSymbol,
getTf
){

const rawSym =
typeof getSymbol ===
"function"
? String(
getSymbol() ||
""
).trim()
: "";
const sym =
(rawSym.replace(
/\.P$/i,
""
) ||
"chart").toUpperCase();

const tfRaw =
typeof getTf ===
"function"
? String(
getTf() ||
""
)
: "";
const tf =
TF_FILE_LABELS[
tfRaw
] ||
tfRaw ||
"tf";

const now =
new Date();
const stamp =
`${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;

return `${sym}_${tf}_${stamp}.png`;

}

function buildTickerBadgeText(
opts
){

const sym =
typeof opts.getSymbol ===
"function"
? String(
opts.getSymbol() ||
""
).trim()
: "";
const tfRaw =
typeof opts.getTf ===
"function"
? String(
opts.getTf() ||
""
).trim()
: "";
const tf =
TF_FILE_LABELS[
tfRaw
] ||
tfRaw;
const exchange =
typeof opts.getExchangeName ===
"function"
? String(
opts.getExchangeName() ||
""
).trim()
: "";

const parts =
[
sym,
tf,
exchange
].filter(
Boolean
);

return parts.join(
" - "
);

}

function waitForPaint(){

return new Promise(
resolve=>{
requestAnimationFrame(
()=>{
requestAnimationFrame(
()=>
resolve()
);
}
);
}
);

}

function loadImageDataUrl(
dataUrl
){

return new Promise(
resolve=>{

const img =
new Image();

img.onload =
()=>
resolve(
img
);
img.onerror =
()=>
resolve(
null
);
img.src =
dataUrl;

}
);

}

/**
 * Плашка тикера + опциональный полупрозрачный логотип только на время capturePage.
 * @template T
 * @param {{ getSymbol?: () => string, getTf?: () => string, getExchangeName?: () => string }} opts
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
async function withSnapshotOverlays(
opts,
fn
){

const panes =
document.getElementById(
"charts-stack-panes"
);

if(
!panes
){
return fn();
}

panes.querySelectorAll(
`.${TICKER_BADGE_CLASS}, .${LOGO_OVERLAY_CLASS}`
).forEach(
el=>
el.remove()
);

const text =
buildTickerBadgeText(
opts
);
let badge =
null;

if(
text
){
badge =
document.createElement(
"div"
);
badge.className =
TICKER_BADGE_CLASS;
badge.textContent =
text;
badge.setAttribute(
"aria-hidden",
"true"
);
panes.appendChild(
badge
);
}

let logoEl =
null;
const api =
window.cryptoTerminalDesktop;

try{
if(
typeof api?.chartSnapshotLogoGet ===
"function" &&
typeof api?.chartSnapshotLogoDataUrl ===
"function"
){
const status =
await api.chartSnapshotLogoGet();

if(
status?.enabled &&
status?.hasLogo
){
const data =
await api.chartSnapshotLogoDataUrl();

if(
data?.ok &&
data.dataUrl
){
const img =
await loadImageDataUrl(
data.dataUrl
);

if(
img
){
logoEl =
img;
logoEl.className =
LOGO_OVERLAY_CLASS;
logoEl.alt =
"";
logoEl.setAttribute(
"aria-hidden",
"true"
);
const logoH =
Math.max(
24,
Math.round(
panes.clientHeight /
LOGO_HEIGHT_DIVISOR *
LOGO_SIZE_SCALE
)
);

logoEl.style.height =
`${logoH}px`;
logoEl.style.left =
`${Math.round(logoH * LOGO_OFFSET_LEFT_RATIO)}px`;
logoEl.style.top =
`${Math.round(logoH * LOGO_OFFSET_TOP_RATIO)}px`;
logoEl.style.opacity =
String(
LOGO_OPACITY
);
panes.appendChild(
logoEl
);
}
}
}
}
}catch{
/* ignore logo overlay errors */
}

try{
await waitForPaint();
return await fn();
}finally{
badge?.remove();
logoEl?.remove();
}

}

function setBusy(
wrap,
busy
){

wrap.querySelectorAll(
"button"
).forEach(
btn=>{
btn.disabled =
!!busy;
}
);

}

/**
 * @param {{
 *   getSymbol?: () => string,
 *   getTf?: () => string,
 *   getExchangeName?: () => string
 * }} [opts]
 */
export function mountChartSnapshot(
opts =
{}
){

if(
!isDesktopSnapshotApi()
){
return null;
}

const wrap =
document.getElementById(
"chart-snapshot-wrap"
);
const divider =
document.getElementById(
"chart-snapshot-divider"
);

if(
!wrap
){
return null;
}

divider?.removeAttribute(
"hidden"
);
wrap.removeAttribute(
"hidden"
);

wrap.innerHTML =
`
<button type="button" class="chart-snapshot-btn" id="chart-snapshot-copy-btn" title="Копировать" aria-label="Копировать">
<span class="chart-snapshot-btn-icon chart-snapshot-btn-icon--copy" aria-hidden="true"></span>
</button>
<button type="button" class="chart-snapshot-btn" id="chart-snapshot-save-btn" title="Сохранить PNG" aria-label="Сохранить PNG">
<span class="chart-snapshot-btn-icon chart-snapshot-btn-icon--save" aria-hidden="true"></span>
</button>
`;

const copyBtn =
wrap.querySelector(
"#chart-snapshot-copy-btn"
);
const saveBtn =
wrap.querySelector(
"#chart-snapshot-save-btn"
);
const api =
window.cryptoTerminalDesktop;

async function runCopy(){

setBusy(
wrap,
true
);

try{
await withSnapshotOverlays(
opts,
async ()=>{

const rect =
captureTargetRect();

if(
!rect
){
console.warn(
"chart-snapshot: нет #charts-stack-panes"
);
return;
}

const result =
await api.chartSnapshotCopy(
{
rect
}
);

if(
!result?.ok
){
console.warn(
"chart-snapshot copy:",
result?.error ||
"failed"
);
}

}
);
}catch(
err
){
console.warn(
"chart-snapshot copy:",
err
);
}finally{
setBusy(
wrap,
false
);
}

}

async function runSave(){

setBusy(
wrap,
true
);

try{
await withSnapshotOverlays(
opts,
async ()=>{

const rect =
captureTargetRect();

if(
!rect
){
console.warn(
"chart-snapshot: нет #charts-stack-panes"
);
return;
}

const result =
await api.chartSnapshotSave(
{
rect,
defaultName:
buildDefaultPngName(
opts.getSymbol,
opts.getTf
)
}
);

if(
!result?.ok
){
console.warn(
"chart-snapshot save:",
result?.error ||
"failed"
);
}

}
);
}catch(
err
){
console.warn(
"chart-snapshot save:",
err
);
}finally{
setBusy(
wrap,
false
);
}

}

copyBtn?.addEventListener(
"click",
()=>{
void runCopy();
}
);
saveBtn?.addEventListener(
"click",
()=>{
void runSave();
}
);

return {
destroy(){

wrap.innerHTML =
"";
wrap.setAttribute(
"hidden",
""
);
divider?.setAttribute(
"hidden",
""
);

}
};

}
