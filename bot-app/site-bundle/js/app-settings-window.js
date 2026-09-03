/**
 * Окно «Настройки» — sidebar: Системные / Синхронизация / … / Горячие клавиши / Секретные.
 */
import {
cssUrl
} from "./asset-manifest.js?v=8";

import {
isSystemAdminUser
} from "./system-admin-access.js?v=3";

import {
mountTelegramSettingsPanel
} from "./telegram-settings-panel.js?v=2";

import {
mountFavoritesCloudSettingsPanel
} from "./favorites-settings-panel.js?v=1";

const SECTIONS =
[
{
id:
"system",
label:
"Системные"
},
{
id:
"sync",
label:
"Синхронизация"
},
{
id:
"connections",
label:
"Подключения",
desktopOnly:
true
},
{
id:
"proxy",
label:
"Прокси",
desktopOnly:
true
},
{
id:
"trading",
label:
"Торговля",
desktopOnly:
true
},
{
id:
"hotkeys",
label:
"Горячие клавиши"
},
{
id:
"secret",
label:
"Секретные настройки",
adminOnly:
true
}
];

let overlayEl =
null;
let activeSection =
"sync";
let telegramCtl =
null;
let favoritesCloudCtl =
null;
let systemCtl =
null;
let bybitCtl =
null;
let tradingCtl =
null;
let cssLoaded =
false;
let adminNavVisible =
false;

function showConnectionsSettings(){

return !!window.cryptoTerminalDesktop?.isDesktop;

}

function showSystemSettings(){

return true;

}

function ensureCss(){

if(
cssLoaded
){
return;
}

cssLoaded =
true;

const href =
cssUrl(
"app-settings-window.css"
);

if(
!document.querySelector(
`link[rel="stylesheet"][href^="/css/app-settings-window.css"]`
)
){
const link =
document.createElement(
"link"
);
link.rel =
"stylesheet";
link.href =
href;
document.head.appendChild(
link
);
}

}

function ensureSystemAdminCss(){

const href =
cssUrl(
"system-admin.css"
);

if(
!document.querySelector(
`link[rel="stylesheet"][href^="/css/system-admin.css"]`
)
){
const link =
document.createElement(
"link"
);
link.rel =
"stylesheet";
link.href =
href;
document.head.appendChild(
link
);
}

}

function renameAccountSectionTitles(){

document.querySelectorAll(
".header-settings-section-title"
).forEach(
el=>{

if(
el.textContent.trim() ===
"Синхронизация"
){
el.textContent =
"Аккаунт";
}

}
);

}

function findMenuHost(){

return document.getElementById(
"header-settings-dropdown"
);

}

function mountMenuEntry(){

const host =
findMenuHost();

if(
!host ||
document.getElementById(
"app-settings-menu-wrap"
)
){
return;
}

const wrap =
document.createElement(
"div"
);
wrap.id =
"app-settings-menu-wrap";
wrap.className =
"app-settings-menu-wrap";

wrap.innerHTML =
`
<button type="button" class="header-settings-nav-item header-settings-menu-btn app-settings-menu-btn" id="app-settings-menu-btn" aria-haspopup="dialog">Настройки</button>
`;

const diaryLink =
host.querySelector(
"#trade-diary-nav-link"
);

if(
diaryLink
){
host.insertBefore(
wrap,
diaryLink
);
}else{
host.appendChild(
wrap
);
}

wrap.querySelector(
"#app-settings-menu-btn"
)?.addEventListener(
"click",
event=>{
event.preventDefault();
event.stopPropagation();
void (
async()=>{
const {
closeCloudSettingsDropdown
} =
await import(
"./auth-ui.js?v=62"
);
closeCloudSettingsDropdown();
await openAppSettingsWindow();
}
)();
}
);

}

