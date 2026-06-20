/**
 * UI обновления desktop .app — показывается только внутри Electron (preload bridge).
 */
export function initDesktopAppUi(){

const api =
window.cryptoTerminalDesktop;

if(
!api?.isDesktop
){
return;
}

if(
!document.getElementById(
"desktop-app-css"
)
){
const link =
document.createElement(
"link"
);
link.id =
"desktop-app-css";
link.rel =
"stylesheet";
link.href =
"/css/desktop-app.css?v=1";
document.head.appendChild(
link
);
}

if(
document.getElementById(
"desktop-app-bar"
)
){
return;
}

document.documentElement.classList.add(
"desktop-app-shell"
);

const bar =
document.createElement(
"div"
);
bar.id =
"desktop-app-bar";
bar.className =
"desktop-app-bar";
bar.innerHTML =
`
<span class="desktop-app-bar-label">Приложение</span>
<span class="desktop-app-bar-version" id="desktop-app-version"></span>
<button type="button" class="desktop-app-bar-btn" id="desktop-app-update-btn">Обновить</button>
<span class="desktop-app-bar-status" id="desktop-app-status" aria-live="polite"></span>
`;

const mount =
document.querySelector(
".coins-header-desktop"
) ||
document.querySelector(
".screener-header-desktop"
) ||
document.querySelector(
"#header"
);

if(
mount
){
mount.appendChild(
bar
);
}else{
document.body.prepend(
bar
);
}

const versionEl =
document.getElementById(
"desktop-app-version"
);
const statusEl =
document.getElementById(
"desktop-app-status"
);
const updateBtn =
document.getElementById(
"desktop-app-update-btn"
);

let phase =
"idle";

function setStatus(
text
){

if(
statusEl
){
statusEl.textContent =
text ||
"";
}

}

function setPhase(
next
){

phase =
next;

if(
!updateBtn
){
return;
}

if(
phase ===
"ready"
){
updateBtn.textContent =
"Перезапустить";
updateBtn.disabled =
false;
return;
}

updateBtn.textContent =
"Обновить";
updateBtn.disabled =
phase ===
"checking" ||
phase ===
"downloading";
}

void api.getVersion().then(
info=>{
if(
versionEl &&
info?.app
){
versionEl.textContent =
`v${info.app}`;
}
}
);

api.onUpdateStatus(
payload=>{

if(
!payload
){
return;
}

setStatus(
payload.message ||
""
);

if(
payload.phase
){
setPhase(
payload.phase
);
}

}
);

updateBtn?.addEventListener(
"click",
()=>{

if(
phase ===
"ready"
){
void api.installUpdate();
return;
}

if(
phase ===
"available"
){
void api.downloadUpdate();
return;
}

void api.checkForUpdates();

}
);

setPhase(
"idle"
);

}
