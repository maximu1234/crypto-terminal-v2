/**
 * Справка по горячим клавишам — только информация, без настроек.
 */

function row(
action,
keys
){

return `
<div class="app-hotkeys-row">
<span class="app-hotkeys-action">${action}</span>
<span class="app-hotkeys-keys">${keys}</span>
</div>
`;

}

function section(
title,
rowsHtml
){

return `
<section class="app-hotkeys-section">
<h3 class="app-hotkeys-title">${title}</h3>
<div class="app-hotkeys-list" role="list">
${rowsHtml}
</div>
</section>
`;

}

export function mountHotkeysSettingsPanel(
host
){

if(
!host ||
host.dataset.hotkeysMounted ===
"1"
){
return;
}

host.dataset.hotkeysMounted =
"1";

host.innerHTML =
`
<p class="app-settings-panel-lead">Справка по клавишам. Не срабатывают, пока фокус в поле ввода.</p>

${section(
"Скринер",
[
row(
"Перелистывание страниц",
"Пробел, стрелка влево/вправо, Shift+Пробел"
),
row(
"Таймфреймы",
"1 2 3 4 5 6 7"
),
row(
"Сетка 4 / 6 / 9",
"Shift+1 · Shift+2 · Shift+3"
),
row(
"Перевернуть графики",
"Alt+I"
),
row(
"Открыть zoom окно",
"ПКМ"
),
row(
"Zoom: след. / пред. виджет",
"Пробел, стрелка влево/вправо"
),
row(
"Zoom: открыть в Терминале",
"Shift+стрелка вправо"
)
].join(
""
)
)}

${section(
"Терминал",
[
row(
"Таймфреймы",
"1 2 3 4 5 6 7"
),
row(
"След. / пред. монета",
"Пробел / ↓ · ↑"
),
row(
"Перевернуть график",
"Alt+I"
),
row(
"Отменить рисунок",
"⌘Z / Ctrl+Z"
)
].join(
""
)
)}

${section(
"Рисунки на графике",
[
row(
"Long / Short / Fib",
"L · S · F"
),
row(
"Rectangle / Ray / Trend / Brush / Channel",
"R · H · J · B · C"
),
row(
"Курсор / отмена режима",
"Esc"
),
row(
"Линейка (удержание)",
"Shift"
),
row(
"Магнит к hi/lo свечи",
"⌘ (Cmd)"
),
row(
"Удалить выбранное",
"Delete / Backspace"
),
row(
"Удалить все на графике",
"Shift+Backspace"
)
].join(
""
)
)}

${section(
"Торговля",
[
row(
"Купить / продать по рынку",
"T · Y"
),
row(
"Закрыть позицию на графике",
"Alt+D"
)
].join(
""
)
)}

${section(
"Скрипт",
[
row(
"Перелистывание страниц",
"Пробел, стрелка влево/вправо, Shift+Пробел"
),
row(
"Таймфреймы",
"1 2 3 4 5 6 7"
),

row(
"Сетка 4 / 6 / 9",
"Shift+1 · Shift+2 · Shift+3"
)
].join(
""
)
)}

${section(
"АлгоТрейдинг",
[
row(
"Таймфреймы",
"1 2 3 4 5 6 7"
),
row(
"След. / пред. монета",
"Пробел / ↓ · ↑"
),
row(
"Инструменты рисования",
"L S F R H J B C"
)
].join(
""
)
)}

<p class="app-settings-panel-hint">Таймфреймы: 1 → 1m, 2 → 5m, 3 → 15m, 4 → 1h, 5 → 4h, 6 → 1D, 7 → W. Скрипт, АлгоТрейдинг и торговые клавиши — в desktop.</p>
`;

}