function buildOverlay(){

if(
overlayEl
){
return overlayEl;
}

overlayEl =
document.createElement(
"div"
);
overlayEl.id =
"app-settings-overlay";
overlayEl.className =
"app-settings-overlay hidden";

overlayEl.innerHTML =
`
<div class="app-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="app-settings-title">
<header class="app-settings-head">
<h2 id="app-settings-title">Настройки</h2>
<button type="button" class="app-settings-close" aria-label="Закрыть">×</button>
</header>
<div class="app-settings-body">
<nav class="app-settings-nav" aria-label="Разделы настроек" id="app-settings-nav"></nav>
<div class="app-settings-panels" id="app-settings-panels"></div>
</div>
</div>
`;

document.body.appendChild(
overlayEl
);

const nav =
overlayEl.querySelector(
"#app-settings-nav"
);
const panels =
overlayEl.querySelector(
"#app-settings-panels"
);

for(
const section of
SECTIONS
){

const btn =
document.createElement(
"button"
);
btn.type =
"button";
btn.className =
"app-settings-nav-btn";
btn.dataset.section =
section.id;
btn.textContent =
section.label;

if(
section.desktopOnly
){
btn.hidden =
!showConnectionsSettings();
}

if(
section.adminOnly
){
btn.hidden =
true;
btn.dataset.adminOnly =
"1";
}

btn.addEventListener(
"click",
()=>{
void setActiveSection(
section.id
);
}
);

nav.appendChild(
btn
);

const panel =
document.createElement(
"div"
);
panel.className =
"app-settings-panel";
panel.dataset.panel =
section.id;
panel.id =
`app-settings-panel-${section.id}`;

panels.appendChild(
panel
);

}

overlayEl.querySelector(
".app-settings-close"
)?.addEventListener(
"click",
closeAppSettingsWindow
);

overlayEl.addEventListener(
"click",
event=>{

if(
event.target ===
overlayEl
){
closeAppSettingsWindow();
}

}
);

document.addEventListener(
"keydown",
event=>{

if(
event.key !==
"Escape" ||
!overlayEl ||
overlayEl.classList.contains(
"hidden"
)
){
return;
}

closeAppSettingsWindow();

}
);

return overlayEl;

}

async function mountSectionPanel(
sectionId
){

const panel =
document.getElementById(
`app-settings-panel-${sectionId}`
);

if(
!panel ||
panel.dataset.mounted ===
"1"
){
return;
}

panel.dataset.mounted =
"1";

if(
sectionId ===
"system"
){

const {
mountSystemSettingsPanel
} =
await import(
"./app-settings-system-panel.js?v=18"
);

systemCtl =
mountSystemSettingsPanel(
panel
);
return;

}

if(
sectionId ===
"sync"
){

const cloudAuthHost =
document.createElement(
"div"
);
cloudAuthHost.className =
"app-settings-sync-block app-settings-sync-block--account";
cloudAuthHost.id =
"app-settings-cloud-auth-host";
panel.appendChild(
cloudAuthHost
);

const telegramHost =
document.createElement(
"div"
);
telegramHost.className =
"app-settings-sync-block";
panel.appendChild(
telegramHost
);

telegramCtl =
mountTelegramSettingsPanel(
telegramHost
);

const {
mountCloudAuthPanelInSettings
} =
await import(
"./auth-ui.js?v=62"
);

mountCloudAuthPanelInSettings(
cloudAuthHost
);

const favoritesHost =
document.createElement(
"div"
);
favoritesHost.className =
"app-settings-sync-block app-settings-sync-block--favorites";
panel.appendChild(
favoritesHost
);

favoritesCloudCtl =
mountFavoritesCloudSettingsPanel(
favoritesHost
);
return;

}

if(
sectionId ===
"connections"
){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
panel.innerHTML =
`<p class="app-settings-bybit-guest">Подключение Bybit доступно в desktop-приложении Multichart.</p>`;
return;
}

const tradeCss =
cssUrl(
"trade-exchange-settings.css"
);

if(
!document.querySelector(
`link[rel="stylesheet"][href^="/css/trade-exchange-settings.css"]`
)
){
const link =
document.createElement(
"link"
);
link.rel =
"stylesheet";
link.href =
tradeCss;
document.head.appendChild(
link
);
}

const {
mountExchangeConnectionsPanel,
updateTradeExchangeConnectionChrome
} =
await import(
"./trade-exchange-settings.js?v=23"
);

const host =
document.createElement(
"div"
);
host.className =
"app-settings-bybit-host";
panel.appendChild(
host
);

bybitCtl =
mountExchangeConnectionsPanel(
host,
{
onSaved:
updateTradeExchangeConnectionChrome
}
);

void bybitCtl?.refreshPing?.();
return;

}

if(
sectionId ===
"proxy"
){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
panel.innerHTML =
`<p class="app-settings-bybit-guest">Прокси доступен в desktop-приложении Multichart.</p>`;
return;
}

const {
mountProxySettingsPanel
} =
await import(
"./app-settings-proxy-panel.js?v=6"
);

mountProxySettingsPanel(
panel
);
return;

}

