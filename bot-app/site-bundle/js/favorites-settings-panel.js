/**
 * Ручная синхронизация флагов — Настройки → Синхронизация.
 */
import {
isCloudLoggedIn,
getCloudUserEmail,
onCloudSyncChange
} from "./cloud-sync.js?v=50";

import {
syncFavoritesCloudOnDemand
} from "./favorites-cloud-sync.js?v=50";

function setStatus(
el,
text,
isError =
false
){

if(
!el
){
return;
}

el.textContent =
text ||
"";
el.classList.toggle(
"is-error",
!!isError
);
el.classList.toggle(
"hidden",
!text
);

}

export function mountFavoritesCloudSettingsPanel(
host
){

if(
!host ||
host.dataset.favoritesCloudMounted ===
"1"
){
return {
refresh:()=>{}
};
}

host.dataset.favoritesCloudMounted =
"1";

host.innerHTML =
`
<div class="cloud-favorites-cloud-wrap">
<p class="cloud-favorites-cloud-title">Облако флагов</p>
<p class="app-settings-panel-lead">Загрузить флаги из облака и объединить с локальными (без фоновых запросов к Supabase).</p>
<div class="cloud-favorites-guest hidden" role="status">
<p class="cloud-telegram-help">Войдите по email в разделе «Синхронизация», затем нажмите «Обновить».</p>
</div>
<div class="cloud-favorites-connected hidden" role="status">
<p class="cloud-favorites-connected-text"></p>
<button type="button" class="cloud-favorites-sync-btn">Обновить</button>
</div>
<p class="cloud-favorites-status hidden" role="status" aria-live="polite"></p>
</div>
`;

const guestEl =
host.querySelector(
".cloud-favorites-guest"
);
const connectedEl =
host.querySelector(
".cloud-favorites-connected"
);
const connectedText =
host.querySelector(
".cloud-favorites-connected-text"
);
const syncBtn =
host.querySelector(
".cloud-favorites-sync-btn"
);
const statusEl =
host.querySelector(
".cloud-favorites-status"
);

let syncing =
false;

function refreshAuthUi(){

const loggedIn =
isCloudLoggedIn();
const email =
getCloudUserEmail();

guestEl?.classList.toggle(
"hidden",
loggedIn
);
connectedEl?.classList.toggle(
"hidden",
!loggedIn
);

if(
connectedText &&
loggedIn
){
connectedText.textContent =
email
? `Аккаунт: ${email}`
: "Вход выполнен";
}

if(
syncBtn
){
syncBtn.disabled =
!loggedIn ||
syncing;
}

}

async function runSync(){

if(
syncing
){
return;
}

syncing =
true;
refreshAuthUi();
setStatus(
statusEl,
"Обновление…"
);

try{
await syncFavoritesCloudOnDemand();
setStatus(
statusEl,
"Флаги обновлены из облака"
);
}catch(
err
){
setStatus(
statusEl,
err?.message ||
"Не удалось обновить флаги",
true
);
}

syncing =
false;
refreshAuthUi();

}

syncBtn?.addEventListener(
"click",
()=>{
void runSync();
}
);

const onAuth =
()=>{
refreshAuthUi();
};

onCloudSyncChange(
onAuth
);

refreshAuthUi();

return {
refresh:
refreshAuthUi,
destroy:()=>{}
};

}
