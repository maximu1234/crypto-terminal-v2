/**
 * Секретные настройки (админ) — панель в окне «Настройки».
 */
import {
isSystemAdminUser,
getSystemAdminEmails
} from "./system-admin-access.js?v=3";

import {
getEffectiveCloudUserEmail
} from "./cloud-sync.js?v=40";

import {
bindSupabaseUsagePrefsForm
} from "./system-admin-supabase-prefs.js?v=2";

import {
bindDrawingsGlobalPurge
} from "./system-admin-drawings-purge.js?v=2";

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
<p class="system-admin-card-lead">Отключение отдельных каналов синхронизации для экономии egress и realtime.</p>
<div id="system-supabase-usage-mount"></div>
<p id="system-supabase-usage-status" class="system-admin-status" aria-live="polite"></p>
<div class="system-admin-actions">
<button type="button" class="system-admin-btn" id="app-settings-supabase-reload-hint">Обновить главную (применить)</button>
</div>
</section>

<section class="system-admin-card system-admin-card-danger" aria-labelledby="app-drawings-purge-heading">
<h2 id="app-drawings-purge-heading" class="app-settings-subtitle">Очистка облака рисунков</h2>
<p class="system-admin-card-lead">Принудительная очистка <code>user_drawings</code> в Supabase для всех пользователей.</p>
<label class="system-admin-purge-confirm" for="system-purge-all-drawings-confirm">
<span class="system-admin-purge-confirm-label">Подтверждение: скопируйте в поле текст</span>
<code class="system-admin-purge-phrase" id="system-purge-confirm-phrase">PURGE_ALL_DRAWINGS</code>
<input type="text" class="system-admin-purge-input" id="system-purge-all-drawings-confirm" autocomplete="off" spellcheck="false" placeholder="PURGE_ALL_DRAWINGS"/>
</label>
<p id="system-drawings-purge-status" class="system-admin-status" aria-live="polite"></p>
<div class="system-admin-actions">
<button type="button" class="system-admin-btn system-admin-btn-danger" id="system-purge-all-drawings-btn" disabled>Удалить все рисунки всех пользователей</button>
</div>
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

bindDrawingsGlobalPurge({
statusEl:
host.querySelector(
"#system-drawings-purge-status"
)
});

}