if(
sectionId ===
"trading"
){

if(
!window.cryptoTerminalDesktop?.isDesktop
){
panel.innerHTML =
`<p class="app-settings-bybit-guest">Торговые настройки доступны в desktop-приложении Multichart.</p>`;
return;
}

const tradeCss =
cssUrl(
"trade-exchange-settings.css"
);

if(
!document.querySelector(
`link[rel="stylesheet"][href^="/css/trade-exchange-settings.css"]`
)
){
const link =
document.createElement(
"link"
);
link.rel =
"stylesheet";
link.href =
tradeCss;
document.head.appendChild(
link
);
}

const {
mountTradingSettingsPanel
} =
await import(
"./trade-trading-settings-panel.js?v=3"
);

const host =
document.createElement(
"div"
);
host.className =
"app-settings-trading-host";
panel.appendChild(
host
);

await mountTradingSettingsPanel(
host
);
return;

}

if(
sectionId ===
"hotkeys"
){

const {
mountHotkeysSettingsPanel
} =
await import(
"./app-settings-hotkeys-panel.js?v=3"
);

mountHotkeysSettingsPanel(
panel
);
return;

}

if(
sectionId ===
"secret"
){

ensureSystemAdminCss();

const {
mountSecretSettingsPanel
} =
await import(
"./app-settings-secret.js?v=8"
);

await mountSecretSettingsPanel(
panel
);

}

}

async function setActiveSection(
sectionId
){

activeSection =
sectionId;

const overlay =
buildOverlay();

overlay.querySelectorAll(
".app-settings-nav-btn"
).forEach(
btn=>{
btn.classList.toggle(
"is-active",
btn.dataset.section ===
sectionId
);
}
);

overlay.querySelectorAll(
".app-settings-panel"
).forEach(
panel=>{
panel.classList.toggle(
"is-active",
panel.dataset.panel ===
sectionId
);
}
);

await mountSectionPanel(
sectionId
);

if(
sectionId ===
"system"
){
systemCtl?.refresh?.();
}

if(
sectionId ===
"sync"
){
telegramCtl?.refresh?.();
favoritesCloudCtl?.refresh?.();
}

if(
sectionId ===
"connections"
){
bybitCtl?.refreshPing?.();
}

}

export function closeAppSettingsWindow(){

if(
!overlayEl
){
return;
}

overlayEl.classList.add(
"hidden"
);
document.body.classList.remove(
"app-settings-open"
);

}

export async function openAppSettingsWindow(
sectionId =
"sync"
){

ensureCss();
buildOverlay();

overlayEl.classList.remove(
"hidden"
);
document.body.classList.add(
"app-settings-open"
);

await refreshAppSettingsAdminNav();

const target =
SECTIONS.some(
s=>
s.id ===
sectionId
)
? sectionId
: "sync";

let resolved =
target;

if(
(
resolved ===
"connections" ||
resolved ===
"trading" ||
resolved ===
"proxy"
) &&
!showConnectionsSettings()
){
resolved =
"sync";
}

if(
resolved ===
"system" &&
!showSystemSettings()
){
resolved =
"sync";
}

if(
resolved ===
"secret" &&
!adminNavVisible
){
resolved =
"sync";
}

await setActiveSection(
resolved
);

}

export async function refreshAppSettingsAdminNav(){

const isAdmin =
await isSystemAdminUser();

adminNavVisible =
isAdmin;

const navBtn =
overlayEl?.querySelector(
'.app-settings-nav-btn[data-admin-only="1"]'
);

if(
navBtn
){
navBtn.hidden =
!isAdmin;
}

const connectionsBtn =
overlayEl?.querySelector(
'.app-settings-nav-btn[data-section="connections"]'
);

if(
connectionsBtn
){
connectionsBtn.hidden =
!showConnectionsSettings();
}

const tradingBtn =
overlayEl?.querySelector(
'.app-settings-nav-btn[data-section="trading"]'
);

if(
tradingBtn
){
tradingBtn.hidden =
!showConnectionsSettings();
}

const proxyBtn =
overlayEl?.querySelector(
'.app-settings-nav-btn[data-section="proxy"]'
);

if(
proxyBtn
){
proxyBtn.hidden =
!showConnectionsSettings();
}

const systemBtn =
overlayEl?.querySelector(
'.app-settings-nav-btn[data-section="system"]'
);

if(
systemBtn
){
systemBtn.hidden =
!showSystemSettings();
}

if(
!isAdmin &&
activeSection ===
"secret"
){
await setActiveSection(
"sync"
);
}

}

export function initAppSettingsWindow(){

renameAccountSectionTitles();

void refreshAppSettingsAdminNav();

}
