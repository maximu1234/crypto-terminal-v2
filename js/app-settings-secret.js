/**
 * Секретные настройки (админ) — панель в окне «Настройки».
 */
import {
isSystemAdminUser,
getSystemAdminEmails
} from "./system-admin-access.js?v=3";

import {
getEffectiveCloudUserEmail
} from "./cloud-sync.js?v=60";

import {
bindSupabaseUsagePrefsForm
} from "./system-admin-supabase-prefs.js?v=4";

import {
bindAlertsGarbagePurge
} from "./system-admin-alerts-purge.js?v=2";

import {
bindWorkerReloadMsSettings
} from "./system-admin-worker-reload-ms.js?v=5";

export async function mountSecretSettingsPanel(
host
){

if(
!host ||
host.dataset.secretMounted ===
"1"
){
return;
}

host.dataset.secretMounted =
"1";

const isAdmin =
await isSystemAdminUser();
const email =
getEffectiveCloudUserEmail() ||
"—";

if(
!isAdmin
){

host.innerHTML =
`
<p class="app-settings-panel-lead">Раздел только для администратора приложения.</p>
<p class="trade-exchange-status-text is-error">Нет доступа для ${email}.</p>
`;

return;

}

const admins =
getSystemAdminEmails();

host.innerHTML =
`
<p class="app-settings-panel-lead">Только для администратора (<span class="app-settings-admin-email">${email}</span>).</p>
<p class="app-settings-admin-meta">${admins.length ? `Админы: ${admins.join(", ")}` : ""}</p>

<section class="system-admin-card" aria-labelledby="app-supabase-usage-heading">
<h2 id="app-supabase-usage-heading" class="app-settings-subtitle">Экономия лимитов Supabase</h2>
<p class="system-admin-card-lead">Экономия лимитов Supabase: ниже — единственный переключатель (облачные алерты). Остальное зафиксировано в коде.</p>
<div id="system-supabase-usage-mount"></div>
<p id="system-supabase-usage-status" class="system-admin-status" aria-live="polite"></p>
<div class="system-admin-actions">
<button type="button" class="system-admin-btn" id="app-settings-supabase-reload-hint">Обновить главную (применить)</button>
</div>
</section>

<section class="system-admin-card system-admin-card-danger" aria-labelledby="app-alerts-purge-heading">
<h2 id="app-alerts-purge-heading" class="app-settings-subtitle">Очистка мусора алертов</h2>
<p class="system-admin-card-lead">Удаляет из Supabase зомби и сироты в <code>price_alerts</code> и историю <code>price_alert_events</code> для <strong>вашего</strong> аккаунта. Активные алерты из localStorage на этом устройстве сохраняются. Для удаления событий выполните <code>migration-price-alert-events-delete-own.sql</code> в Supabase.</p>
<label class="system-admin-purge-confirm" for="system-purge-alert-garbage-confirm">
<span class="system-admin-purge-confirm-label">Подтверждение: скопируйте в поле текст</span>
<code class="system-admin-purge-phrase" id="system-purge-alert-garbage-phrase">PURGE_ALERT_GARBAGE</code>
<input type="text" class="system-admin-purge-input" id="system-purge-alert-garbage-confirm" autocomplete="off" spellcheck="false" placeholder="PURGE_ALERT_GARBAGE"/>
</label>
<p id="system-alerts-purge-status" class="system-admin-status" aria-live="polite"></p>
<div class="system-admin-actions">
<button type="button" class="system-admin-btn system-admin-btn-danger" id="system-purge-alert-garbage-btn" disabled>Очистить мусор алертов в Supabase</button>
</div>
</section>

<section class="system-admin-card" aria-labelledby="app-worker-reload-heading">
<h2 id="app-worker-reload-heading" class="app-settings-subtitle">Период проверки для worker</h2>
<p class="system-admin-card-lead">Подстраховочный reload активных алертов из Supabase (основной подхват идёт сразу после POST push/delete). По умолчанию: 30 минут.</p>
<div class="system-admin-actions">
<label class="system-admin-purge-confirm" for="system-worker-reload-seconds">
<span class="system-admin-purge-confirm-label">Секунды (мин. 3, макс. 3600)</span>
<input type="number" min="60" max="3600" step="1" value="1800" class="system-admin-purge-input" id="system-worker-reload-seconds" inputmode="numeric" autocomplete="off"/>
</label>
<button type="button" class="system-admin-btn" id="system-worker-reload-save">Сохранить период</button>
</div>
<p id="system-worker-reload-status" class="system-admin-status" aria-live="polite"></p>
<div class="system-admin-actions">
<button type="button" class="system-admin-btn" id="system-worker-health-refresh">Обновить health</button>
<button type="button" class="system-admin-btn" id="system-worker-reload-now">Reload сейчас</button>
<button type="button" class="system-admin-btn" id="system-worker-canary-send">Контрольный алерт</button>
</div>
<p id="system-worker-health-status" class="system-admin-status" aria-live="polite"></p>
</section>
`;

bindSupabaseUsagePrefsForm(
host.querySelector(
"#system-supabase-usage-mount"
),
host.querySelector(
"#system-supabase-usage-status"
)
);

host.querySelector(
"#app-settings-supabase-reload-hint"
)?.addEventListener(
"click",
()=>{
location.reload();
}
);

bindAlertsGarbagePurge({
statusEl:
host.querySelector(
"#system-alerts-purge-status"
)
});

bindWorkerReloadMsSettings({
statusEl:
host.querySelector(
"#system-worker-reload-status"
)
});

}
